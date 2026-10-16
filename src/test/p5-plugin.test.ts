// The Claude Code plugin (plugin/agentlink): manifest, marketplace, and proof that the bundle works on its own.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const PLUGIN_SRC = path.join(REPO, 'plugin', 'agentlink')
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-plugin-'))
// The bundle is copied outside the repository, so it cannot reach node_modules or src: this is what an install looks like.
const PLUGIN = path.join(scratch, 'installed', 'agentlink')
const env: Record<string, string> = {
  ...(process.env as Record<string, string>),
  AGENTLINK_HOME: path.join(scratch, 'home'),
  AGENTLINK_PIPE: `\\\\.\\pipe\\agentlink-plugin-${randomBytes(4).toString('hex')}`,
  AGENTLINK_HOST: 'pc-plugin',
  AGENTLINK_LEASE_MS: '8000',
  AGENTLINK_SWEEP_MS: '200',
}
for (const k of ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_PROJECT_DIR', 'AGENTLINK_NAME', 'AGENTLINK_KEY', 'AGENTLINK_KIND']) delete env[k]

function ctl(...args: string[]): { status: number | null; out: string; err: string } {
  const r = spawnSync(process.execPath, ['--no-warnings', path.join(PLUGIN, 'dist', 'agentctl.mjs'), ...args], { env, encoding: 'utf8', timeout: 30_000 })
  return { status: r.status, out: r.stdout.trim(), err: r.stderr.trim() }
}

function hook(event: string, input: Record<string, unknown>, extra: Record<string, string> = {}): { status: number | null; json: any; out: string } {
  const r = spawnSync(process.execPath, ['--no-warnings', path.join(PLUGIN, 'dist', 'hook.mjs'), event], {
    input: JSON.stringify(input),
    env: { ...env, ...extra },
    encoding: 'utf8',
    timeout: 30_000,
  })
  const out = r.stdout.trim()
  return { status: r.status, out, json: out ? JSON.parse(out) : null }
}

before(() => {
  fs.cpSync(PLUGIN_SRC, PLUGIN, { recursive: true })
})

after(async () => {
  ctl('stop')
  await sleep(800)
  fs.rmSync(scratch, { recursive: true, force: true })
})

// --- manifest and marketplace -----------------------------------------------------------------------------------

test('plugin.json: hooks use the exec form with the plugin root, and the MCP server is declared', () => {
  const m = JSON.parse(fs.readFileSync(path.join(PLUGIN_SRC, '.claude-plugin', 'plugin.json'), 'utf8'))
  assert.equal(m.name, 'agentlink')
  assert.match(m.version, /^\d+\.\d+\.\d+$/)
  assert.deepEqual(Object.keys(m.hooks).sort(), ['PostToolUse', 'SessionEnd', 'SessionStart', 'Stop', 'UserPromptSubmit'])
  for (const [event, groups] of Object.entries<any[]>(m.hooks)) {
    const h = groups[0].hooks[0]
    assert.equal(h.type, 'command')
    assert.equal(h.command, 'node', 'exec form needs a real executable on PATH (no .cmd shims on Windows)')
    assert.ok(Array.isArray(h.args), `${event}: args must be present (exec form)`)
    assert.ok(h.args.includes('${CLAUDE_PLUGIN_ROOT}/dist/hook.mjs'), `${event} points at the bundled hook`)
    assert.equal(h.args[h.args.length - 1], event, 'the event name is the last argument')
    assert.ok(h.timeout > 0 && h.timeout <= 30)
  }
  assert.equal(m.hooks.PostToolUse[0].matcher, '*')
  assert.deepEqual(m.mcpServers.agentlink.args, ['--no-warnings', '${CLAUDE_PLUGIN_ROOT}/dist/mcp-server.mjs'])
  for (const f of ['hook.mjs', 'mcp-server.mjs', 'agentd.mjs', 'agentctl.mjs']) assert.ok(fs.existsSync(path.join(PLUGIN_SRC, 'dist', f)), `dist/${f} exists`)
})

test('marketplace.json points at the plugin and agrees with its version', () => {
  const mp = JSON.parse(fs.readFileSync(path.join(REPO, '.claude-plugin', 'marketplace.json'), 'utf8'))
  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN_SRC, '.claude-plugin', 'plugin.json'), 'utf8'))
  assert.equal(mp.plugins.length, 1)
  const entry = mp.plugins[0]
  assert.equal(entry.name, manifest.name)
  assert.equal(entry.version, manifest.version)
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'))
  assert.equal(manifest.version, pkg.version, 'plugin.json follows package.json: run "npm run build:plugin" after changing the version')
  assert.ok(entry.source.startsWith('./'))
  assert.ok(fs.existsSync(path.join(REPO, entry.source, '.claude-plugin', 'plugin.json')))
})

test('bin/agentctl is a shell script with Unix line endings', () => {
  const text = fs.readFileSync(path.join(PLUGIN_SRC, 'bin', 'agentctl'), 'utf8')
  assert.ok(text.startsWith('#!/bin/sh\n'))
  assert.ok(!text.includes('\r'), 'a CRLF would break the shebang line')
  assert.match(text, /dist\/agentctl\.mjs/)
})

test('the committed bundle is up to date with the sources', () => {
  const out = path.join(scratch, 'fresh-dist')
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'build-plugin.mjs')], {
    env: { ...process.env, AGENTLINK_BUILD_OUT: out },
    encoding: 'utf8',
    timeout: 120_000,
  })
  assert.equal(r.status, 0, r.stderr)
  for (const f of fs.readdirSync(out)) {
    const fresh = fs.readFileSync(path.join(out, f))
    const committed = fs.readFileSync(path.join(PLUGIN_SRC, 'dist', f))
    assert.ok(fresh.equals(committed), `plugin/agentlink/dist/${f} is stale: run "npm run build:plugin"`)
  }
})

