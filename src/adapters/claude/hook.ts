// Claude Code hooks adapter. One entry point for every event:
//   node hook.ts <SessionStart|UserPromptSubmit|PostToolUse|Stop|SessionEnd>
// Hooks must never break a session: every failure ends in exit code 0 with no output.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { homeDir } from '../../agentd/config.ts'
import { Client } from '../../client/client.ts'
import { wakeAlive, wakeCommand } from '../../client/wake.ts'
import { deriveIdentity } from '../common/identity.ts'
import { renderMessages } from '../common/format.ts'
import type { IncomingMessage } from '../common/format.ts'

const MAX_STOP_CONTINUES = 5
/** The Stop hook asks for the idle watcher at most this often in a row; the prompt reminder remains after that. */
const MAX_WAKE_NAGS = 2

interface HookInput {
  session_id?: string
  cwd?: string
  stop_hook_active?: boolean
}

async function readStdin(): Promise<string> {
  return new Promise(resolve => {
    let buf = ''
    const t = setTimeout(() => resolve(buf), 3000)
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', d => (buf += d))
    process.stdin.on('end', () => {
      clearTimeout(t)
      resolve(buf)
    })
    process.stdin.on('error', () => resolve(buf))
  })
}

function statePath(sessionId: string): string {
  return path.join(homeDir(), 'hook-state', `${sessionId.replace(/[^A-Za-z0-9_-]/g, '_')}.json`)
}

interface HookState {
  continues: number
  prompts: number
  /** How often the Stop hook already asked the model to start the idle watcher since one last ran. */
  nags: number
}

function readState(sessionId: string): HookState {
  try {
    const s = JSON.parse(fs.readFileSync(statePath(sessionId), 'utf8')) as Partial<HookState>
    return { continues: Number(s.continues) || 0, prompts: Number(s.prompts) || 0, nags: Number(s.nags) || 0 }
  } catch {
    return { continues: 0, prompts: 0, nags: 0 }
  }
}

function writeState(sessionId: string, patch: Partial<HookState>): HookState {
  const next = { ...readState(sessionId), ...patch }
  try {
    fs.mkdirSync(path.dirname(statePath(sessionId)), { recursive: true })
    fs.writeFileSync(statePath(sessionId), JSON.stringify(next))
  } catch {
    // best effort
  }
  return next
}

const readContinues = (sessionId: string): number => readState(sessionId).continues
const writeContinues = (sessionId: string, n: number): void => void writeState(sessionId, { continues: n })

// The watcher (agentctl wake) is what lets an idle session be woken by a message; see src/client/wake.ts.
const AGENTCTL = fileURLToPath(new URL(import.meta.url.endsWith('.mjs') ? './agentctl.mjs' : '../../client/agentctl.ts', import.meta.url))
const wakeEnabled = (): boolean => process.env.AGENTLINK_NO_WAKE !== '1'

function wakeInstruction(agent: string): string {
  return (
    `To be woken when a message arrives while you are idle, start the watcher once as a background command (Bash with run_in_background): ${wakeCommand(AGENTCTL, agent)} ` +
    'When that command finishes, call read_inbox, handle the messages, and start the watcher again. It prints no message text.'
  )
}

/** A watcher started just before the turn ended needs a moment to check in. */
async function waitWakeAlive(agent: string, ms: number): Promise<boolean> {
  const end = Date.now() + ms
  for (;;) {
    if (wakeAlive(agent)) return true
    if (Date.now() >= end) return false
    await new Promise(r => setTimeout(r, 100))
  }
}

