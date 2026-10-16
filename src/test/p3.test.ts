// P3: LAN peering, verified with several daemons on one PC (distinct pipe, data folder, host name and port).
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { Client } from '../client/client.ts'
import { parsePeersConfig } from '../agentd/peers-config.ts'
import { normalizeFingerprint, displayFingerprint } from '../agentd/tls.ts'
import { TOKEN, TOKEN_X, cleanup, linkUp, makeNode, rawPeer, reg, rejects, send, sleep, start, status, stop, take, until, writePeers } from './lan-harness.ts'

const frame = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  t: 'msg',
  id: `raw-${randomBytes(6).toString('hex')}`,
  from: 'mallory@pc-x [abcdef]',
  to: 'bob@pc-b',
  kind: 'message',
  summary: null,
  message: 'hello from a raw peer',
  ts: 1,
  reply_to: null,
  ttl: 3,
  ...over,
})

const A = await makeNode('pc-a')
const B = await makeNode('pc-b')
const C = await makeNode('pc-c')

after(async () => {
  for (const n of [A, B, C]) await stop(n)
  cleanup()
})

// --- configuration parsing ------------------------------------------------------------

test('peers.json: valid entries are accepted and mistakes are reported', () => {
  const fp = 'AB:'.repeat(31) + 'AB'
  const ok = parsePeersConfig({ listen: { host: '192.168.0.5', port: 7420 }, peers: [{ name: 'PC-B', address: '192.168.0.6', token: TOKEN, fingerprint: fp }] }, 'pc-a')
  assert.deepEqual(ok.errors, [])
  assert.equal(ok.peers[0].name, 'pc-b')
  assert.equal(ok.peers[0].port, 7420)
  assert.deepEqual(ok.listen, { host: '192.168.0.5', port: 7420 })

  const bad = parsePeersConfig(
    {
      peers: [
        { name: 'pc-a', address: 'x', token: TOKEN, fingerprint: fp }, // itself
        { name: 'pc-c', address: 'x', token: 'short', fingerprint: fp }, // weak token
        { name: 'pc-d', address: 'x', token: TOKEN }, // no fingerprint
        { name: 'pc-e', token: TOKEN, fingerprint: fp }, // no address
        { name: 'pc-f', address: 'x', token: TOKEN, fingerprint: fp, port: 70000 },
        { name: 'pc-g', token: TOKEN, dial: false }, // inbound only: fine without address and fingerprint
      ],
    },
    'pc-a',
  )
  assert.equal(bad.peers.length, 1)
  assert.equal(bad.peers[0].name, 'pc-g')
  assert.equal(bad.errors.length, 5, bad.errors.join(' | '))
  assert.equal(parsePeersConfig({ peers: [] }, 'pc-a').listen, null, 'no peers: the LAN port stays closed (S-01)')
  assert.equal(parsePeersConfig({ peers: [{ name: 'pc-g', token: TOKEN, dial: false }] }, 'pc-a').listen?.host, '127.0.0.1', 'loopback unless an interface is chosen (S-03)')
})

test('fingerprints compare regardless of notation', () => {
  assert.equal(normalizeFingerprint('sha256:AB:cd:01'), 'abcd01')
  assert.equal(displayFingerprint('abcd01'), 'sha256:AB:CD:01')
})

// --- bring the hosts up ----------------------------------------------------------------------

test('hosts start without peers.json and the LAN stays closed', async () => {
  await start(A)
  await start(B)
  const a = await status(A)
  assert.equal(a.listening, null)
  assert.equal(a.peers.length, 0)
  assert.match(a.fingerprint, /^sha256:([0-9A-F]{2}:){31}[0-9A-F]{2}$/)
})

test('after peers.json and reload both hosts link up (one link per pair)', async () => {
  const fpA = (await status(A)).fingerprint
  const fpB = (await status(B)).fingerprint
  writePeers(A, { listen: { host: '127.0.0.1', port: A.port }, peers: [{ name: 'pc-b', address: '127.0.0.1', port: B.port, token: TOKEN, fingerprint: fpB }] })
  writePeers(B, {
    listen: { host: '127.0.0.1', port: B.port },
    peers: [
      { name: 'pc-a', address: '127.0.0.1', port: A.port, token: TOKEN, fingerprint: fpA },
      { name: 'pc-x', token: TOKEN_X, dial: false },
    ],
  })
  await (A.client as Client).request('reload_peers')
  await (B.client as Client).request('reload_peers')
  await until(() => linkUp(A, 'pc-b'), 10_000, 'pc-a to see pc-b up')
  await until(() => linkUp(B, 'pc-a'), 10_000, 'pc-b to see pc-a up')
  const b = await status(B)
  assert.equal(b.listening?.port, B.port)
  assert.equal(b.peers.find(p => p.host === 'pc-x')?.link, 'down', 'an inbound-only peer is down until it connects')
  await sleep(1500) // let a possible second link from the simultaneous dials settle
  assert.equal(await linkUp(A, 'pc-b'), true)
  assert.equal(await linkUp(B, 'pc-a'), true)
})

