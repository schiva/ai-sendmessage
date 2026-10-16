// The join protocol (docs/JOIN.md, docs/JOIN-API.md) between real daemons on one PC. Tests of the pure functions are in join-sas.test.ts.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import type { Client } from '../client/client.ts'
import { cleanup, linkUp, makeNode, reg, rejects, send, start, stop, take, until, writePeers } from './lan-harness.ts'
import type { Node } from './lan-harness.ts'

after(() => cleanup())

const call = (n: Node, method: string, params: Record<string, unknown> = {}) => (n.client as Client).request(method, params) as Promise<any>
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Loopback test PCs: a receiving PC H and a joining PC J, each with a LAN port of its own. */
async function pcs(hostH: string, hostJ: string, env: Record<string, string> = {}) {
  const common = { AGENTLINK_JOIN_IP_INTERVAL_MS: '0', AGENTLINK_JOIN_MIN_TTL_S: '1', ...env }
  const H = await makeNode(hostH, common)
  const J = await makeNode(hostJ, common)
  await start(H)
  await start(J)
  writePeers(J, { listen: { host: '127.0.0.1', port: J.port }, peers: [] })
  await call(J, 'reload_peers')
  return { H, J }
}

const open = (H: Node, extra: Record<string, unknown> = {}) => call(H, 'join_open', { address: '127.0.0.1', port: H.port, ttl_s: 60, ...extra })
const peersFile = (n: Node) => JSON.parse(fs.readFileSync(path.join(n.home, 'peers.json'), 'utf8')) as { listen?: { host: string; port: number }; peers: Array<Record<string, unknown>> }
const hasPeersFile = (n: Node) => fs.existsSync(path.join(n.home, 'peers.json'))

async function requestOf(H: Node, hostJ: string): Promise<{ id: string; host: string; address: string; state: string; replaces: unknown }> {
  const found = await until(async () => (await call(H, 'join_pending')).requests.find((r: { host: string }) => r.host === hostJ), 5000, `a request of ${hostJ} at the receiving PC`)
  return found as { id: string; host: string; address: string; state: string; replaces: unknown }
}

// --- the normal way ------------------------------------------------------------------------------------------------

test('a new PC joins with an address and the confirmation number: both sides save each other, the link comes up and messages go both ways', async () => {
  const { H, J } = await pcs('pc-h1', 'pc-j1')
  try {
    const opened = await open(H)
    assert.equal(opened.open, true)
    assert.match(opened.command, /^agentctl join 127\.0\.0\.1:\d+$/)

    const started = await call(J, 'join_start', { address: '127.0.0.1', port: H.port })
    assert.match(started.sas, /^\d{6}$/)
    const req = await requestOf(H, 'pc-j1')
    assert.match(req.id, /^[0-9a-f]{4}$/)
    assert.equal(req.address, '127.0.0.1')
    assert.equal(req.replaces, null)
    assert.equal(hasPeersFile(H), false, 'nothing is saved before the approval')

    const approved = await call(H, 'join_approve', { id: req.id, digits: started.sas })
    assert.equal(approved.ok, true)
    assert.equal(approved.host, 'pc-j1')

    const status = await until(async () => {
      const s = await call(J, 'join_status', { request: started.request })
      return s.state === 'joined' ? s : s.state === 'waiting' ? false : assert.fail(`join ended as ${s.state}: ${s.detail}`)
    }, 8000, 'the joining side to finish')
    assert.equal(status.host, 'pc-h1')

    const h = peersFile(H)
    assert.equal(h.peers[0].name, 'pc-j1')
    assert.equal(h.peers[0].dial, false)
    const j = peersFile(J)
    assert.equal(j.peers[0].name, 'pc-h1')
    assert.equal(j.peers[0].dial, true)
    assert.equal(j.peers[0].token, h.peers[0].token, 'one token on both sides')
    assert.match(String(j.peers[0].fingerprint), /^sha256:/)

    await until(() => linkUp(H, 'pc-j1'), 10_000, 'H to see J up')
    await until(() => linkUp(J, 'pc-h1'), 10_000, 'J to see H up')
    const alice = await reg(J, 'alice')
    const bob = await reg(H, 'bob')
    assert.equal((await send(J, alice.agent, 'bob@pc-h1', 'hello after joining')).status, 'stored')
    assert.equal((await take(H, bob.agent))[0].message, 'hello after joining')

    const after = await call(H, 'join_pending')
    assert.equal(after.open, false, 'the window closed with the first approval')
    assert.equal(after.recent[0].result, 'joined')
  } finally {
    await stop(H)
    await stop(J)
  }
})

