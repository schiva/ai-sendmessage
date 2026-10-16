// Manual end-to-end check with two real INTERACTIVE Claude Code sessions (TUI in a pseudo console).
// It calls the model, so it is not part of `npm test`:   npm run e2e:interactive
//
// S0  both sessions come up and register through the SessionStart hook
// S1  ann -> ben while ben is busy (PostToolUse injection), ben answers ann through the MCP tool
// S2  a message arriving while a session is idle waits until the next prompt (D-09), then is injected
// S3  /exit unregisters (SessionEnd), --resume restores the same agent and its inbox
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Client } from '../client/client.ts'
import { claudeBin } from './claude-bin.ts'
import { claudeConfig, TOOL_NAMES } from '../adapters/claude/config.ts'
import { Terminal } from './pty-helper.ts'

const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const CLAUDE = claudeBin()
const HOST = 'pc-int'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-int-'))
const baseEnv: Record<string, string> = { ...(process.env as Record<string, string>) }
for (const k of Object.keys(baseEnv)) if (/^CLAUDE(CODE|_CODE_|_PROJECT|_PID|_ENV)/.test(k)) delete baseEnv[k]
Object.assign(baseEnv, {
  AGENTLINK_HOME: path.join(tmp, 'home'),
  AGENTLINK_PIPE: `\\\\.\\pipe\\agentlink-int-${randomBytes(4).toString('hex')}`,
  AGENTLINK_HOST: HOST,
  AGENTLINK_LEASE_MS: '120000',
  AGENTLINK_SWEEP_MS: '1000',
})
for (const k of ['AGENTLINK_HOME', 'AGENTLINK_PIPE', 'AGENTLINK_HOST', 'AGENTLINK_LEASE_MS', 'AGENTLINK_SWEEP_MS']) process.env[k] = baseEnv[k]

const { settings, mcp } = claudeConfig()
const settingsFile = path.join(tmp, 'settings.json')
const mcpFile = path.join(tmp, 'mcp.json')
fs.writeFileSync(settingsFile, JSON.stringify(settings))
fs.writeFileSync(mcpFile, JSON.stringify(mcp))

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const terminals: Terminal[] = []
function launch(name: string, extra: string[]): Terminal {
  const t = new Terminal(name, CLAUDE, ['--settings', settingsFile, '--mcp-config', mcpFile, '--strict-mcp-config', '--allowedTools', ...TOOL_NAMES, 'Bash', ...extra], {
    cwd: REPO,
    env: { ...baseEnv, AGENTLINK_NAME: name },
  })
  terminals.push(t)
  return t
}

const ctl = await Client.connect()
const me = (await ctl.request('register', { name: 'ctl', kind: 'test', key: 'int-ctl' })) as { agent: string }

interface Row {
  address: string
  ref: string
  status: string
  unread: number
  kind: string
}
async function agents(): Promise<Row[]> {
  return ((await ctl.request('list', { agent: me.agent })) as { agents: Row[] }).agents
}
async function agent(name: string): Promise<Row | undefined> {
  return (await agents()).find(a => a.address === `${name}@${HOST}`)
}
async function until<T>(fn: () => Promise<T | undefined | false>, ms: number, what: string): Promise<T> {
  const end = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error(`timed out after ${ms}ms waiting for ${what}`)
    await sleep(300)
  }
}
async function ready(t: Terminal): Promise<void> {
  await t.waitFor(() => t.has('shift+tab to cycle'), 60_000, 'the prompt to appear')
  await until(() => agent(t.name), 30_000, `${t.name} to register (SessionStart hook)`)
  await sleep(1500)
}

const annSid = randomUUID()
const benSid = randomUUID()
const benFirstRef: { v?: string } = {}

