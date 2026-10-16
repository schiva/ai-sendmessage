// The command line of `agentctl join` against REAL daemons (two temporary ones on this PC), not a stand-in: what a person types is run as is.
// join-cli.test.ts checks the logic against scripted answers; this file checks that those answers are the ones the daemon really gives.
import { test, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { Client } from '../client/client.ts'
import { cleanup, linkUp, makeNode, start, stop, until, writePeers } from './lan-harness.ts'
import type { Node } from './lan-harness.ts'
import { Terminal } from './pty-helper.ts'

const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const AGENTCTL = path.join(REPO, 'src/client/agentctl.ts')

after(() => cleanup())

const call = (n: Node, method: string, params: Record<string, unknown> = {}) => (n.client as Client).request(method, params) as Promise<any>

/** A receiving PC H and a joining PC J on loopback, each with its own daemon, data folder and LAN port. */
async function pcs(hostH: string, hostJ: string) {
  const common = { AGENTLINK_JOIN_IP_INTERVAL_MS: '0', AGENTLINK_JOIN_MIN_TTL_S: '1' }
  const H = await makeNode(hostH, common)
  const J = await makeNode(hostJ, common)
  await start(H)
  await start(J)
  writePeers(J, { listen: { host: '127.0.0.1', port: J.port }, peers: [] })
  await call(J, 'reload_peers')
  return { H, J }
}

const envOf = (n: Node): Record<string, string> => ({ ...(process.env as Record<string, string>), ...n.env, AGENTLINK_HOME: n.home, AGENTLINK_PIPE: n.pipe, NO_COLOR: '1' })

interface Child {
  out: () => string
  err: () => string
  text: () => string
  exited: Promise<number | null>
  kill: () => void
}

/** agentctl as a child process of a PC (pipes, so not a terminal). */
function agentctl(n: Node, args: string[]): Child {
  const child = spawn(process.execPath, ['--no-warnings', AGENTCTL, ...args], { env: envOf(n), stdio: ['ignore', 'pipe', 'pipe'] })
  let out = ''
  let err = ''
  child.stdout.on('data', d => (out += d))
  child.stderr.on('data', d => (err += d))
  const exited = new Promise<number | null>(resolve => child.once('close', code => resolve(code)))
  return { out: () => out, err: () => err, text: () => out + err, exited, kill: () => void child.kill() }
}

const terminal = (name: string, n: Node, args: string[]): Terminal => new Terminal(name, process.execPath, ['--no-warnings', AGENTCTL, ...args], { cwd: REPO, env: envOf(n), cols: 130, rows: 30 })

const waitText = async (c: Child, re: RegExp, what: string, ms = 15_000): Promise<RegExpExecArray> =>
  until(async () => re.exec(c.text()) ?? false, ms, what)

const sasOf = (c: Child): string => /Confirmation number: (\d{3}) (\d{3})/.exec(c.out())?.slice(1, 3).join('') ?? assert.fail(`no confirmation number in: ${c.text()}`)

const openArgs = (H: Node, ...extra: string[]): string[] => ['pair', '--open', '--address', '127.0.0.1', '--port', String(H.port), '--ttl', '60', ...extra]

// --- the normal way, as a person types it -----------------------------------------------------------------------------------

test('real daemons: pair --open, join, pair approve in a terminal: both PCs save each other and the link comes up', async () => {
  const { H, J } = await pcs('pc-h1', 'pc-j1')
  const opener = agentctl(H, openArgs(H))
  let joiner: Child | null = null
  let approver: Terminal | null = null
  try {
    const cmdLine = await waitText(opener, /agentctl join (127\.0\.0\.1:\d+)/, 'the command for the new PC')
    assert.equal(cmdLine[1], `127.0.0.1:${H.port}`)
    assert.match(opener.out(), /This PC is "pc-h1" at 127\.0\.0\.1:\d+\. The window is open for 1 min and admits 1 PC\./)

    joiner = agentctl(J, ['join', cmdLine[1], '--timeout', '60'])
    await waitText(joiner, /Confirmation number: \d{3} \d{3}/, 'the confirmation number on the new PC')
    const sas = sasOf(joiner)

    const asks = await waitText(opener, /pc-j1 \(127\.0\.0\.1\) asks to join \(request ([0-9a-f]{4})\)\. Approve it with the 6-digit number shown on the new PC: agentctl pair approve \1/, 'the request at the receiving PC')
    const id = asks[1]
    assert.ok(!opener.text().includes(sas) && !/\d{3} \d{3}/.test(opener.out()), `the receiving PC printed a number: ${opener.text()}`)

    approver = terminal('approve', H, ['pair', 'approve', id])
    await approver.waitFor(() => approver!.has('6-digit number shown on the new PC:'), 20_000, 'the number prompt')
    await approver.type(sas)
    await approver.waitFor(() => approver!.has('Approved"pc-j1"'), 20_000, 'the approval')
    await approver.waitFor(() => approver!.has('Connectedtopc-j1'), 25_000, 'the link on the receiving PC')

    assert.equal(await joiner.exited, 0, joiner.text())
    assert.match(joiner.out(), /Approved by "pc-h1"/)
    assert.match(joiner.out(), /Connected to pc-h1\. Agents there are now visible as name@pc-h1\./)
    assert.equal(await opener.exited, 0, opener.text())
    assert.match(opener.out(), /pc-j1 \(127\.0\.0\.1\) joined\./)
    assert.match(opener.out(), /Join window closed: 1 PC joined\./)

    await until(() => linkUp(H, 'pc-j1'), 10_000, 'H to see J up')
    await until(() => linkUp(J, 'pc-h1'), 10_000, 'J to see H up')
    const h = JSON.parse(fs.readFileSync(path.join(H.home, 'peers.json'), 'utf8')) as { peers: Array<Record<string, unknown>> }
    const j = JSON.parse(fs.readFileSync(path.join(J.home, 'peers.json'), 'utf8')) as { peers: Array<Record<string, unknown>> }
    assert.equal(h.peers[0].name, 'pc-j1')
    assert.equal(j.peers[0].name, 'pc-h1')
    assert.equal(j.peers[0].token, h.peers[0].token)
  } finally {
    opener.kill()
    joiner?.kill()
    approver?.kill()
    await stop(H)
    await stop(J)
  }
})

test('real daemons: --until-request for an agent: one line, no number, the window stays open until the user approves', async () => {
  const { H, J } = await pcs('pc-h2', 'pc-j2')
  const opener = agentctl(H, openArgs(H, '--until-request'))
  let joiner: Child | null = null
  let approver: Terminal | null = null
  try {
    const cmdLine = await waitText(opener, /agentctl join (127\.0\.0\.1:\d+)/, 'the command for the new PC')
    joiner = agentctl(J, ['join', cmdLine[1], '--timeout', '60'])
    await waitText(joiner, /Confirmation number: \d{3} \d{3}/, 'the confirmation number on the new PC')
    const sas = sasOf(joiner)

    assert.equal(await opener.exited, 0, opener.text())
    const lines = opener.out().split('\n').filter(l => l.startsWith('AgentLink: '))
    assert.equal(lines.length, 1, opener.out())
    assert.match(lines[0], /^AgentLink: "pc-j2" at "127\.0\.0\.1" asks to join this PC \(request "[0-9a-f]{4}"\)\. Tell the user\./)
    assert.ok(!/\d{6}/.test(opener.out()) && !opener.text().includes(sas), `a number reached the agent's output: ${opener.text()}`)
    const pending = await call(H, 'join_pending')
    assert.equal(pending.open, true, 'the window is still open: the user has not approved yet')
    assert.equal(pending.requests.length, 1)

    approver = terminal('approve', H, ['pair', 'approve', pending.requests[0].id])
    await approver.waitFor(() => approver!.has('6-digit number shown on the new PC:'), 20_000, 'the number prompt')
    await approver.type(sas)
    await approver.waitFor(() => approver!.has('Approved"pc-j2"'), 20_000, 'the approval')
    assert.equal(await joiner.exited, 0, joiner.text())
  } finally {
    opener.kill()
    joiner?.kill()
    approver?.kill()
    await stop(H)
    await stop(J)
  }
})

test('real daemons: a wrong number is refused with the attempts left, and the right one is accepted after it', async () => {
  const { H, J } = await pcs('pc-h3', 'pc-j3')
  let joiner: Child | null = null
  let approver: Terminal | null = null
  try {
    await call(H, 'join_open', { address: '127.0.0.1', port: H.port, ttl_s: 60 })
    joiner = agentctl(J, ['join', `127.0.0.1:${H.port}`, '--timeout', '60'])
    await waitText(joiner, /Confirmation number: \d{3} \d{3}/, 'the confirmation number')
    const sas = sasOf(joiner)
    const wrong = sas === '111111' ? '222222' : '111111'
    const req = await until(async () => (await call(H, 'join_pending')).requests[0] ?? false, 10_000, 'the request')

    approver = terminal('approve', H, ['pair', 'approve', req.id])
    await approver.waitFor(() => approver!.has('6-digit number shown on the new PC:'), 20_000, 'the number prompt')
    const mark = approver.mark()
    await approver.type(wrong)
    await approver.waitFor(() => approver!.has(/Wrongnumber\.\d+attempts?leftforthisrequest\./), 20_000, 'the wrong-number message')
    await approver.waitFor(() => approver!.hasSince(mark, /attempts?leftforthisrequest\.[\s\S]*6-digitnumbershownonthenewPC:/), 20_000, 'the prompt again')
    await approver.type(sas)
    await approver.waitFor(() => approver!.has('Approved"pc-j3"'), 20_000, 'the approval')
    assert.equal(await joiner.exited, 0, joiner.text())
  } finally {
    joiner?.kill()
    approver?.kill()
    await stop(H)
    await stop(J)
  }
})

// --- what the other commands say against the real daemon --------------------------------------------------------------------------

test('real daemons: pair pending, pair --close, and join to a PC whose window is closed or that is not there', async () => {
  const { H, J } = await pcs('pc-h4', 'pc-j4')
  let joiner: Child | null = null
  try {
    const none = agentctl(H, ['pair', 'pending'])
    assert.equal(await none.exited, 0, none.text())
    assert.match(none.out(), /Join window: closed\. Open one with: agentctl pair --open/)

    await call(H, 'join_open', { address: '127.0.0.1', port: H.port, ttl_s: 60 })
    joiner = agentctl(J, ['join', `127.0.0.1:${H.port}`, '--timeout', '30'])
    await waitText(joiner, /Confirmation number: \d{3} \d{3}/, 'the confirmation number')
    const sas = sasOf(joiner)

    const human = agentctl(H, ['pair', 'pending'])
    assert.equal(await human.exited, 0, human.text())
    assert.match(human.out(), /Join window: open, \d+ min left, 1 PC still to admit\./)
    assert.match(human.out(), /[0-9a-f]{4}\s+pc-j4\s+127\.0\.0\.1\s+\d+ s\s+pending/)
    const json = agentctl(H, ['pair', 'pending', '--json'])
    assert.equal(await json.exited, 0, json.text())
    assert.deepEqual(Object.keys(JSON.parse(json.out()).requests[0]).sort(), ['address', 'age_s', 'host', 'id', 'replaces', 'state'])
    for (const c of [human, json]) assert.ok(!c.text().includes(sas), 'the receiving side shows no number')

    const closed = agentctl(H, ['pair', '--close'])
    assert.equal(await closed.exited, 0, closed.text())
    assert.match(closed.out(), /Join window closed\. Requests that were waiting are gone\./)
    assert.notEqual(await joiner.exited, 0, 'the waiting request is dropped when the window closes')
    assert.match(joiner.err(), /Nothing was saved|expired|cancelled|failed/)

    // Closing the window also closes the LAN port (this PC has no peers), so the new PC is refused at the door, not by the window: either way
    // it must be told to run `agentctl pair --open` on that PC.
    const refused = agentctl(J, ['join', `127.0.0.1:${H.port}`, '--timeout', '30'])
    assert.equal(await refused.exited, 1, refused.text())
    assert.match(refused.err(), /Could not join: .*agentctl pair --open|not accepting join requests\. On that PC run: agentctl pair --open/)
    assert.ok(!/Confirmation number/.test(refused.out()))

    const nobody = agentctl(J, ['join', '127.0.0.1:1', '--timeout', '30'])
    assert.equal(await nobody.exited, 1, nobody.text())
    assert.match(nobody.err(), /Could not join: /)
    assert.ok(!/Confirmation number/.test(nobody.out()))
  } finally {
    joiner?.kill()
    await stop(H)
    await stop(J)
  }
})

test('real daemons: pair approve without a terminal is refused and approves nothing, even with the right number in the id place', async () => {
  const { H, J } = await pcs('pc-h5', 'pc-j5')
  let joiner: Child | null = null
  try {
    await call(H, 'join_open', { address: '127.0.0.1', port: H.port, ttl_s: 60 })
    joiner = agentctl(J, ['join', `127.0.0.1:${H.port}`, '--timeout', '30'])
    await waitText(joiner, /Confirmation number: \d{3} \d{3}/, 'the confirmation number')
    const sas = sasOf(joiner)
    const req = await until(async () => (await call(H, 'join_pending')).requests[0] ?? false, 10_000, 'the request')
    for (const args of [['pair', 'approve', req.id], ['pair', 'approve'], ['pair', 'approve', req.id, sas], ['pair', 'approve', sas]]) {
      const r = agentctl(H, args)
      assert.equal(await r.exited, 2, `${args.join(' ')}: ${r.text()}`)
    }
    const still = await call(H, 'join_pending')
    assert.equal(still.requests.length, 1, 'the request is still waiting')
    assert.equal(fs.existsSync(path.join(H.home, 'peers.json')), false, 'nothing was saved')
  } finally {
    joiner?.kill()
    await stop(H)
    await stop(J)
  }
})

// node-pty (Windows) leaves a worker of its console open after the terminal has ended, and the test runner then waits for this file
// forever: the file ends itself once its tests are done, with the exit code the tests earned.
let anyFailed = false
afterEach(t => {
  if (t.passed === false) anyFailed = true
})
after(() => {
  setTimeout(() => process.exit(anyFailed ? 1 : 0), 500)
})
