// Claude Code hooks adapter. One entry point for every event:
//   node hook.ts <SessionStart|UserPromptSubmit|PostToolUse|Stop|SessionEnd>
// Hooks must never break a session: every failure ends in exit code 0 with no output.
import fs from 'node:fs'
import path from 'node:path'
import { homeDir } from '../../agentd/config.ts'
import { Client } from '../../client/client.ts'
import { deriveIdentity } from '../common/identity.ts'
import { renderMessages } from '../common/format.ts'
import type { IncomingMessage } from '../common/format.ts'

const MAX_STOP_CONTINUES = 5

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

function readContinues(sessionId: string): number {
  try {
    return Number(JSON.parse(fs.readFileSync(statePath(sessionId), 'utf8')).continues) || 0
  } catch {
    return 0
  }
}

function writeContinues(sessionId: string, n: number): void {
  try {
    fs.mkdirSync(path.dirname(statePath(sessionId)), { recursive: true })
    fs.writeFileSync(statePath(sessionId), JSON.stringify({ continues: n }))
  } catch {
    // best effort
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
        writeContinues(sessionId, 0)
        const unread = reg.unread
        additionalContext(
          'SessionStart',
          `AgentLink is active: you are agent ${reg.address}. Use the agentlink MCP tools (list_agents, send_message, read_inbox) to talk to other agents.` +
            (unread > 0 ? ` You have ${unread} unread message(s); they will be shown with your next prompt.` : ''),
        )
        break
      }
      case 'UserPromptSubmit': {
        writeContinues(sessionId, 0)
        await client.request('heartbeat', { agent, status: 'busy' })
        const msgs = await takeAndAck(client, agent)
        if (msgs.length > 0) additionalContext('UserPromptSubmit', renderMessages(msgs))
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
