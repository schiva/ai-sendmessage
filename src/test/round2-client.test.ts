// Round 2, client side: the Stop hook's branches (continues / nags / stop_hook_active) pinned down one by one.
// A running idle watcher is faked by its state file (wakeAlive only looks at the recorded pid and time), so no process is started.
import { test, after, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Client } from '../client/client.ts'

const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const HOOK = path.join(REPO, 'src/adapters/claude/hook.ts')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-round2-'))
process.env.AGENTLINK_HOME = tmp
process.env.AGENTLINK_PIPE = `\\\\.\\pipe\\agentlink-round2-${randomBytes(4).toString('hex')}`
process.env.AGENTLINK_HOST = 'pc-round2'
process.env.AGENTLINK_LEASE_MS = '60000'
process.env.AGENTLINK_SWEEP_MS = '200'
process.env.AGENTLINK_DUP_WINDOW_MS = '50'
process.env.AGENTLINK_RATE_BURST = '500'
process.env.AGENTLINK_RATE_PER_MIN = '6000'
process.env.AGENTLINK_STOP_WAKE_WAIT_MS = '50' // the Stop hook would wait 2 s for a just-started watcher on every ask; none is started here
for (const k of ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_PROJECT_DIR', 'AGENTLINK_NAME', 'AGENTLINK_KEY', 'AGENTLINK_KIND', 'AGENTLINK_NO_WAKE']) delete process.env[k]

let ctl: Client
let ctlAgent: string

before(async () => {
  ctl = await Client.connect()
  ctlAgent = ((await ctl.request('register', { name: 'ctl2', kind: 'test', key: 'round2-ctl' })) as { agent: string }).agent
})

after(async () => {
  ctl.close()
  try {
    const c = await Client.connect({ autostart: false })
    await c.request('shutdown')
    c.close()
  } catch {
    // already stopped
  }
  await new Promise(r => setTimeout(r, 600))
  fs.rmSync(tmp, { recursive: true, force: true })
})

// --- helpers ----------------------------------------------------------------------------------------------------

interface HookRun {
  status: number | null
  out: string
  stderr: string
  json: { decision?: string; reason?: string; hookSpecificOutput?: { additionalContext?: string } } | null
}

function runHook(event: string, session: Session, extra: Record<string, unknown> = {}): HookRun {
  const r = spawnSync(process.execPath, ['--no-warnings', HOOK, event], {
    input: JSON.stringify({ session_id: session.id, cwd: REPO, ...extra }),
    env: { ...process.env, AGENTLINK_NAME: session.name },
    encoding: 'utf8',
    timeout: 20000,
  })
  const out = r.stdout.trim()
  return { status: r.status, out, stderr: r.stderr, json: out ? JSON.parse(out) : null }
}

interface Session {
  id: string
  name: string
  agent: string
}

/** Starts a hook session (SessionStart) and learns its agent id from the watcher command in the announcement. */
function startSession(name: string): Session {
  const s: Session = { id: `round2-${name}-${randomBytes(3).toString('hex')}`, name, agent: '' }
  const start = runHook('SessionStart', s)
  assert.equal(start.status, 0)
  const m = /wake --agent (\S+)/.exec(start.json?.hookSpecificOutput?.additionalContext ?? '')
  assert.ok(m, `SessionStart must announce the watcher command: ${start.out}`)
  s.agent = m[1]
  return s
}

const stop = (s: Session, active = false): HookRun => runHook('Stop', s, { stop_hook_active: active })
const isNag = (r: HookRun): boolean => r.json?.decision === 'block' && /no idle watcher is running/.test(r.json.reason ?? '')
const isDelivery = (r: HookRun, text: string): boolean => r.json?.decision === 'block' && (r.json.reason ?? '').includes(text) && !/no idle watcher is running/.test(r.json.reason ?? '')

async function sendTo(s: Session, message: string): Promise<void> {
  await ctl.request('send', { agent: ctlAgent, to: s.name, message })
}

async function unread(s: Session): Promise<number> {
  const r = (await ctl.request('list', { agent: ctlAgent })) as { agents: Array<{ address: string; unread: number }> }
  return r.agents.find(a => a.address === `${s.name}@pc-round2`)?.unread ?? -1
}

/** Pretends that an idle watcher is running (alive) or not, the way the real watcher's state file says it. */
function setWatcher(s: Session, alive: boolean): void {
  fs.mkdirSync(path.join(tmp, 'hook-state'), { recursive: true })
  fs.writeFileSync(path.join(tmp, 'hook-state', `${s.agent}.wake.json`), JSON.stringify({ pid: alive ? 4242 : 0, ts: alive ? Date.now() : 0, wakes: [] }))
}

const hookStateFile = (s: Session): string => path.join(tmp, 'hook-state', `${s.id.replace(/[^A-Za-z0-9_-]/g, '_')}.json`)

// --- the Stop hook -----------------------------------------------------------------------------------------------

test('Stop asks for a watcher at most twice in a row; a running watcher resets the count', () => {
  const s = startSession('nags')
  assert.ok(isNag(stop(s)), 'first ask')
  assert.ok(isNag(stop(s)), 'second ask')
  assert.equal(stop(s).json, null, 'after two asks the hook stops insisting')
  assert.equal(stop(s).json, null, 'and stays quiet')

  setWatcher(s, true)
  assert.equal(stop(s).json, null, 'a running watcher: nothing to ask')
  setWatcher(s, false)
  assert.ok(isNag(stop(s)), 'the count started over: it asks again')
  assert.ok(isNag(stop(s)), 'twice')
  assert.equal(stop(s).json, null)
})

test('waiting messages are delivered first; the watcher request neither rides along nor uses up an ask', async () => {
  const s = startSession('first')
  await sendTo(s, 'deliver me before anything else')
  const delivered = stop(s)
  assert.ok(isDelivery(delivered, 'deliver me before anything else'), delivered.out)
  assert.equal(await unread(s), 0, 'the message was taken')
  // The ask for a watcher was not used up by that Stop: both asks are still there.
  assert.ok(isNag(stop(s)), 'first ask')
  assert.ok(isNag(stop(s)), 'second ask')
  assert.equal(stop(s).json, null)
})

test('stop_hook_active does not hold back waiting messages, but it does suppress the watcher request', async () => {
  const s = startSession('active')
  assert.equal(stop(s, true).json, null, 'a continuation turn does not ask for a watcher again')
  await sendTo(s, 'arrived during the continuation')
  assert.ok(isDelivery(stop(s, true), 'arrived during the continuation'))
})

test('after five rounds with messages still waiting, Stop goes on to the watcher check instead of a sixth round', async () => {
  const s = startSession('limit')
  // One Stop takes everything that is waiting, so the rounds are driven one message at a time.
  for (let i = 0; i < 5; i++) {
    await sendTo(s, `round ${i}`)
    assert.ok(isDelivery(stop(s, true), `round ${i}`), `round ${i} is delivered`)
  }
  await sendTo(s, 'round 5')
  await sendTo(s, 'round 6')
  assert.equal(await unread(s), 2, 'two messages are waiting')

  const sixth = stop(s, false)
  assert.ok(isNag(sixth), `no sixth round: the hook turns to the watcher check (${sixth.out})`)
  assert.ok(!(sixth.json?.reason ?? '').includes('round 5'), 'and the waiting messages are not shown in that Stop')
  assert.equal(await unread(s), 2, 'they stay for the next prompt')

  assert.equal(stop(s, true).json, null, 'in a continuation turn the hook just ends')
  const prompt = runHook('UserPromptSubmit', s)
  const ctx = prompt.json?.hookSpecificOutput?.additionalContext ?? ''
  assert.ok(ctx.includes('round 5') && ctx.includes('round 6'), 'the next prompt delivers them')
})

test('a new prompt resets the continue count but not the asks; SessionStart resets both', async () => {
  const s = startSession('resets')
  assert.ok(isNag(stop(s)))
  assert.ok(isNag(stop(s)))
  assert.equal(stop(s).json, null, 'asks used up')

  for (let i = 0; i < 5; i++) {
    await sendTo(s, `fill ${i}`)
    assert.ok(isDelivery(stop(s, true), `fill ${i}`))
  }
  await sendTo(s, 'one more')
  assert.equal(stop(s, true).json, null, 'five rounds used up (a continuation turn ends quietly)')
  runHook('UserPromptSubmit', s) // takes 'one more' and resets the continue count
  await sendTo(s, 'after the prompt')
  assert.ok(isDelivery(stop(s, true), 'after the prompt'), 'the continue count started over')
  assert.equal(stop(s).json, null, 'but the asks were not given back by the prompt')

  runHook('SessionStart', s)
  assert.ok(isNag(stop(s)), 'SessionStart started everything over')
})

test('a damaged state file counts as empty: the hook still answers and never fails the session', () => {
  const s = startSession('damaged')
  assert.ok(isNag(stop(s)))
  assert.ok(isNag(stop(s)))
  assert.equal(stop(s).json, null)
  fs.writeFileSync(hookStateFile(s), '{"nags": 2, "conti') // cut off in the middle
  const r = stop(s)
  assert.equal(r.status, 0, `a hook never fails the session (stderr: ${r.stderr})`)
  assert.ok(isNag(r), 'unreadable state is the same as no state: the count starts over')
  fs.writeFileSync(hookStateFile(s), '')
  assert.equal(stop(s).status, 0, 'an empty file is no problem either')
})

test('two sessions keep their own counters', () => {
  const a = startSession('own-a')
  const b = startSession('own-b')
  assert.ok(isNag(stop(a)))
  assert.ok(isNag(stop(a)))
  assert.equal(stop(a).json, null, 'a has used up its asks')
  assert.ok(isNag(stop(b)), 'b has not')
})

// --- the wait of the Stop hook can only be lowered ------------------------------------------------------------------

test('AGENTLINK_STOP_WAKE_WAIT_MS lowers the Stop hook wait but never raises it above the budget', async () => {
  const { stopWakeWaitMs, STOP_WAKE_WAIT_MS } = await import('../adapters/common/timing.ts')
  assert.equal(stopWakeWaitMs({}), STOP_WAKE_WAIT_MS, 'unset: the full wait')
  assert.equal(stopWakeWaitMs({ AGENTLINK_STOP_WAKE_WAIT_MS: '100' }), 100)
  assert.equal(stopWakeWaitMs({ AGENTLINK_STOP_WAKE_WAIT_MS: '0' }), 0)
  assert.equal(stopWakeWaitMs({ AGENTLINK_STOP_WAKE_WAIT_MS: '60000' }), STOP_WAKE_WAIT_MS, 'a larger value is capped: the hook timeout is checked against the default')
  assert.equal(stopWakeWaitMs({ AGENTLINK_STOP_WAKE_WAIT_MS: 'soon' }), STOP_WAKE_WAIT_MS, 'nonsense is ignored')
  assert.equal(stopWakeWaitMs({ AGENTLINK_STOP_WAKE_WAIT_MS: '-5' }), STOP_WAKE_WAIT_MS, 'so is a negative value')
})
