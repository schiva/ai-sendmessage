// Manual end-to-end check with real Claude Code sessions (`claude -p`). It calls the model, so it is not part of `npm test`.
//   npm run e2e:claude
// Scenario 1: a Claude session sends a message to another agent through the MCP tool.
// Scenario 2: a message arrives while a Claude session is busy; the PostToolUse hook injects it.
// Scenario 3: a Claude session talks to an agent that is not Claude (the SDK echo agent) and reads its answer.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Client } from '../client/client.ts'
import { claudeBin } from './claude-bin.ts'
import { claudeConfig, TOOL_NAMES } from '../adapters/claude/config.ts'
import { startEchoAgent } from '../agents/echo-agent.ts'
import type { AgentLinkAgent } from '../sdk/agentlink.ts'

const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const CLAUDE = claudeBin()

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-e2e-'))
const env: Record<string, string> = { ...(process.env as Record<string, string>) }
for (const k of Object.keys(env)) if (/^CLAUDE(CODE|_CODE_|_PROJECT|_PID|_ENV)/.test(k)) delete env[k]
Object.assign(env, {
  AGENTLINK_HOME: path.join(tmp, 'home'),
  AGENTLINK_PIPE: `\\\\.\\pipe\\agentlink-e2e-${randomBytes(4).toString('hex')}`,
  AGENTLINK_HOST: 'pc-e2e',
  AGENTLINK_LEASE_MS: '60000',
  AGENTLINK_SWEEP_MS: '1000',
})
Object.assign(process.env, {
  AGENTLINK_HOME: env.AGENTLINK_HOME,
  AGENTLINK_PIPE: env.AGENTLINK_PIPE,
  AGENTLINK_HOST: env.AGENTLINK_HOST,
  AGENTLINK_LEASE_MS: env.AGENTLINK_LEASE_MS,
  AGENTLINK_SWEEP_MS: env.AGENTLINK_SWEEP_MS,
})

const { settings, mcp } = claudeConfig()
const settingsFile = path.join(tmp, 'settings.json')
const mcpFile = path.join(tmp, 'mcp.json')
fs.writeFileSync(settingsFile, JSON.stringify(settings))
fs.writeFileSync(mcpFile, JSON.stringify(mcp))

let failures = 0
let cost = 0
let echoAgent: AgentLinkAgent | undefined
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface RunResult {
  code: number | null
  result: string
  sessionId: string
  stderr: string
}