// --- helpers that speak the protocol by hand (what a careless or hostile PC could do) ----------------------------------

import https from 'node:https'
import { randomBytes } from 'node:crypto'
import { WebSocket, WebSocketServer } from 'ws'
import { joinCommit, joinSas } from '../agentd/join-sas.ts'
import { ensureTls, normalizeFingerprint } from '../agentd/tls.ts'
import { pair } from './lan-harness.ts'

interface Raw {
  ws: WebSocket
  frames: Array<Record<string, unknown>>
  closed: () => boolean
  fpH: string
  nonceJ: Buffer
  nonceH: Buffer | null
  sas: string | null
  send: (f: unknown) => void
  waitFor: (pred: (f: Record<string, unknown>) => boolean, ms?: number) => Promise<Record<string, unknown>>
}

/** Opens a connection to a receiving PC. With go: true it also sends the join frame and, on the challenge, the reveal (the honest way). */
async function raw(port: number, hostJ: string, opts: { localAddress?: string; go?: boolean; commitOf?: string } = {}): Promise<Raw> {
  const ws = new WebSocket(`wss://127.0.0.1:${port}`, { rejectUnauthorized: false, localAddress: opts.localAddress })
  const frames: Array<Record<string, unknown>> = []
  let closed = false
  ws.on('message', d => frames.push(JSON.parse(d.toString())))
  ws.on('close', () => (closed = true))
  ws.on('error', () => {})
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve())
    ws.once('error', reject)
  })
  const sock = (ws as unknown as { _socket: { getPeerCertificate: () => { fingerprint256: string } } })._socket
  const r: Raw = {
    ws,
    frames,
    closed: () => closed,
    fpH: normalizeFingerprint(sock.getPeerCertificate().fingerprint256),
    nonceJ: randomBytes(16),
    nonceH: null,
    sas: null,
    send: f => ws.send(JSON.stringify(f)),
    waitFor: async (pred, ms = 3000) => {
      const end = Date.now() + ms
      for (;;) {
        const f = frames.find(pred)
        if (f) return f
        if (Date.now() > end) assert.fail(`no frame in ${ms} ms; got ${JSON.stringify(frames)}`)
        await sleep(25)
      }
    },
  }
  if (opts.go) {
    r.send({ t: 'join', v: 1, host: hostJ, commit: joinCommit(opts.commitOf ?? hostJ, r.nonceJ) })
    const ch = await Promise.race([r.waitFor(f => f.t === 'join_challenge'), r.waitFor(f => f.t === 'error')])
    if (ch.t === 'join_challenge') {
      r.nonceH = Buffer.from(String(ch.nonce), 'hex')
      r.sas = joinSas(r.fpH, hostJ, String(ch.host), r.nonceJ, r.nonceH)
      r.send({ t: 'join_reveal', v: 1, nonce: r.nonceJ.toString('hex') })
    }
  }
  return r
}

const reasonOf = (r: Raw) => (r.frames.find(f => f.t === 'error')?.reason as string | undefined) ?? null
const different = (sas: string) => String((Number(sas) + 1) % 1_000_000).padStart(6, '0')
const reasonOfError = (e: unknown) => (e as { data?: { reason?: string } }).data?.reason

// --- confirmation number: wrong ones, the limits, the window ------------------------------------------------------------

