// `agentctl wake`: lets a Claude Code session that is idle at its prompt be woken by an incoming message.
// Claude's hooks only run on input, tool calls and turn ends, so an idle session sees nothing. A background command that
// exits when a message arrives does wake it (the harness starts a new turn when a background command finishes).
// The watcher only looks: it never takes or acknowledges a message, and it prints no message text (messages are untrusted
// input and reach the model only through read_inbox or the hooks, wrapped as such).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { homeDir } from '../agentd/config.ts'
import { Client, ApiCallError } from './client.ts'

/** Kinds that are worth a model turn. Delivery notices wait for the next prompt. */
const WAKE_KINDS = new Set(['message', 'idle_notice'])
const ALIVE_FRESH_MS = 90_000

export interface WakeOptions {
  agent: string
  /** One long poll to the daemon (the daemon allows up to 30 s). */
  pollMs: number
  /** The watcher ends by itself after this long even if nothing arrived. */
  maxMs: number
  /** At most this many wake-ups per window; further messages wait for the next prompt. Stops two agents waking each other forever. */
  maxWakes: number
  windowMs: number
  /** After the first message, wait this long and count again, so a burst of messages costs one model turn, not several. */
  settleMs: number
  /** Returns false when the Claude Code session that started the watcher is gone (it was killed, so nobody can be woken). */
  isSessionAlive?: () => boolean
}

export type WakeResult = { reason: 'message'; count: number } | { reason: 'timeout' } | { reason: 'session-gone' }

interface WakeState {
  pid: number
  ts: number
  wakes: number[]
}

function stateFile(agent: string): string {
  return path.join(homeDir(), 'hook-state', `${agent.replace(/[^A-Za-z0-9_-]/g, '_')}.wake.json`)
}

function readState(agent: string): WakeState {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(agent), 'utf8')) as Partial<WakeState>
    return { pid: Number(s.pid) || 0, ts: Number(s.ts) || 0, wakes: Array.isArray(s.wakes) ? s.wakes.filter(n => typeof n === 'number') : [] }
  } catch {
    return { pid: 0, ts: 0, wakes: [] }
  }
}

function writeState(agent: string, s: WakeState): void {
  try {
    fs.mkdirSync(path.dirname(stateFile(agent)), { recursive: true })
    fs.writeFileSync(stateFile(agent), JSON.stringify(s))
  } catch {
    // best effort: the watcher works without its marker, the hooks just cannot see it
  }
}

/** Whether a watcher for this agent has checked in recently (used by the hooks to remind the model to start one). */
export function wakeAlive(agent: string, now = Date.now()): boolean {
  const s = readState(agent)
  return s.pid !== 0 && now - s.ts < ALIVE_FRESH_MS
}

export function wakeOptionsFromEnv(agent: string): WakeOptions {
  const num = (name: string, def: number): number => {
    const v = Number(process.env[name])
    return Number.isFinite(v) && v > 0 ? v : def
  }
  return {
    agent,
    pollMs: Math.min(num('AGENTLINK_WAKE_POLL_MS', 25_000), 30_000),
    maxMs: num('AGENTLINK_WAKE_MAX_MS', 12 * 60 * 60 * 1000),
    maxWakes: num('AGENTLINK_WAKE_MAX_WAKES', 10),
    windowMs: num('AGENTLINK_WAKE_WINDOW_MS', 10 * 60 * 1000),
    settleMs: process.env.AGENTLINK_WAKE_SETTLE_MS === undefined ? 2_000 : Math.max(0, Number(process.env.AGENTLINK_WAKE_SETTLE_MS) || 0),
  }
}

function pidExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM' // it exists, we just may not signal it
  }
}

/**
 * The process of the Claude Code session that (indirectly) started this watcher. Killing Claude abnormally leaves its shell and
 * this watcher running on Windows, so the direct parent is no use: walk up the process tree once. AGENTLINK_WAKE_SESSION_PID
 * overrides the search ("0" turns it off). Returns null when it cannot be found, and the watcher then relies on its time limit.
 */
export function findSessionPid(): number | null {
  const forced = process.env.AGENTLINK_WAKE_SESSION_PID
  if (forced !== undefined) {
    const n = Number(forced)
    return Number.isInteger(n) && n > 0 ? n : null
  }
  if (process.platform !== 'win32') return null
  const script =
    `$id=${process.ppid}; for($i=0;$i -lt 12 -and $id;$i++){ $p=Get-CimInstance Win32_Process -Filter "ProcessId=$id"; if(-not $p){break}; ` +
    `if($p.Name -match '^claude(\.exe)?$' -or ($p.Name -eq 'node.exe' -and $p.CommandLine -match '@anthropic-ai[\\/]claude-code')){ $p.ProcessId; break }; $id=$p.ParentProcessId }`
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', timeout: 10_000, windowsHide: true })
  const n = Number(r.stdout?.trim())
  return r.status === 0 && Number.isInteger(n) && n > 0 ? n : null
}

/** An isSessionAlive check for waitForWake, or undefined when the session process is unknown. */
export function sessionAliveCheck(pid: number | null): (() => boolean) | undefined {
  return pid === null ? undefined : () => pidExists(pid)
}

/** The shell command that starts the watcher; forward slashes work in Git Bash and PowerShell alike. */
export function wakeCommand(agentctlFile: string, agent: string): string {
  return `node --no-warnings "${agentctlFile.replace(/\\/g, '/')}" wake --agent ${agent}`
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function waitForWake(connect: () => Promise<Client>, o: WakeOptions): Promise<WakeResult> {
  const deadline = Date.now() + o.maxMs
  let client: Client | null = null
  try {
    for (;;) {
      if (Date.now() > deadline) return { reason: 'timeout' }
      if (o.isSessionAlive && !o.isSessionAlive()) return { reason: 'session-gone' }
      try {
        client ??= await connect()
        const st = readState(o.agent)
        writeState(o.agent, { ...st, pid: process.pid, ts: Date.now() })
        const r = (await client.request('inbox', { agent: o.agent, mode: 'peek', state: 'new', limit: 50, wait_ms: o.pollMs })) as { messages: Array<{ kind: string }> }
        let wakeable = r.messages.filter(m => WAKE_KINDS.has(m.kind)).length
        if (wakeable > 0 && o.settleMs > 0) {
          await sleep(o.settleMs)
          const again = (await client.request('inbox', { agent: o.agent, mode: 'peek', state: 'new', limit: 50 })) as { messages: Array<{ kind: string }> }
          wakeable = Math.max(wakeable, again.messages.filter(m => WAKE_KINDS.has(m.kind)).length)
        }
        if (wakeable > 0) {
          const now = Date.now()
          const recent = readState(o.agent).wakes.filter(t => now - t < o.windowMs)
          if (recent.length < o.maxWakes) {
            writeState(o.agent, { pid: 0, ts: 0, wakes: [...recent, now] })
            return { reason: 'message', count: wakeable }
          }
          await sleep(Math.min(30_000, o.pollMs)) // too many wake-ups lately: leave the messages for the next prompt
        } else if (r.messages.length > 0) {
          await sleep(Math.min(5_000, o.pollMs)) // only notices are waiting, so the daemon answered at once
        }
      } catch (e) {
        if (e instanceof ApiCallError && e.code === 'NOT_REGISTERED') throw e // the session has ended
        client?.close()
        client = null
        await sleep(Math.min(2_000, o.pollMs)) // the daemon is restarting or not reachable yet
      }
    }
  } finally {
    client?.close()
    const st = readState(o.agent)
    writeState(o.agent, { ...st, pid: 0, ts: 0 })
  }
}