// --- the bundle on its own -------------------------------------------------------------------------------------------

test('standalone: no node_modules and no sources next to the installed plugin', () => {
  assert.ok(!fs.existsSync(path.join(PLUGIN, 'node_modules')))
  assert.ok(!fs.existsSync(path.join(PLUGIN, 'src')))
  assert.ok(!fs.existsSync(path.join(scratch, 'installed', 'node_modules')))
})

test('standalone: agentctl starts the bundled daemon and two agents exchange a message', () => {
  const ping = ctl('ping')
  assert.equal(ping.status, 0, ping.err)
  assert.match(ping.out, /host=pc-plugin/)
  const pkgVersion = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).version
  assert.ok(ping.out.startsWith(`agentd ${pkgVersion} `), `the bundled daemon reports the package version (${pkgVersion}): ${ping.out}`)
  assert.equal(ctl('--as', 'alice', 'register').status, 0)
  assert.equal(ctl('--as', 'bob', 'register').status, 0)
  const sent = ctl('--as', 'alice', 'send', 'bob', 'from the bundled cli')
  assert.equal(sent.status, 0, sent.err)
  assert.match(sent.out, /^stored:/)
  const inbox = ctl('--as', 'bob', 'inbox')
  assert.match(inbox.out, /from the bundled cli/)
  assert.match(inbox.out, /from alice@pc-plugin \[[0-9a-f]{6}\]/)
})

test('standalone: the LAN layer works from the bundle (TLS identity and listener)', async () => {
  const fp = ctl('peers')
  assert.equal(fp.status, 0, fp.err)
  assert.match(fp.out, /fingerprint: sha256:([0-9A-F]{2}:){31}[0-9A-F]{2}/)

  const port = await new Promise<number>((resolve, reject) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port
      s.close(() => resolve(p))
    })
    s.on('error', reject)
  })
  fs.writeFileSync(path.join(env.AGENTLINK_HOME, 'peers.json'), JSON.stringify({ listen: { host: '127.0.0.1', port }, peers: [{ name: 'pc-z', token: 'a-long-enough-shared-secret-123', dial: false }] }))
  const reload = ctl('peers', 'reload')
  assert.equal(reload.status, 0, reload.err)
  assert.match(reload.out, new RegExp(`listening:   127\\.0\\.0\\.1:${port}`))
  assert.match(reload.out, /peer pc-z/)
})

test('standalone: the bundled hook registers a session and injects waiting messages', () => {
  const sid = 'cafe1234-0000-1111-2222-333344445555'
  const x = { CLAUDE_CODE_SESSION_ID: sid, AGENTLINK_NAME: 'sess', CLAUDE_PROJECT_DIR: PLUGIN }
  const input = { session_id: sid, cwd: PLUGIN }

  const start = hook('SessionStart', input, x)
  assert.equal(start.status, 0)
  assert.match(start.json.hookSpecificOutput.additionalContext, /you are agent sess@pc-plugin/)

  assert.equal(ctl('--as', 'carol', 'send', 'sess', 'hello session').status, 0)
  const prompt = hook('UserPromptSubmit', { ...input, prompt: 'go' }, x)
  assert.match(prompt.json.hookSpecificOutput.additionalContext, /<agentlink-message [^>]*from="carol@pc-plugin \[[0-9a-f]{6}\]"/)
  assert.match(prompt.json.hookSpecificOutput.additionalContext, /hello session/)
  assert.match(prompt.json.hookSpecificOutput.additionalContext, /trust="untrusted"/)

  assert.equal(hook('SessionEnd', input, x).status, 0)
  assert.equal(hook('SomethingUnknown', input, x).out, '')
})

test('standalone: the bundled MCP server serves the tools and carries messages between two agents', async () => {
  const open = async (name: string) => {
    const t = new StdioClientTransport({ command: process.execPath, args: ['--no-warnings', path.join(PLUGIN, 'dist', 'mcp-server.mjs')], env: { ...env, AGENTLINK_NAME: name }, cwd: PLUGIN })
    const c = new McpClient({ name: 'plugin-test', version: '1' }, { capabilities: {} })
    await c.connect(t)
    return c
  }
  const call = async (c: McpClient, name: string, args: Record<string, unknown> = {}) => {
    const r = (await c.callTool({ name, arguments: args })) as { content: Array<{ text: string }>; isError?: boolean }
    return { text: r.content.map(x => x.text).join('\n'), isError: r.isError === true }
  }
  const a = await open('mcp-a')
  const b = await open('mcp-b')
  try {
    assert.deepEqual((await a.listTools()).tools.map(t => t.name).sort(), ['ack_messages', 'list_agents', 'read_inbox', 'send_message'])
    for (let i = 0; i < 40 && !(await call(a, 'list_agents')).text.includes('mcp-b@pc-plugin'); i++) await sleep(150)
    const sent = await call(a, 'send_message', { to: 'mcp-b', message: 'over the bundled MCP server' })
    assert.equal(sent.isError, false, sent.text)
    const got = await call(b, 'read_inbox')
    assert.match(got.text, /over the bundled MCP server/)
    assert.match(got.text, /trust="untrusted"/)
  } finally {
    await a.close()
    await b.close()
  }
})