test('wrong numbers: three per request delete it, and the right number no longer works', async () => {
  const { H, J } = await pcs('pc-h2', 'pc-j2')
  try {
    await open(H)
    const started = await call(J, 'join_start', { address: '127.0.0.1', port: H.port })
    const req = await requestOf(H, 'pc-j2')
    const bad = different(started.sas)
    const first = await rejects(call(H, 'join_approve', { id: req.id, digits: bad }), 'FORBIDDEN')
    assert.equal((first as { data?: { attempts_left?: number } }).data?.attempts_left, 2)
    assert.ok(!first.message.includes(started.sas), 'the right number is not in the error')
    await rejects(call(H, 'join_approve', { id: req.id, digits: bad }), 'FORBIDDEN')
    const third = await rejects(call(H, 'join_approve', { id: req.id, digits: bad }), 'FORBIDDEN')
    assert.equal((third as { data?: { attempts_left?: number } }).data?.attempts_left, 0)
    await rejects(call(H, 'join_approve', { id: req.id, digits: started.sas }), 'BAD_REQUEST') // deleted: even the right number is too late
    const s = await call(J, 'join_status', { request: started.request })
    assert.equal(s.state, 'failed')
    assert.equal(hasPeersFile(H), false)
    assert.equal(hasPeersFile(J) && peersFile(J).peers.length > 0, false)
  } finally {
    await stop(H)
    await stop(J)
  }
})

test('five wrong numbers in all close the window; what waits is dropped and the right number is turned away', async () => {
  const { H, J } = await pcs('pc-h3', 'pc-j3')
  const a: Raw[] = []
  try {
    await open(H)
    a.push(await raw(H.port, 'pc-a', { go: true, localAddress: '127.0.0.2' }), await raw(H.port, 'pc-b', { go: true, localAddress: '127.0.0.3' }))
    const ra = await requestOf(H, 'pc-a')
    const rb = await requestOf(H, 'pc-b')
    for (let i = 0; i < 3; i++) await rejects(call(H, 'join_approve', { id: ra.id, digits: different(a[0].sas as string) }), 'FORBIDDEN')
    await rejects(call(H, 'join_approve', { id: rb.id, digits: different(a[1].sas as string) }), 'FORBIDDEN')
    const closing = await rejects(call(H, 'join_approve', { id: rb.id, digits: different(a[1].sas as string) }), 'FORBIDDEN')
    assert.equal(reasonOfError(closing), 'window_closed')
    assert.equal((await call(H, 'join_pending')).open, false)
    await rejects(call(H, 'join_approve', { id: rb.id, digits: a[1].sas }), 'FORBIDDEN')
    await until(async () => a[1].closed(), 3000, 'the waiting socket to be closed')
    assert.equal(hasPeersFile(H), false)
  } finally {
    for (const r of a) r.ws.terminate()
    await stop(H)
    await stop(J)
  }
})

test('without a window, after it closed, and after it ran out, a join is turned away and the waiting ones are dropped', async () => {
  const { H, J } = await pcs('pc-h4', 'pc-j4')
  try {
    await rejects(call(J, 'join_start', { address: '127.0.0.1', port: H.port }), 'INTERNAL') // no window: nothing listens
    await open(H, { ttl_s: 1 })
    const waiting = await raw(H.port, 'pc-w', { go: true })
    await requestOf(H, 'pc-w')
    await sleep(1500) // the window (1 s) is over
    assert.equal((await call(H, 'join_pending')).open, false)
    await until(async () => waiting.closed(), 3000, 'the waiting request to be dropped when the window ran out')
    await assert.rejects(raw(H.port, 'pc-late', { go: true }), /ECONNREFUSED/) // the port is closed again
    assert.equal(hasPeersFile(H), false)
    await open(H)
    await call(H, 'join_close')
    assert.equal((await call(H, 'join_pending')).open, false)
  } finally {
    await stop(H)
    await stop(J)
  }
})