function emit(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

function additionalContext(event: string, context: string): void {
  emit({ hookSpecificOutput: { hookEventName: event, additionalContext: context } })
}

async function takeAndAck(client: Client, agent: string): Promise<IncomingMessage[]> {
  const r = (await client.request('inbox', { agent, mode: 'take', limit: 50 })) as { messages: IncomingMessage[] }
  if (r.messages.length > 0) {
    await client.request('ack', { agent, ids: r.messages.map(m => m.id) })
  }
  return r.messages
}

async function main(): Promise<void> {
  const event = process.argv[2]
  if (!event) return
  let input: HookInput = {}
  try {
    input = JSON.parse(await readStdin())
  } catch {
    input = {}
  }

  const env = { ...process.env }
  if (!env.CLAUDE_CODE_SESSION_ID && input.session_id) env.CLAUDE_CODE_SESSION_ID = input.session_id
  const identity = deriveIdentity(env, input.cwd || process.cwd())
  const sessionId = env.CLAUDE_CODE_SESSION_ID ?? identity.name

  const client = await Client.connect()
  try {
    const reg = (await client.request('register', { ...identity })) as { agent: string; address: string; unread: number }
    const agent = reg.agent

    switch (event) {
      case 'SessionStart': {
        writeState(sessionId, { continues: 0, prompts: 0, nags: 0 })
        const unread = reg.unread
        additionalContext(
          'SessionStart',
          `AgentLink is active: you are agent ${reg.address}. Use the agentlink MCP tools (list_agents, send_message, read_inbox) to talk to other agents.` +
            (unread > 0 ? ` You have ${unread} unread message(s); they will be shown with your next prompt.` : '') +
            (wakeEnabled() ? ` ${wakeInstruction(agent)}` : ''),
        )
        break
      }
      case 'UserPromptSubmit': {
        const { prompts } = writeState(sessionId, { continues: 0, prompts: readState(sessionId).prompts + 1 })
        await client.request('heartbeat', { agent, status: 'busy' })
        const msgs = await takeAndAck(client, agent)
        // From the second prompt on, remind the model once per prompt while no watcher is running (the first prompt follows SessionStart's instruction).
        const remind = wakeEnabled() && prompts > 1 && !wakeAlive(agent)
        const parts = [
          msgs.length > 0 ? renderMessages(msgs) : '',
          remind ? `AgentLink: no idle watcher is running, so messages that arrive while you are idle wait until the next prompt. ${wakeInstruction(agent)}` : '',
        ].filter(Boolean)
        if (parts.length > 0) additionalContext('UserPromptSubmit', parts.join('\n\n'))
        break
      }
      case 'PostToolUse': {
        const msgs = await takeAndAck(client, agent)
        if (msgs.length > 0) additionalContext('PostToolUse', renderMessages(msgs))
        break
      }
      case 'Stop': {
        const continues = readContinues(sessionId)
        const hb = (await client.request('heartbeat', { agent })) as { unread: number }
        if (hb.unread > 0 && continues < MAX_STOP_CONTINUES) {
          const msgs = await takeAndAck(client, agent)
          if (msgs.length > 0) {
            writeContinues(sessionId, continues + 1)
            emit({ decision: 'block', reason: renderMessages(msgs) })
            break
          }
        }
        // Before going idle: make sure something can wake this session. Asked at most MAX_WAKE_NAGS times in a row, and never twice in one turn.
        if (wakeEnabled() && !input.stop_hook_active) {
          const { nags } = readState(sessionId)
          // Only wait for a just-started watcher when we would ask for one; otherwise a plain check keeps the turn end fast.
          if (wakeAlive(agent) || (nags < MAX_WAKE_NAGS && (await waitWakeAlive(agent, 2000)))) {
            if (nags > 0) writeState(sessionId, { nags: 0 })
          } else if (nags < MAX_WAKE_NAGS) {
            writeState(sessionId, { nags: nags + 1 })
            emit({ decision: 'block', reason: `AgentLink: no idle watcher is running, so messages that arrive while you are idle cannot wake you. Start it now, then you may finish your turn. ${wakeInstruction(agent)}` })
            break
          }
        }
        await client.request('heartbeat', { agent, status: 'idle' })
        break
      }
      case 'SessionEnd': {
        await client.request('unregister', { agent })
        break
      }
      default:
        break
    }
  } finally {
    client.close()
  }
}

main()
  .catch(e => {
    try {
      fs.mkdirSync(homeDir(), { recursive: true })
      fs.appendFileSync(path.join(homeDir(), 'hook-errors.log'), `${new Date().toISOString()} ${process.argv[2]} ${String(e instanceof Error ? e.message : e)}\n`)
    } catch {
      // nothing else to do
    }
  })
  .finally(() => process.exit(0))