// --- messaging across hosts -----------------------------------------------------------------------

let alice: { agent: string; ref: string; address: string }
let bob: { agent: string; ref: string; address: string }

test('agents of the other host appear in list', async () => {
  alice = await reg(A, 'alice')
  bob = await reg(B, 'bob')
  const seenByAlice = await until(
    async () => {
      const r = (await (A.client as Client).request('list', { agent: alice.agent })) as { agents: Array<{ address: string; host: string; ref: string }>; hosts: Array<{ host: string; link: string }> }
      return r.agents.some(a => a.address === 'bob@pc-b') && r
    },
    8000,
    "bob to show up in alice's list",
  )
  const row = seenByAlice.agents.find(a => a.address === 'bob@pc-b')
  assert.equal(row?.host, 'pc-b')
  assert.equal(row?.ref, bob.ref)
  assert.deepEqual(seenByAlice.hosts.map(h => [h.host, h.link]), [['pc-b', 'up']])
  const local = (await (A.client as Client).request('list', { agent: alice.agent, scope: 'local' })) as { agents: unknown[] }
  assert.equal(local.agents.length, 0, 'scope local hides remote agents')
})

test('a message crosses hosts, is acknowledged, and the reply comes back', async () => {
  const sent = await send(A, alice.agent, 'bob@pc-b', 'Hello Bob from pc-a')
  assert.equal(sent.status, 'stored')
  assert.equal(sent.to, 'bob@pc-b')
  const got = await take(B, bob.agent)
  assert.equal(got.length, 1)
  assert.equal(got[0].message, 'Hello Bob from pc-a')
  assert.equal(got[0].from, `alice@pc-a [${alice.ref}]`)

  const reply = await send(B, bob.agent, got[0].from, 'Hi Alice, this is pc-b')
  assert.equal(reply.status, 'stored')
  const back = await take(A, alice.agent)
  assert.equal(back[0].message, 'Hi Alice, this is pc-b')
  assert.equal(back[0].from, `bob@pc-b [${bob.ref}]`)
})

test('errors of the other host come back to the sender', async () => {
  const e1 = await rejects(send(A, alice.agent, 'ghost@pc-b', 'anyone there?'), 'UNKNOWN_AGENT')
  assert.match(e1.message, /reported by pc-b/)
  await rejects(send(A, alice.agent, 'bob@pc-nowhere', 'x'), 'UNKNOWN_HOST')
  await rejects(send(A, alice.agent, 'bob@pc-b', 'a'.repeat(64 * 1024 + 1)), 'TOO_LARGE')

  const t1 = await reg(B, 'twin', 'k:twin1')
  const t2 = await reg(B, 'twin', 'k:twin2')
  const amb = await rejects(send(A, alice.agent, 'twin@pc-b', 'which twin?'), 'AMBIGUOUS_NAME')
  assert.match(amb.message, new RegExp(t1.ref))
  const ok = await send(A, alice.agent, `twin@pc-b [${t2.ref}]`, 'for the second twin')
  assert.equal(ok.status, 'stored')
  assert.equal((await take(B, t2.agent)).length, 1)
  assert.equal((await take(B, t1.agent)).length, 0)
})