function runClaude(name: string, prompt: string): { done: Promise<RunResult> } {
  const args = [
    '-p',
    prompt,
    '--mcp-config',
    mcpFile,
    '--strict-mcp-config',
    '--settings',
    settingsFile,
    '--allowedTools',
    ...TOOL_NAMES,
    'Bash',
    '--output-format',
    'json',
    '--max-turns',
    '10',
  ]
  const child = spawn(CLAUDE, args, { cwd: REPO, env: { ...env, AGENTLINK_NAME: name }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  let out = ''
  let err = ''
  child.stdout.on('data', d => (out += d))
  child.stderr.on('data', d => (err += d))
  const done = new Promise<RunResult>(resolve => {
    const timer = setTimeout(() => child.kill(), 240_000)
    child.on('close', code => {
      clearTimeout(timer)
      let result = ''
      let sessionId = ''
      try {
        const j = JSON.parse(out)
        result = String(j.result ?? '')
        sessionId = String(j.session_id ?? '')
        cost += Number(j.total_cost_usd ?? 0)
      } catch {
        result = out
      }
      resolve({ code, result, sessionId, stderr: err })
    })
  })
  return { done }
}

const ctl = await Client.connect()
const me = (await ctl.request('register', { name: 'ctl', kind: 'test', key: 'e2e-ctl' })) as { agent: string }
const bob = (await ctl.request('register', { name: 'bob', kind: 'cli', key: 'e2e-bob' })) as { agent: string }

async function agents(): Promise<Array<{ address: string; status: string; kind: string }>> {
  return ((await ctl.request('list', { agent: me.agent })) as { agents: Array<{ address: string; status: string; kind: string }> }).agents
}

try {
  // --- Scenario 1 ---------------------------------------------------------------------------
  console.log('\n[1] Claude session -> agent "bob" through the send_message tool')
  const s1 = await runClaude(
    'alice',
    'Use the agentlink send_message tool exactly once to send the message "Hello Bob, this is Alice speaking from a Claude session." to the agent named bob. Then reply with the single word sent.',
  ).done
  check('claude exited normally', s1.code === 0, `exit ${s1.code}`)
  const inbox = (await ctl.request('inbox', { agent: bob.agent, mode: 'take' })) as { messages: Array<{ from: string; message: string }> }
  check('bob received exactly one message', inbox.messages.length === 1, `${inbox.messages.length} message(s)`)
  check('the message text arrived intact', /Hello Bob, this is Alice speaking/.test(inbox.messages[0]?.message ?? ''))
  check('sender is the Claude agent "alice"', /^alice@pc-e2e \[[0-9a-f]{6}\]$/.test(inbox.messages[0]?.from ?? ''), inbox.messages[0]?.from)
  const after1 = (await agents()).find(a => a.address === 'alice@pc-e2e')
  check('alice is offline after its session ended (SessionEnd hook)', !after1 || after1.status === 'offline', after1?.status ?? 'unregistered')

  // --- Scenario 2 ---------------------------------------------------------------------------
  console.log('\n[2] message arrives while a Claude session is busy -> PostToolUse injection')
  const secret = `PINEAPPLE-${Math.floor(Math.random() * 9000 + 1000)}`
  const s2 = runClaude(
    'carol',
    'Step 1: run this Bash command and wait for it to finish: node -e "setTimeout(()=>{},20000)". ' +
      'Step 2: after it finishes, check whether you were shown any <agentlink-message> block in your context. ' +
      'If yes, reply with the exact text inside it, prefixed by SAW:. If not, reply NONE. Do not call any other tool.',
  )
  let sawBusy = false
  for (let i = 0; i < 100; i++) {
    const c = (await agents()).find(a => a.address === 'carol@pc-e2e')
    if (c && c.status === 'busy') {
      sawBusy = true
      break
    }
    await sleep(500)
  }
  check('carol registered as a claude-code agent and became busy', sawBusy)
  await ctl.request('send', { agent: me.agent, to: 'carol', message: `The secret code word is ${secret}.` })
  const r2 = await s2.done
  check('claude exited normally', r2.code === 0, `exit ${r2.code}`)
  check('the injected message reached the model', r2.result.includes(secret), r2.result.replace(/\s+/g, ' ').slice(0, 160))
  const carol = (await agents()).find(a => a.address === 'carol@pc-e2e')
  check('the message was consumed (no unread left)', !carol || carol.unread === 0)

  // --- Scenario 3 ---------------------------------------------------------------------------
  console.log('\n[3] Claude session <-> a non-Claude agent (SDK echo agent)')
  echoAgent = await startEchoAgent({ name: 'echo' })
  const s3 = await runClaude(
    'dave',
    'Step 1: use the agentlink send_message tool exactly once to send the text "upper agentlink works" to the agent named echo. ' +
      'Step 2: call the agentlink read_inbox tool with wait_ms 20000 to fetch its answer. ' +
      'Step 3: reply with ANSWER: followed by the exact text of the answer message you received.',
  ).done
  check('claude exited normally', s3.code === 0, `exit ${s3.code}`)
  check('the echo agent answered and Claude read the answer', /AGENTLINK WORKS/.test(s3.result), s3.result.replace(/\s+/g, ' ').slice(0, 160))
} finally {
  await echoAgent?.close().catch(() => {})
  console.log(`\nmodel cost: about $${cost.toFixed(3)}`)
  try {
    await ctl.request('shutdown')
  } catch {
    // ignore
  }
  ctl.close()
  await sleep(500)
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log(failures === 0 ? '\nAll end-to-end checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