test('the window closes by itself after the last approval; count lets several PCs in', async () => {
  const { H, J } = await pcs('pc-h5', 'pc-j5')
  const joiners: Raw[] = []
  try {
    const o = await open(H, { count: 2 })
    assert.equal(o.count, 2)
    for (const [i, src] of ['127.0.0.2', '127.0.0.3'].entries()) {
      const j = await raw(H.port, `pc-n${i}`, { go: true, localAddress: src })
      joiners.push(j)
      const req = await requestOf(H, `pc-n${i}`)
      const approving = call(H, 'join_approve', { id: req.id, digits: j.sas })
      const joined = await j.waitFor(f => f.t === 'joined')
      assert.match(String(joined.token), /^[0-9a-f]{64}$/)
      j.send({ t: 'join_done', v: 1 })
      assert.equal((await approving).ok, true)
      assert.equal((await call(H, 'join_pending')).open, i === 0, i === 0 ? 'still open for the second PC' : 'closed after the last one')
    }
    assert.deepEqual(peersFile(H).peers.map(p => p.name).sort(), ['pc-n0', 'pc-n1'])
  } finally {
    for (const j of joiners) j.ws.terminate()
    await stop(H)
    await stop(J)
  }
})

// --- the man in the middle -----------------------------------------------------------------------------------------------------

test('a man in the middle with a certificate of its own makes the two numbers differ, and the number the new PC shows approves nothing', async () => {
  const { H, J } = await pcs('pc-h6', 'pc-j6')
  const dir = fs.mkdtempSync(path.join(H.home, 'mitm-'))
  const tls = await ensureTls(dir, 'mitm')
  const frames: Array<Record<string, unknown>> = []
  const server = https.createServer({ key: tls.key, cert: tls.cert })
  const wss = new WebSocketServer({ server })
  wss.on('connection', down => {
    const up = new WebSocket(`wss://127.0.0.1:${H.port}`, { rejectUnauthorized: false })
    const queue: string[] = []
    down.on('message', d => {
      frames.push(JSON.parse(d.toString()))
      if (up.readyState === WebSocket.OPEN) up.send(d.toString())
      else queue.push(d.toString())
    })
    up.on('open', () => queue.splice(0).forEach(m => up.send(m)))
    up.on('message', d => {
      frames.push(JSON.parse(d.toString()))
      down.send(d.toString())
    })
    down.on('close', () => up.close())
    up.on('close', () => down.close())
    up.on('error', () => {})
    down.on('error', () => {})
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const proxyPort = (server.address() as { port: number }).port
  try {
    await open(H)
    const started = await call(J, 'join_start', { address: '127.0.0.1', port: proxyPort })
    const req = await requestOf(H, 'pc-j6')
    // What H computes from its own certificate and the nonces that went through the proxy:
    const nonceJ = Buffer.from(String(frames.find(f => f.t === 'join_reveal')?.nonce), 'hex')
    const nonceH = Buffer.from(String(frames.find(f => f.t === 'join_challenge')?.nonce), 'hex')
    const fpH = String(((await call(H, 'peers')) as { fingerprint: string }).fingerprint)
    const hostSas = joinSas(fpH, 'pc-j6', 'pc-h6', nonceJ, nonceH)
    assert.notEqual(started.sas, hostSas, 'the number on the new PC is not the number the receiving PC computed')
    await rejects(call(H, 'join_approve', { id: req.id, digits: started.sas }), 'FORBIDDEN')
    assert.equal(hasPeersFile(H), false, 'no approval, nothing saved')
  } finally {
    server.close()
    wss.close()
    await stop(H)
    await stop(J)
  }
})

// --- limits: pool, budgets, intervals, bursts --------------------------------------------------------------------------

test('a full pending pool turns the newcomer away with busy and evicts nobody; one request per address', async () => {
  const { H, J } = await pcs('pc-h7', 'pc-j7', { AGENTLINK_JOIN_PENDING_MAX: '2', AGENTLINK_JOIN_GLOBAL_BURST: '50' })
  const rs: Raw[] = []
  try {
    await open(H)
    rs.push(await raw(H.port, 'pc-p1', { go: true, localAddress: '127.0.0.2' }), await raw(H.port, 'pc-p2', { go: true, localAddress: '127.0.0.3' }))
    await requestOf(H, 'pc-p1')
    await requestOf(H, 'pc-p2')
    const third = await raw(H.port, 'pc-p3', { go: true, localAddress: '127.0.0.4' })
    rs.push(third)
    await third.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(third), 'busy')
    const same = await raw(H.port, 'pc-p4', { go: true, localAddress: '127.0.0.2' })
    rs.push(same)
    await same.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(same), 'busy')
    const pend = await call(H, 'join_pending')
    assert.deepEqual(pend.requests.map((r: { host: string }) => r.host).sort(), ['pc-p1', 'pc-p2'], 'the waiting ones are still there')
    assert.equal(rs[0].closed(), false)
    assert.equal(rs[1].closed(), false)
  } finally {
    for (const r of rs) r.ws.terminate()
    await stop(H)
    await stop(J)
  }
})

