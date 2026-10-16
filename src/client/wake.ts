// `agentctl wake`: lets a Claude Code session that is idle at its prompt be woken by an incoming message.
// Claude's hooks only run on input, tool calls and turn ends, so an idle session sees nothing. A background command that
// exits when a message arrives does wake it (the harness starts a new turn when a background command finishes).
// The watcher only looks: it never takes or acknowledges a message, and it prints no message text (messages are untrusted
// input and reach the model only through read_inbox or the hooks, wrapped as such).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { homeDir } from '../agentd/config.ts'
import { readJsonStable, writeFileAtomic } from './atomic-file.ts'
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

export type WakeResult = { reason: 'message'; count: number } | { reason: 'timeout' } | { reason: 'session-gone' } | { reason: 'stopped' }

interface WakeState {
  pid: number
  ts: number
  wakes: number[]
  /**
   * Set by `agentctl wake --stop` of version 0.2.3 and older, which read-modify-write this file like the watcher does (a request
   * can then be overwritten). Kept so that a watcher and a stopper of different versions still understand each other; the
   * request that cannot get lost is the stop file below.
   */
  stop?: boolean
}

function stateFile(agent: string): string {
  return path.join(homeDir(), 'hook-state', `${agent.replace(/[^A-Za-z0-9_-]/g, '_')}.wake.json`)
}

/** A stop request of its own file: nothing but `agentctl wake --stop` creates it and nothing rewrites it, so the watcher cannot overwrite it. */
function stopFile(agent: string): string {
  return path.join(homeDir(), 'hook-state', `${agent.replace(/[^A-Za-z0-9_-]/g, '_')}.wake.stop`)
}

const stopRequested = (agent: string): boolean => fs.existsSync(stopFile(agent))

function clearStopRequest(agent: string): void {
  try {
    fs.rmSync(stopFile(agent), { force: true })
  } catch {
    // best effort
  }
}

function readState(agent: string): WakeState {
  const s = readJsonStable(stateFile(agent)) as Partial<WakeState> | null
  if (s === null || typeof s !== 'object') return { pid: 0, ts: 0, wakes: [] }
  return { pid: Number(s.pid) || 0, ts: Number(s.ts) || 0, wakes: Array.isArray(s.wakes) ? s.wakes.filter(n => typeof n === 'number') : [], stop: s.stop === true }
}

function writeState(agent: string, s: WakeState): void {
  try {
    fs.mkdirSync(path.dirname(stateFile(agent)), { recursive: true })
    writeFileAtomic(stateFile(agent), JSON.stringify(s))
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
    pollMs: Math.min(num('AGENTLINK_WAKE_POLL_MS', 5_000), 30_000),
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
  clearStopRequest(o.agent) // a stop request from before this watcher started is not for it
  writeState(o.agent, { ...readState(o.agent), stop: false })
  try {
    for (;;) {
      if (Date.now() > deadline) return { reason: 'timeout' }
      if (o.isSessionAlive && !o.isSessionAlive()) return { reason: 'session-gone' }
      try {
        client ??= await connect()
        const st = readState(o.agent)
        if (stopRequested(o.agent) || st.stop) return { reason: 'stopped' }
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
    clearStopRequest(o.agent)
    const st = readState(o.agent)
    writeState(o.agent, { ...st, pid: 0, ts: 0, stop: false })
  }
}

// --- agentctl wake --stop --------------------------------------------------------------------------------------------

export interface StopReport {
  agent: string
  pid: number
  /** requested: the watcher saw the request and ended itself. killed: it did not answer and was ended by its PID. */
  how: 'requested' | 'killed' | 'not-running' | 'refused'
  detail?: string
}

/** The agents that have a watcher state file (running or not). */
function watcherAgents(): string[] {
  try {
    return fs
      .readdirSync(path.join(homeDir(), 'hook-state'))
      .map(f => /^(.+)\.wake\.json$/.exec(f)?.[1])
      .filter((a): a is string => typeof a === 'string')
  } catch {
    return []
  }
}

/** True only if the process with this PID really is an agentctl watcher: a PID that was reused by something else must never be killed. */
function isWatcherProcess(pid: number): boolean {
  if (process.platform !== 'win32') return false
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`], {
    encoding: 'utf8',
    timeout: 10_000,
    windowsHide: true,
  })
  const line = r.status === 0 ? (r.stdout ?? '') : ''
  return /agentctl\.(mjs|ts)/.test(line) && /\swake(\s|$)/.test(line)
}

async function gone(pid: number, ms: number): Promise<boolean> {
  const end = Date.now() + ms
  while (pidExists(pid)) {
    if (Date.now() > end) return false
    await sleep(100)
  }
  return true
}

/**
 * Ends the idle watcher of one agent, or of every agent when none is given. It asks first (the watcher checks within one poll and ends
 * cleanly); a watcher that does not answer, such as one of an older version, is ended by the PID it recorded, after checking that this PID
 * is an agentctl watcher. Never matches processes by name.
 */
export async function stopWatchers(agent?: string, graceMs = 8_000): Promise<StopReport[]> {
  const reports: StopReport[] = []
  for (const a of agent ? [agent] : watcherAgents()) {
    const st = readState(a)
    if (st.pid === 0 || !pidExists(st.pid)) {
      if (st.pid !== 0) writeState(a, { ...st, pid: 0, ts: 0, stop: false })
      clearStopRequest(a)
      reports.push({ agent: a, pid: st.pid, how: 'not-running' })
      continue
    }
    try {
      fs.writeFileSync(stopFile(a), '') // the request that cannot be overwritten
    } catch {
      // the flag in the state file below still reaches a watcher
    }
    writeState(a, { ...st, stop: true }) // for watchers of version 0.2.3 and older, which only read this
    if (await gone(st.pid, graceMs)) {
      clearStopRequest(a)
      reports.push({ agent: a, pid: st.pid, how: 'requested' })
      continue
    }
    if (!isWatcherProcess(st.pid)) {
      clearStopRequest(a)
      writeState(a, { ...readState(a), stop: false })
      reports.push({ agent: a, pid: st.pid, how: 'refused', detail: 'the recorded PID is not an agentctl watcher (not touched)' })
      continue
    }
    try {
      process.kill(st.pid)
    } catch (e) {
      clearStopRequest(a)
      reports.push({ agent: a, pid: st.pid, how: 'refused', detail: String(e instanceof Error ? e.message : e) })
      continue
    }
    const ended = await gone(st.pid, 3_000)
    clearStopRequest(a)
    writeState(a, { ...readState(a), pid: ended ? 0 : st.pid, ts: 0, stop: false })
    reports.push(ended ? { agent: a, pid: st.pid, how: 'killed' } : { agent: a, pid: st.pid, how: 'refused', detail: 'it did not end' })
  }
  return reports
}
