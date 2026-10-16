// Builds the Claude Code settings (hooks) and MCP configuration for AgentLink.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)))

function fwd(p: string): string {
  return p.replace(/\\/g, '/')
}

export function claudeConfig(opts: { root?: string; env?: Record<string, string> } = {}): {
  settings: Record<string, unknown>
  mcp: Record<string, unknown>
} {
  const root = fwd(opts.root ?? ROOT)
  const hook = (event: string, matcher?: string) => ({
    ...(matcher ? { matcher } : {}),
    hooks: [{ type: 'command', command: `node --no-warnings "${root}/src/adapters/claude/hook.ts" ${event}`, timeout: 10 }],
  })
  return {
    settings: {
      hooks: {
        SessionStart: [hook('SessionStart')],
        UserPromptSubmit: [hook('UserPromptSubmit')],
        PostToolUse: [hook('PostToolUse', '*')],
        Stop: [hook('Stop')],
        SessionEnd: [hook('SessionEnd')],
      },
    },
    mcp: {
      mcpServers: {
        agentlink: {
          command: 'node',
          args: ['--no-warnings', `${root}/src/adapters/mcp/server.ts`],
          ...(opts.env && Object.keys(opts.env).length > 0 ? { env: opts.env } : {}),
        },
      },
    },
  }
}

export const TOOL_NAMES = ['mcp__agentlink__send_message', 'mcp__agentlink__list_agents', 'mcp__agentlink__read_inbox', 'mcp__agentlink__ack_messages']
