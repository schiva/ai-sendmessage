// Usage (as a Claude Code MCP stdio server): node probe-mcp.ts <logfile>
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { record } from './probe-common.ts'

const [logFile] = process.argv.slice(2)

const mcp = new Server({ name: 'probe', version: '0.0.1' }, { capabilities: { tools: {} } })

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: 'whoami', description: 'Records process information about this MCP server for a spike. Call it once.', inputSchema: { type: 'object', properties: {} } }],
}))

mcp.setRequestHandler(CallToolRequestSchema, async req => {
  if (req.params.name === 'whoami') {
    record(logFile, 'mcp:tool-call', {})
    return { content: [{ type: 'text', text: 'recorded' }] }
  }
  throw new Error(`unknown tool: ${req.params.name}`)
})

await mcp.connect(new StdioServerTransport())

const info = mcp.getClientVersion()
mcp.oninitialized = () => {
  record(logFile, 'mcp:initialized', { clientInfo: mcp.getClientVersion() ?? info ?? null, clientCapabilities: mcp.getClientCapabilities() ?? null })
}
record(logFile, 'mcp:start', {})