test('rate limits: the window budget, the gap per address and the global burst count every session start', async () => {
  const budget = await pcs('pc-h8', 'pc-j8', { AGENTLINK_JOIN_WINDOW_BUDGET: '3', AGENTLINK_JOIN_GLOBAL_BURST: '50' })
  const gap = await pcs('pc-h9', 'pc-j9', { AGENTLINK_JOIN_IP_INTERVAL_MS: '60000', AGENTLINK_JOIN_GLOBAL_BURST: '50' })
  const burst = await pcs('pc-h10', 'pc-j10', { AGENTLINK_JOIN_GLOBAL_BURST: '2' })
  const rs: Raw[] = []
  try {
    // Budget 3: the fourth start is refused although each start ended at once (bad name), so ending fast does not reset anything.
    await open(budget.H)
    for (let i = 0; i < 3; i++) {
      const r = await raw(budget.H.port, 'x'.repeat(0) + `pc-b${i}`, { go: true, localAddress: `127.0.0.${2 + i}` })
      rs.push(r)
      r.ws.terminate()
    }
    const over = await raw(budget.H.port, 'pc-b9', { go: true, localAddress: '127.0.0.9' })
    rs.push(over)
    await over.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(over), 'rate_limited')

    // Gap of 60 s per address: the second start from the same address is refused, another address is not.
    await open(gap.H)
    const one = await raw(gap.H.port, 'pc-g1', { go: true, localAddress: '127.0.0.2' })
    rs.push(one)
    await requestOf(gap.H, 'pc-g1')
    one.ws.terminate()
    await until(async () => (await call(gap.H, 'join_pending')).requests.length === 0, 3000, 'the first request to vanish')
    const again = await raw(gap.H.port, 'pc-g2', { go: true, localAddress: '127.0.0.2' })
    rs.push(again)
    await again.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(again), 'rate_limited')
    const other = await raw(gap.H.port, 'pc-g3', { go: true, localAddress: '127.0.0.3' })
    rs.push(other)
    await requestOf(gap.H, 'pc-g3')

    // Global burst 2 within 5 s: the third start is refused whatever its address.
    await open(burst.H)
    for (let i = 0; i < 2; i++) rs.push(await raw(burst.H.port, `pc-s${i}`, { go: true, localAddress: `127.0.0.${2 + i}` }))
    const third = await raw(burst.H.port, 'pc-s2', { go: true, localAddress: '127.0.0.4' })
    rs.push(third)
    await third.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(third), 'rate_limited')
  } finally {
    for (const r of rs) r.ws.terminate()
    for (const n of [budget, gap, burst]) {
      await stop(n.H)
      await stop(n.J)
    }
  }
})

