// Verifies the server half of P0 without Claude Code: spawns channel.ts as an
// MCP stdio server, checks the channel capability, POSTs a message and expects
// a `notifications/claude/channel` event, then calls the reply tool.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { z } from 'zod'

const PORT = 18788
const TOKEN = 'selftest'
const base = `http://127.0.0.1:${PORT}`

const client = new Client({ name: 'selftest', version: '0.0.1' }, { capabilities: {} })
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['src/p0/channel.ts'],
  env: { ...(process.env as Record<string, string>), LANMSG_P0_PORT: String(PORT), LANMSG_P0_TOKEN: TOKEN },
})

const ChannelNotification = z.object({
  method: z.literal('notifications/claude/channel'),
  params: z.object({ content: z.string(), meta: z.record(z.string()).optional() }),
})

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`)
  if (!ok) failures++
}

const received: Array<{ content: string; meta?: Record<string, string> }> = []
client.setNotificationHandler(ChannelNotification, async n => {
  received.push(n.params)
})

await client.connect(transport)

const caps = client.getServerCapabilities()
check('declares claude/channel capability', !!caps?.experimental?.['claude/channel'])
check('declares tools capability', !!caps?.tools)

const tools = await client.listTools()
check('exposes reply tool', tools.tools.some(t => t.name === 'reply'))

for (let i = 0; i < 20; i++) {
  try {
    await fetch(base, { method: 'GET' })
    break
  } catch {
    await new Promise(r => setTimeout(r, 100))
  }
}

const noAuth = await fetch(base, { method: 'POST', body: 'x' })
check('rejects request without token', noAuth.status === 403, `status ${noAuth.status}`)

const ok = await fetch(base, {
  method: 'POST',
  body: 'hello from selftest',
  headers: { Authorization: `Bearer ${TOKEN}`, 'X-From': 'tester@pc-a' },
})
check('accepts authorized POST', ok.status === 200, `status ${ok.status}`)

for (let i = 0; i < 20 && received.length === 0; i++) await new Promise(r => setTimeout(r, 100))
check('channel notification delivered', received.length === 1 && received[0].content === 'hello from selftest')
check('meta carries chat_id and from', received[0]?.meta?.chat_id === '1' && received[0]?.meta?.from === 'tester@pc-a')

const big = await fetch(base, {
  method: 'POST',
  body: 'a'.repeat(70 * 1024),
  headers: { Authorization: `Bearer ${TOKEN}` },
}).then(r => r.status, () => 413)
check('rejects oversized body', big === 413, `status ${big}`)

const sse = await fetch(`${base}/events`, { headers: { Authorization: `Bearer ${TOKEN}` } })
const reader = sse.body!.getReader()
await reader.read()
await client.callTool({ name: 'reply', arguments: { chat_id: '1', text: 'pong' } })
const { value } = await reader.read()
check('reply tool streams to /events', new TextDecoder().decode(value).includes('Reply to 1: pong'))
await reader.cancel()

await client.close()
console.log(failures === 0 ? '\nAll checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
