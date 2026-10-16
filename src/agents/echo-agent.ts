// A reference agent that is NOT an AI coding assistant: it only uses the AgentLink SDK.
// It shows what a new kind of agent needs to join the network (RFP F-12), and doubles as a test partner.
//
//   node src/agents/echo-agent.ts [--name echo]
//
// Commands (the first word of a message):  ping -> pong,  time -> current time,  upper <text>,  anything else is echoed.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { AgentLinkAgent } from '../sdk/agentlink.ts'
import type { IncomingMessage } from '../sdk/agentlink.ts'

export function answer(text: string): string {
  const [cmd, ...rest] = text.trim().split(/\s+/)
  switch (cmd.toLowerCase()) {
    case 'ping':
      return 'pong'
    case 'time':
      return new Date().toISOString()
    case 'upper':
      return rest.join(' ').toUpperCase()
    default:
      return `echo: ${text}`
  }
}

/** Two echo agents must not answer each other forever. */
function isOwnStyleAnswer(text: string): boolean {
  return text === 'pong' || text.startsWith('echo: ')
}

export async function startEchoAgent(opts: Parameters<typeof AgentLinkAgent.connect>[0]): Promise<AgentLinkAgent> {
  const agent = await AgentLinkAgent.connect({ kind: 'echo', ...opts })
  agent.onMessage(async (msg: IncomingMessage) => {
    if (msg.kind !== 'message') return // idle and delivery notices need no answer
    if (isOwnStyleAnswer(msg.message)) return
    await agent.reply(msg, answer(msg.message))
  })
  return agent
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { name: { type: 'string', default: 'echo' } } })
  const agent = await startEchoAgent({ name: values.name as string })
  console.log(`echo agent ready as ${agent.address}`)
  process.on('SIGINT', () => void agent.close().finally(() => process.exit(0)))
}