test('a flood of connections that never speak does not push out a session that is waiting, and bad reveals from elsewhere do not close the window', async () => {
  const { H, J } = await pcs('pc-h11', 'pc-j11')
  const rs: Raw[] = []
  try {
    await open(H)
    const good = await raw(H.port, 'pc-good', { go: true, localAddress: '127.0.0.2' })
    rs.push(good)
    const req = await requestOf(H, 'pc-good')
    for (let i = 0; i < 12; i++) rs.push(await raw(H.port, 'pc-mute', { localAddress: '127.0.0.3' }))
    // Others send reveals for sessions they do not have, and wrong numbers they cannot know: nothing of this counts against the window.
    for (let i = 0; i < 6; i++) {
      const bad = await raw(H.port, 'pc-bad', { localAddress: '127.0.0.5' })
      rs.push(bad)
      bad.send({ t: 'join_reveal', v: 1, nonce: '00'.repeat(16) })
    }
    await sleep(300)
    const pend = await call(H, 'join_pending')
    assert.equal(pend.open, true, 'the window is still open')
    assert.equal(pend.requests.length, 1)
    assert.equal(good.closed(), false)
    assert.equal(req.host, 'pc-good')
  } finally {
    for (const r of rs) r.ws.terminate()
    await stop(H)
    await stop(J)
  }
})

// --- protocol errors ------------------------------------------------------------------------------------------------------------

test('frames in the wrong order, a wrong commitment, bad names and bad values are refused and three errors put the address on hold', async () => {
  const { H, J } = await pcs('pc-h12', 'pc-j12', { AGENTLINK_JOIN_GLOBAL_BURST: '50' })
  const rs: Raw[] = []
  const bare = async (ip: string) => {
    const r = await raw(H.port, 'x', { localAddress: ip })
    rs.push(r)
    return r
  }
  try {
    await open(H)
    // a reveal without a join, a done without a join
    const a = await bare('127.0.0.2')
    a.send({ t: 'join_reveal', v: 1, nonce: '00'.repeat(16) })
    await a.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(a), 'bad_order')
    const b = await bare('127.0.0.3')
    b.send({ t: 'join_done', v: 1 })
    await b.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(b), 'bad_order')
    // a commitment that the reveal does not match
    const c = await raw(H.port, 'pc-c', { go: true, localAddress: '127.0.0.4', commitOf: 'someone-else' })
    rs.push(c)
    await c.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(c), 'bad_commit')
    // a reveal twice, a join twice on one socket
    const d = await raw(H.port, 'pc-d', { go: true, localAddress: '127.0.0.5' })
    rs.push(d)
    await requestOf(H, 'pc-d')
    d.send({ t: 'join_reveal', v: 1, nonce: d.nonceJ.toString('hex') })
    await d.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(d), 'bad_order')
    // bad values: not hex, wrong version, no commit
    const e = await bare('127.0.0.6')
    e.send({ t: 'join', v: 1, host: 'pc-e', commit: 'zz' })
    await e.waitFor(f => f.t === 'error')
    assert.equal(reasonOf(e), 'bad_frame')
    const f = await bare('127.0.0.7')
    f.send({ t: 'join', v: 2, host: 'pc-f', commit: joinCommit('pc-f', f.nonceJ) })
    await f.waitFor(f2 => f2.t === 'error')
    assert.equal(reasonOf(f), 'bad_frame')
    // a bad reveal value
    const g = await raw(H.port, 'pc-g', { localAddress: '127.0.0.8' })
    rs.push(g)
    g.send({ t: 'join', v: 1, host: 'pc-g', commit: joinCommit('pc-g', g.nonceJ) })
    await g.waitFor(x => x.t === 'join_challenge')
    g.send({ t: 'join_reveal', v: 1, nonce: 'not-hex' })
    await g.waitFor(x => x.t === 'error')
    assert.equal(reasonOf(g), 'bad_frame')

    // the third error from one address puts it on hold for a while (127.0.0.2 made one; two more, then it is rate limited)
    for (const [i, name] of ['pc-h1x', 'pc-h2x'].entries()) {
      const r = await raw(H.port, name, { localAddress: '127.0.0.2' })
      rs.push(r)
      r.send({ t: 'join_done', v: 1 })
      await r.waitFor(x => x.t === 'error')
      assert.equal(reasonOf(r), 'bad_order', `error ${i + 2}`)
    }
    const held = await raw(H.port, 'pc-held', { go: true, localAddress: '127.0.0.2' })
    rs.push(held)
    await held.waitFor(x => x.t === 'error')
    assert.equal(reasonOf(held), 'rate_limited')
    assert.equal((await call(H, 'join_pending')).open, true, 'protocol errors do not close the window')
  } finally {
    for (const r of rs) r.ws.terminate()
    await stop(H)
    await stop(J)
  }
})

