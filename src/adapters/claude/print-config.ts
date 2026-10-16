// npm run claude:config  -> prints the hooks settings and MCP config for Claude Code.
import { claudeConfig, TOOL_NAMES } from './config.ts'

const { settings, mcp } = claudeConfig()
console.log('// Merge into ~/.claude/settings.json (or .claude/settings.json of a project):')
console.log(JSON.stringify(settings, null, 2))
console.log('\n// Add to .mcp.json of the project (or register with `claude mcp add`):')
console.log(JSON.stringify(mcp, null, 2))
console.log('\n// Tools to allow if you use permission rules:')
console.log(JSON.stringify(TOOL_NAMES, null, 2))
