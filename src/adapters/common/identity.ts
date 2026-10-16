// Identity rules shared by every adapter, so a hook process and an MCP server
// of the same Claude session register as the same agent (docs/P2-SPIKE.md, D-11).
import path from 'node:path'

export interface Identity {
  key: string
  name: string
  kind: string
  cwd: string
}

type Env = Record<string, string | undefined>

function clean(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64)
}

export function deriveIdentity(env: Env, cwd: string): Identity {
  const projectDir = env.CLAUDE_PROJECT_DIR || cwd
  const folder = clean(path.basename(projectDir.replace(/[\\/]+$/, ''))) || 'agent'
  const sessionId = env.CLAUDE_CODE_SESSION_ID
  const explicitName = env.AGENTLINK_NAME ? clean(env.AGENTLINK_NAME) : ''

  if (sessionId) {
    return {
      key: `claude:${sessionId}`,
      name: explicitName || `${folder}-${clean(sessionId).slice(0, 4)}`,
      kind: env.AGENTLINK_KIND ? clean(env.AGENTLINK_KIND) : 'claude-code',
      cwd: projectDir,
    }
  }

  const name = explicitName || `${folder}-mcp`
  return {
    key: env.AGENTLINK_KEY || `mcp:${name}`,
    name,
    kind: env.AGENTLINK_KIND ? clean(env.AGENTLINK_KIND) : 'mcp',
    cwd: projectDir,
  }
}