test('names: the own name, a bad name and a name with capitals are handled; the name is normalised before it is saved', async () => {
  const { H, J } = await pcs('pc-h13', 'pc-j13', { AGENTLINK_JOIN_GLOBAL_BURST: '50' })
  const rs: Raw[] = []
  try {
    await open(H)
    for (const [i, name] of ['pc-h13', 'bad name!', '', 'a'.repeat(80)].entries()) {
      const r = await raw(H.port, 'x', { localAddress: `127.0.0.${2 + i}` })
      rs.push(r)
      r.send({ t: 'join', v: 1, host: name, commit: joinCommit('pc-h13', r.nonceJ) })
      await r.waitFor(x => x.t === 'error')
      assert.equal(reasonOf(r), 'bad_name', `name ${JSON.stringify(name).slice(0, 20)}`)
    }
    assert.equal((await call(H, 'join_pending')).requests.length, 0)
    const up = await raw(H.port, 'PC-Upper', { go: true, localAddress: '127.0.0.9', commitOf: 'pc-upper' })
    rs.push(up)
    const req = await requestOf(H, 'pc-upper')
    assert.equal(req.host, 'pc-upper')
    up.ws.terminate()
  } finally {
    for (const r of rs) r.ws.terminate()
    await stop(H)
    await stop(J)
  }
})

// --- a known PC joins again --------------------------------------------------------------------------------------------------

test('a PC that is a peer already joins again: the request shows what it replaces, the token is replaced and the old link goes', async () => {
  const { H, J } = await pcs('pc-h14', 'pc-j14')
  try {
    await pair(H, J)
    await until(() => linkUp(H, 'pc-j14'), 10_000, 'the first link')
    const before = peersFile(H).peers.find(p => p.name === 'pc-j14')
    assert.ok(before)
    await open(H)
    const started = await call(J, 'join_start', { address: '127.0.0.1', port: H.port })
    const req = await requestOf(H, 'pc-j14')
    assert.ok(req.replaces, 'the request says it replaces an existing peer')
    assert.equal((req.replaces as { host: string }).host, 'pc-j14')
    await call(H, 'join_approve', { id: req.id, digits: started.sas })
    await until(async () => (await call(J, 'join_status', { request: started.request })).state === 'joined', 8000, 'J to finish')
    const after = peersFile(H).peers.filter(p => p.name === 'pc-j14')
    assert.equal(after.length, 1, 'one entry, not two')
    assert.notEqual(after[0].token, before.token, 'the token is new')
    await until(() => linkUp(H, 'pc-j14'), 10_000, 'the new link')
  } finally {
    await stop(H)
    await stop(J)
  }
})

// --- approval that does not end well ---------------------------------------------------------------------------------------