try {
  // --- S0 ----------------------------------------------------------------------------------
  console.log('\n[S0] two interactive sessions start and register')
  const ann = launch('ann', ['--session-id', annSid])
  const ben = launch('ben', ['--session-id', benSid])
  await ready(ann)
  await ready(ben)
  const a0 = await agent('ann')
  const b0 = await agent('ben')
  check('ann is registered as claude-code', a0?.kind === 'claude-code', a0?.status)
  check('ben is registered as claude-code', b0?.kind === 'claude-code', b0?.status)
  benFirstRef.v = b0?.ref

  // --- S1 ----------------------------------------------------------------------------------
  console.log('\n[S1] ann -> ben while ben is busy; ben replies through the MCP tool')
  const benMark = ben.mark()
  await ben.type(
    'Run exactly this Bash command and wait for it to finish: node -e "setTimeout(()=>{},40000)" . ' +
      'Afterwards look at your context for an <agentlink-message> block. If there is one: first call the agentlink send_message tool with `to` set to that block\'s from attribute and message "pong from ben", ' +
      'then reply on one line: SAW from=<the from attribute>. If there is none, reply: SAW none.',
  )
  await until(async () => (await agent('ben'))?.status === 'busy', 40_000, 'ben to become busy (UserPromptSubmit hook)')
  check('ben shows as busy while working', true)

  const annMark = ann.mark()
  await ann.type('Use the agentlink send_message tool exactly once to send the text "ping from ann" to the agent named ben. Then reply with one short sentence.')
  await ann.waitFor(() => ann.hasSince(annMark, /Sent\(stored\)|stored/), 90_000, 'ann to send the message')
  check('ann sent the message with the MCP tool', true)

  await ben.waitFor(() => ben.hasSince(benMark, /SAWfrom=ann@pc-int\[[0-9a-f]{6}\]/), 180_000, 'ben to report the message (PostToolUse injection)')
  check('ben saw the message from ann through hook injection', true)
  await until(async () => (await agent('ben'))?.status === 'idle', 60_000, 'ben to become idle (Stop hook)')
  check('ben went idle after finishing (Stop hook)', true)

  // --- S2 ----------------------------------------------------------------------------------
  console.log('\n[S2] a message that arrives while ann is idle waits for the next prompt')
  await until(async () => (await agent('ann'))?.status === 'idle', 60_000, 'ann to be idle')
  const pongUnread = await until(async () => ((await agent('ann'))?.unread ?? 0) >= 1 && (await agent('ann')), 30_000, "ben's reply to reach ann's inbox")
  check("ben's reply is waiting in ann's inbox while ann is idle", pongUnread.unread >= 1, `unread=${pongUnread.unread}`)
  const secretC = `KIWI-${Math.floor(Math.random() * 9000 + 1000)}`
  await ctl.request('send', { agent: me.agent, to: 'ann', message: `The code word is ${secretC}.` })
  const idleMark = ann.mark()
  await sleep(4000)
  check('nothing is pushed into an idle session (known limit D-09)', !ann.hasSince(idleMark, secretC))
  const before = await agent('ann')
  check('the messages stay unread until the next prompt', (before?.unread ?? 0) >= 2, `unread=${before?.unread}`)

  const quoteMark = ann.mark()
  await ann.type('Quote the text of every <agentlink-message> block that is in your context right now, each after the label QUOTE:. If there are none, write QUOTE: none.')
  await ann.waitFor(() => ann.hasSince(quoteMark, secretC), 120_000, 'ann to quote the code word (UserPromptSubmit injection)')
  check('the next prompt injected the waiting message (ctl code word)', true)
  check("ann also received ben's reply", ann.hasSince(quoteMark, 'pong from ben'))
  await until(async () => (await agent('ann'))?.unread === 0, 30_000, 'ann inbox to be drained')
  check('the inbox is drained after injection', true)

  // --- S3 ----------------------------------------------------------------------------------
  console.log('\n[S3] /exit unregisters; --resume brings back the same agent and inbox')
  await ben.type('/exit')
  try {
    await ben.waitFor(() => ben.exited, 15_000, 'ben to exit')
  } catch {
    ben.key('\x03')
    await sleep(500)
    ben.key('\x03')
    await ben.waitFor(() => ben.exited, 15_000, 'ben to exit after Ctrl+C')
  }
  await until(async () => (await agent('ben'))?.status === 'offline', 30_000, 'ben to go offline (SessionEnd hook)')
  check('ben is offline after /exit', true)

  const secretD = `QUINCE-${Math.floor(Math.random() * 9000 + 1000)}`
  await ctl.request('send', { agent: me.agent, to: 'ben', message: `Left while you were away: ${secretD}.` })
  const stored = await agent('ben')
  check('a message to an offline session is stored', (stored?.unread ?? 0) === 1, `unread=${stored?.unread}`)

  const ben2 = launch('ben', ['--resume', benSid])
  await ben2.waitFor(() => ben2.has('shift+tab to cycle'), 60_000, 'the resumed prompt')
  await until(async () => (await agent('ben'))?.status !== 'offline', 30_000, 'ben to come back online')
  const b2 = await agent('ben')
  check('the resumed session is the same agent (same ref)', b2?.ref === benFirstRef.v, `${benFirstRef.v} -> ${b2?.ref}`)
  const resumeMark = ben2.mark()
  await ben2.type('Quote the text of every <agentlink-message> block in your context right now after the label QUOTE2:. If there are none, write QUOTE2: none.')
  await ben2.waitFor(() => ben2.hasSince(resumeMark, secretD), 120_000, 'the resumed ben to quote the stored message')
  check('the message stored while away was delivered after --resume', true)
} catch (e) {
  failures++
  console.log(`FAIL  ${e instanceof Error ? e.message : String(e)}`)
  for (const t of terminals) {
    const f = path.join(os.tmpdir(), `agentlink-int-screen-${t.name}.txt`)
    t.dump(f)
    console.log(`      screen of ${t.name} saved to ${f}`)
  }
} finally {
  for (const t of terminals) t.kill()
  try {
    await ctl.request('shutdown')
  } catch {
    // ignore
  }
  ctl.close()
  await sleep(800)
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log(failures === 0 ? '\nAll interactive end-to-end checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