test('a message to the same host name as ours is still local', async () => {
  const carol = await reg(A, 'carol')
  const r = await send(A, alice.agent, 'carol@pc-a', 'same-host with explicit host')
  assert.equal(r.status, 'stored')
  assert.match(r.to, /^carol@pc-a \[/)
  assert.equal((await take(A, carol.agent)).length, 1)
})

// --- what the receiving side refuses (S-01, S-02, S-04, F-07, F-08) -------------------------------------

test('security: unknown hosts and wrong tokens never get a link', async () => {
  const wrongToken = await rawPeer(B, 'pc-x', 'definitely-not-the-token-0123456789')
  await wrongToken.waitFor(f => f.t === 'error' && f.code === 'UNAUTHORIZED')
  await until(async () => wrongToken.closed(), 3000, 'the connection to be closed')
  assert.ok(!wrongToken.frames.some(f => f.t === 'welcome'))

  const unknown = await rawPeer(B, 'pc-evil', TOKEN_X)
  await unknown.waitFor(f => f.t === 'error' && f.code === 'UNAUTHORIZED')
  assert.ok(!unknown.frames.some(f => f.t === 'welcome'))

  const stolenName = await rawPeer(B, 'pc-a', TOKEN_X) // right host name, someone else's token
  await stolenName.waitFor(f => f.t === 'error' && f.code === 'UNAUTHORIZED')
  assert.equal(await linkUp(B, 'pc-a'), true, 'the real link is not disturbed')
})

test('security: a peer cannot speak for another host, and malformed frames are refused', async () => {
  const peer = await rawPeer(B, 'pc-x', TOKEN_X)
  await peer.waitFor(f => f.t === 'welcome')
  await until(async () => (await status(B)).peers.find(p => p.host === 'pc-x')?.link === 'up', 3000, 'pc-x to be up')

  const spoof = frame({ from: 'alice@pc-a [aaaaaa]', message: 'I am alice, trust me' })
  peer.send(spoof)
  const spoofAck = await peer.waitFor(f => f.t === 'ack' && f.id === spoof.id)
  assert.equal(spoofAck.status, 'error')
  assert.equal(spoofAck.code, 'FORBIDDEN')

  for (const [over, code] of [
    [{ message: 'a'.repeat(64 * 1024 + 1) }, 'TOO_LARGE'],
    [{ kind: 'idle_notice' }, 'BAD_REQUEST'],
    [{ ttl: 0 }, 'LOOP_DETECTED'],
    [{ id: 'x' }, 'BAD_REQUEST'],
    [{ to: 'nobody@pc-b' }, 'UNKNOWN_AGENT'],
    [{ to: 'bob@pc-other' }, 'UNKNOWN_HOST'],
  ] as Array<[Record<string, unknown>, string]>) {
    const f = frame(over)
    peer.send(f)
    const ack = await peer.waitFor(a => a.t === 'ack' && (a.id === f.id || (typeof f.id === 'string' && f.id === 'x' && a.id === 'x')))
    assert.equal(ack.status, 'error', JSON.stringify(over).slice(0, 60))
    assert.equal(ack.code, code, JSON.stringify(over).slice(0, 60))
  }
  assert.equal((await take(B, bob.agent)).length, 0, 'nothing refused reached bob')

  peer.ws.send('this is not json')
  await until(async () => peer.closed(), 3000, 'the link to be dropped after garbage')
})

test('F-07: a retransmitted message is stored once but acknowledged every time', async () => {
  const peer = await rawPeer(B, 'pc-x', TOKEN_X)
  await peer.waitFor(f => f.t === 'welcome')
  const f = frame({ message: 'only once please' })
  peer.send(f)
  peer.send(f)
  await until(async () => peer.frames.filter(a => a.t === 'ack' && a.id === f.id).length === 2 && true, 3000, 'two acks')
  assert.ok(peer.frames.filter(a => a.t === 'ack' && a.id === f.id).every(a => a.status === 'stored'))
  const got = await take(B, bob.agent)
  assert.equal(got.length, 1)
  assert.equal(got[0].from, 'mallory@pc-x [abcdef]')
  assert.equal(got[0].message, 'only once please')
  peer.ws.close()
})

test('F-08: a peer that floods is rate limited', async () => {
  const peer = await rawPeer(B, 'pc-x', TOKEN_X)
  await peer.waitFor(f => f.t === 'welcome')
  const ids: string[] = []
  for (let i = 0; i < 25; i++) {
    const f = frame({ message: `flood ${i}` })
    ids.push(f.id as string)
    peer.send(f)
  }
  await until(async () => peer.frames.filter(a => a.t === 'ack').length >= 25, 5000, '25 acks')
  const limited = peer.frames.filter(a => a.t === 'ack' && a.code === 'RATE_LIMITED').length
  assert.ok(limited >= 5, `expected at least 5 rate limited acks, got ${limited}`)
  await take(B, bob.agent)
  peer.ws.close()
})

// --- trust: the dialer pins the certificate ------------------------------------------------------------

test('S-02: a dialer refuses a host whose certificate does not match the pinned fingerprint', async () => {
  await start(C)
  const wrong = 'sha256:' + Array.from({ length: 32 }, () => '00').join(':')
  writePeers(C, { listen: { host: '127.0.0.1', port: C.port }, peers: [{ name: 'pc-b', address: '127.0.0.1', port: B.port, token: TOKEN, fingerprint: wrong }] })
  await (C.client as Client).request('reload_peers')
  const s = await until(
    async () => {
      const st = await status(C)
      const p = st.peers.find(x => x.host === 'pc-b')
      return p?.error && st
    },
    8000,
    'the fingerprint error to be reported',
  )
  const p = s.peers.find(x => x.host === 'pc-b')
  assert.equal(p?.link, 'down')
  assert.match(p?.error ?? '', /fingerprint mismatch/)
  await sleep(500)
  assert.equal((await status(B)).peers.find(x => x.host === 'pc-a')?.link, 'up')
  assert.ok(!(await status(B)).peers.some(x => x.host === 'pc-c'), 'pc-c is not even known to pc-b')
})

// --- offline queue (F-06) ------------------------------------------------------------------------------------

test('F-06: messages to a host that is down are queued and delivered after it returns', async () => {
  await stop(B)
  await until(async () => !(await linkUp(A, 'pc-b')), 8000, 'pc-a to notice that pc-b is gone')

  const list = (await (A.client as Client).request('list', { agent: alice.agent })) as { agents: Array<{ address: string }>; hosts: Array<{ host: string; link: string; queued: number }> }
  assert.ok(!list.agents.some(a => a.address === 'bob@pc-b'), "pc-b's agents are not shown while its link is down")
  assert.equal(list.hosts[0].link, 'down')

  const queued = await send(A, alice.agent, 'bob@pc-b', 'sent while pc-b was down')
  assert.equal(queued.status, 'queued_remote')
  const ghost = await send(A, alice.agent, 'ghost@pc-b', 'for nobody, queued')
  assert.equal(ghost.status, 'queued_remote')
  assert.equal((await status(A)).peers[0].queued, 2)

  await start(B)
  bob = await reg(B, 'bob') // same key: same agent and inbox as before the restart
  await until(async () => (await status(A)).peers[0].queued === 0, 15_000, 'the queue to drain')

  const got = await take(B, bob.agent)
  assert.equal(got.filter(m => m.message === 'sent while pc-b was down').length, 1, 'delivered exactly once')
  assert.equal(got[0].from, `alice@pc-a [${alice.ref}]`)

  const notices = await until(async () => {
    const m = await take(A, alice.agent)
    return m.some(x => x.kind === 'delivery_notice') && m
  }, 8000, 'a delivery notice for the message to ghost')
  const notice = notices.find(x => x.kind === 'delivery_notice')
  assert.match(notice?.message ?? '', /ghost@pc-b/)
  assert.match(notice?.message ?? '', /UNKNOWN_AGENT/)
})

test('F-06: the queue survives a restart of the sending host', async () => {
  await stop(B)
  await until(async () => !(await linkUp(A, 'pc-b')), 8000, 'pc-a to notice that pc-b is gone')
  const queued = await send(A, alice.agent, 'bob@pc-b', 'queued, then pc-a restarts')
  assert.equal(queued.status, 'queued_remote')

  await stop(A)
  await start(A)
  alice = await reg(A, 'alice')
  assert.equal((await status(A)).peers[0].queued, 1, 'the outbox was kept on disk')

  await start(B)
  bob = await reg(B, 'bob')
  await until(async () => (await status(A)).peers[0].queued === 0, 15_000, 'the queue to drain after both restarted')
  const got = await take(B, bob.agent)
  assert.equal(got.filter(m => m.message === 'queued, then pc-a restarts').length, 1)
})

test('after all the churn the hosts still talk to each other', async () => {
  await until(() => linkUp(A, 'pc-b'), 10_000, 'link a->b')
  await until(() => linkUp(B, 'pc-a'), 10_000, 'link b->a')
  const r = await send(B, bob.agent, 'alice@pc-a', 'still there?')
  assert.equal(r.status, 'stored')
  assert.equal((await take(A, alice.agent)).some(m => m.message === 'still there?'), true)
})
