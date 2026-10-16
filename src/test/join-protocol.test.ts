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
