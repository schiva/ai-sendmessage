// Manual end-to-end check of the Claude Code plugin with real sessions (`claude -p --plugin-dir`). It calls the model,
// so it is not part of `npm test`:   npm run e2e:plugin
// Nothing is installed: the plugin is copied to a scratch folder (like an install would) and loaded for one session,
// with no --settings and no --mcp-config, so everything the sessions use comes from the plugin itself.
//   [1] a session sends a message through the plugin's MCP tool
//   [2] a message arrives while a session works; the plugin's PostToolUse hook injects it
//   [3] the plugin's bin/ directory puts `agentctl` on the Bash tool's PATH
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Client } from '../client/client.ts'
import { claudeBin } from './claude-bin.ts'

const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const CLAUDE = claudeBin()
const TOOLS = ['send_message', 'list_agents', 'read_inbox', 'ack_messages'].map(t => `mcp__plugin_agentlink_agentlink__${t}`)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-e2e-plugin-'))
const pluginDir = path.join(tmp, 'installed', 'agentlink')
fs.cpSync(path.join(REPO, 'plugin', 'agentlink'), pluginDir, { recursive: true })

const env: Record<string, string> = { ...(process.env as Record<string, string>) }
for (const k of Object.keys(env)) if (/^CLAUDE(CODE|_CODE_|_PROJECT|_PID|_ENV)/.test(k)) delete env[k]
Object.assign(env, {
  AGENTLINK_HOME: path.join(tmp, 'home'),
  AGENTLINK_PIPE: `\\\\.\\pipe\\agentlink-e2e-plugin-${randomBytes(4).toString('hex')}`,
  AGENTLINK_HOST: 'pc-plug',
  AGENTLINK_LEASE_MS: '60000',
  AGENTLINK_SWEEP_MS: '1000',
})
for (const k of ['AGENTLINK_HOME', 'AGENTLINK_PIPE', 'AGENTLINK_HOST', 'AGENTLINK_LEASE_MS', 'AGENTLINK_SWEEP_MS']) process.env[k] = env[k]

let failures = 0
let cost = 0
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface RunResult {
  code: number | null
  result: string
}

function runClaude(name: string, prompt: string): Promise<RunResult> {
  const args = ['-p', prompt, '--plugin-dir', pluginDir, '--allowedTools', ...TOOLS, 'Bash', '--output-format', 'json', '--max-turns', '10']
  const child = spawn(CLAUDE, args, { cwd: REPO, env: { ...env, AGENTLINK_NAME: name }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  let out = ''
  child.stdout.on('data', d => (out += d))
  child.stderr.on('data', () => {})
  return new Promise(resolve => {
    const timer = setTimeout(() => child.kill(), 240_000)
    child.on('close', code => {
      clearTimeout(timer)
      let result = out
      try {
        const j = JSON.parse(out)
        result = String(j.result ?? '')
        cost += Number(j.total_cost_usd ?? 0)
      } catch {
        // keep the raw output
      }
      resolve({ code, result })
    })
  })
}

const ctl = await Client.connect()
const me = (await ctl.request('register', { name: 'ctl', kind: 'test', key: 'plug-ctl' })) as { agent: string }
const bob = (await ctl.request('register', { name: 'bob', kind: 'cli', key: 'plug-bob' })) as { agent: string }
type Row = { address: string; status: string; kind: string; unread: number }
const agents = async (): Promise<Row[]> => ((await ctl.request('list', { agent: me.agent })) as { agents: Row[] }).agents

try {
  console.log('\n[1] a session sends a message through the plugin MCP tool')
  const s1 = await runClaude(
    'alice',
    'Use the send_message tool of the agentlink MCP server exactly once to send the message "Hello Bob, this is Alice from the AgentLink plugin." to the agent named bob. Then reply with the single word sent.',
  )
  check('claude exited normally', s1.code === 0, `exit ${s1.code}`)
  const inbox = (await ctl.request('inbox', { agent: bob.agent, mode: 'take' })) as { messages: Array<{ from: string; message: string }> }
  check('bob received exactly one message', inbox.messages.length === 1, `${inbox.messages.length} message(s)`)
  check('the text arrived intact', /Hello Bob, this is Alice from the AgentLink plugin/.test(inbox.messages[0]?.message ?? ''))
  check('the sender is the plugin-registered claude-code agent "alice"', /^alice@pc-plug \[[0-9a-f]{6}\]$/.test(inbox.messages[0]?.from ?? ''), inbox.messages[0]?.from)
  const after = (await agents()).find(a => a.address === 'alice@pc-plug')
  check('alice is offline after the session ended (the plugin SessionEnd hook)', !after || after.status === 'offline', after?.status ?? 'unregistered')

  console.log('\n[2] a message arrives while a session works -> the plugin PostToolUse hook injects it')
  const secret = `MANGO-${Math.floor(Math.random() * 9000 + 1000)}`
  const s2p = runClaude(
    'carol',
    'Step 1: run this Bash command and wait for it to finish: node -e "setTimeout(()=>{},20000)". ' +
      'Step 2: afterwards check whether you were shown any <agentlink-message> block in your context. ' +
      'If yes, reply with the exact text inside it, prefixed by SAW:. If not, reply NONE. Do not call any other tool.',
  )
  let busy = false
  for (let i = 0; i < 100 && !busy; i++) {
    const c = (await agents()).find(a => a.address === 'carol@pc-plug')
    busy = c?.status === 'busy' && c.kind === 'claude-code'
    if (!busy) await sleep(500)
  }
  check('carol registered through the plugin hook and became busy', busy)
  await ctl.request('send', { agent: me.agent, to: 'carol', message: `The secret fruit is ${secret}.` })
  const s2 = await s2p
  check('claude exited normally', s2.code === 0, `exit ${s2.code}`)
  check('the injected message reached the model', s2.result.includes(secret), s2.result.replace(/\s+/g, ' ').slice(0, 140))

  console.log('\n[3] the plugin bin/ directory puts agentctl on the Bash PATH')
  const s3 = await runClaude(
    'dave',
    'Run this exact Bash command: agentctl ping   Then reply with ARGS: followed by the exact output line it printed. If the command is not found, reply NOTFOUND.',
  )
  check('claude exited normally', s3.code === 0, `exit ${s3.code}`)
  check('agentctl was found and answered with this host', /host=pc-plug/.test(s3.result), s3.result.replace(/\s+/g, ' ').slice(0, 140))
} finally {
  console.log(`\nmodel cost: about $${cost.toFixed(3)}`)
  try {
    await ctl.request('shutdown')
  } catch {
    // ignore
  }
  ctl.close()
  await sleep(800)
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log(failures === 0 ? '\nAll plugin end-to-end checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