test('when the new PC never confirms or its socket dies during approval, nothing is saved and the window stays open', async () => {
  const { H, J } = await pcs('pc-h15', 'pc-j15', { AGENTLINK_JOIN_DONE_MS: '800' })
  const rs: Raw[] = []
  try {
    await open(H)
    const silent = await raw(H.port, 'pc-silent', { go: true, localAddress: '127.0.0.2' })
    rs.push(silent)
    const req = await requestOf(H, 'pc-silent')
    const e = await rejects(call(H, 'join_approve', { id: req.id, digits: silent.sas }), 'FORBIDDEN') // no join_done
    assert.equal(reasonOfError(e), 'request_gone')
    assert.equal(hasPeersFile(H), false, 'nothing saved without join_done')
    assert.equal((await call(H, 'join_pending')).open, true)

    const dying = await raw(H.port, 'pc-dying', { go: true, localAddress: '127.0.0.3' })
    rs.push(dying)
    const req2 = await requestOf(H, 'pc-dying')
    dying.ws.terminate()
    await until(async () => (await call(H, 'join_pending')).requests.every((r: { host: string }) => r.host !== 'pc-dying'), 3000, 'the dead request to vanish')
    await rejects(call(H, 'join_approve', { id: req2.id, digits: dying.sas }), 'BAD_REQUEST')
    assert.equal(hasPeersFile(H), false)
  } finally {
    for (const r of rs) r.ws.terminate()
    await stop(H)
    await stop(J)
  }
})

test('input checks of the local API: ids and numbers are validated and the right number never shows up in pending, errors or the log', async () => {
  const { H, J } = await pcs('pc-h16', 'pc-j16')
  try {
    await open(H)
    const started = await call(J, 'join_start', { address: '127.0.0.1', port: H.port })
    const req = await requestOf(H, 'pc-j16')
    await rejects(call(H, 'join_approve', { id: 'zzzz', digits: started.sas }), 'BAD_REQUEST')
    await rejects(call(H, 'join_approve', { id: req.id, digits: '12ab56' }), 'BAD_REQUEST')
    await rejects(call(H, 'join_approve', { id: req.id, digits: '12345' }), 'BAD_REQUEST')
    await rejects(call(H, 'join_approve', { id: req.id }), 'BAD_REQUEST')
    const wrong = different(started.sas)
    const err = await rejects(call(H, 'join_approve', { id: req.id, digits: wrong }), 'FORBIDDEN')
    const dump = JSON.stringify([await call(H, 'join_pending'), err.message, (err as { data?: unknown }).data])
    const log = fs.readFileSync(path.join(H.home, 'agentd.log'), 'utf8')
    for (const text of [dump, log]) {
      assert.ok(!text.includes(started.sas), 'the number is not there')
      assert.ok(!text.includes(started.sas.replace(/^(\d{3})(\d{3})$/, '$1 $2')))
    }
    assert.match(await call(J, 'join_status', { request: started.request }).then(s => s.state), /waiting/)
    await call(J, 'join_cancel', { request: started.request })
    assert.equal((await call(J, 'join_status', { request: started.request })).state, 'cancelled')
    await rejects(call(J, 'join_start', { address: 'localhost', port: H.port }), 'BAD_REQUEST')
    await rejects(call(J, 'join_start', { address: '127.0.0.1', port: 70000 }), 'BAD_REQUEST')
  } finally {
    await stop(H)
    await stop(J)
  }
})

// --- frame size and the old way ------------------------------------------------------------------------------------------

test('a pre-auth frame over 4 KiB is not accepted, and the existing pair --code way still works next to a join window', async () => {
  const { H, J } = await pcs('pc-h17', 'pc-j17')
  try {
    await open(H)
    const big = await raw(H.port, 'x', { localAddress: '127.0.0.2' }).catch(() => null)
    assert.ok(big)
    big.send({ t: 'join', v: 1, host: 'pc-big', commit: '0'.repeat(64), pad: 'a'.repeat(5000) })
    await until(async () => big.closed(), 3000, 'the oversized frame to be refused')
    assert.equal((await call(H, 'join_pending')).requests.length, 0)
    await pair(H, J)
    await until(() => linkUp(H, 'pc-j17'), 10_000, 'a pair --code link next to the window')
  } finally {
    await stop(H)
    await stop(J)
  }
})
