// Pairing: `agentctl pair` replaces the manual exchange of fingerprints and tokens. Verified with daemons on one PC.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import type { Client } from '../client/client.ts'
import { decodeCode, encodeCode, linkToken, pairProof } from '../agentd/pair.ts'
import { loadPeersConfig, upsertPeerFile } from '../agentd/peers-config.ts'
import { cleanup, linkUp, makeNode, reg, rejects, send, start, stop, take, until, writePeers } from './lan-harness.ts'
import type { Node } from './lan-harness.ts'

const A = await makeNode('pc-a')
const B = await makeNode('pc-b')
const C = await makeNode('pc-c')

after(async () => {
  for (const n of [A, B, C]) await stop(n)
  cleanup()
})

const req = (n: Node, method: string, params: Record<string, unknown> = {}) => (n.client as Client).request(method, params)
const startPair = async (n: Node) => (await req(n, 'pair_start', { address: '127.0.0.1', port: n.port })) as { code: string; address: string; port: number; expires_s: number }
const peersOnDisk = (n: Node) => JSON.parse(fs.readFileSync(path.join(n.home, 'peers.json'), 'utf8')) as { listen?: { host: string; port: number }; peers: Array<Record<string, unknown>> }

// --- the code and the file helpers ----------------------------------------------------------

test('a pairing code survives a round trip and damaged codes are explained', () => {
  const c = { address: '192.168.0.5', port: 7420, fingerprint: 'ab'.repeat(32), secret: 'cd'.repeat(16) }
  assert.deepEqual(decodeCode(encodeCode(c)), c)
  assert.deepEqual(decodeCode(`  ${encodeCode(c)}\n`), c, 'surrounding whitespace is fine')
  for (const bad of ['', 'hello', 'AL1-', 'AL1-!!!', encodeCode(c).slice(0, -8), 'AL2-' + encodeCode(c).slice(4)]) {
    assert.equal(typeof decodeCode(bad), 'string', `"${bad}" must be rejected`)
  }
  assert.notEqual(pairProof(c.secret, 'pc-a'), pairProof(c.secret, 'pc-b'), 'the proof is bound to the joining host')
  assert.notEqual(linkToken(c.secret), c.secret, 'the stored token is not the secret itself')
  assert.ok(linkToken(c.secret).length >= 16)
})

test('upsertPeerFile keeps other peers and unknown fields, and does not override a chosen listen address', () => {
  const home = path.join(A.home, 'upsert-test')
  fs.mkdirSync(home, { recursive: true })
  fs.writeFileSync(path.join(home, 'peers.json'), JSON.stringify({ note: 'mine', listen: { host: '10.0.0.5', port: 9000 }, peers: [{ name: 'x', token: 't'.repeat(20), dial: false }] }))
  upsertPeerFile(home, { name: 'y', token: 'u'.repeat(20), dial: false }, { host: '10.0.0.6', port: 7420 })
  upsertPeerFile(home, { name: 'x', token: 'v'.repeat(20), dial: false })
  const f = JSON.parse(fs.readFileSync(path.join(home, 'peers.json'), 'utf8'))
  assert.equal(f.note, 'mine')
  assert.deepEqual(f.listen, { host: '10.0.0.5', port: 9000 })
  assert.deepEqual(f.peers.map((p: { name: string }) => p.name), ['x', 'y'])
  assert.equal(f.peers[0].token, 'v'.repeat(20), 'a peer that is already listed is replaced, not duplicated')

  fs.writeFileSync(path.join(home, 'peers.json'), '{ not json')
  assert.throws(() => upsertPeerFile(home, { name: 'z', token: 'w'.repeat(20) }), /not valid JSON/)
  assert.equal(fs.readFileSync(path.join(home, 'peers.json'), 'utf8'), '{ not json', 'a broken file is left alone')
})

// --- pairing two daemons -----------------------------------------------------------------------

test('hosts start; B only has a loopback listen port of its own (so the test never uses 7420)', async () => {
  await start(A)
  await start(B)
  await start(C)
  writePeers(B, { listen: { host: '127.0.0.1', port: B.port }, peers: [] })
  writePeers(C, { listen: { host: '127.0.0.1', port: C.port }, peers: [] })
  await req(B, 'reload_peers')
  await req(C, 'reload_peers')
  const s = (await req(A, 'peers')) as { listening: unknown }
  assert.equal(s.listening, null, 'A listens on no LAN port before pairing')
})

test('pair: A makes a code, B joins with it, both are connected and can exchange messages', async () => {
  const code = await startPair(A)
  assert.equal(((await req(A, 'pair_status')) as { state: string }).state, 'waiting')
  const joined = (await req(B, 'pair_join', { code: code.code })) as { host: string }
  assert.equal(joined.host, 'pc-a')

  await until(() => linkUp(A, 'pc-b'), 10_000, 'A to see B up')
  await until(() => linkUp(B, 'pc-a'), 10_000, 'B to see A up')
  assert.equal(((await req(A, 'pair_status')) as { state: string; host: string }).host, 'pc-b')

  const a = peersOnDisk(A)
  assert.deepEqual(a.listen, { host: '127.0.0.1', port: A.port }, 'A keeps listening on the address it advertised')
  assert.equal(a.peers[0].name, 'pc-b')
  assert.equal(a.peers[0].dial, false, 'A only accepts; B dials')
  const b = peersOnDisk(B)
  assert.equal(b.peers[0].name, 'pc-a')
  assert.equal(b.peers[0].address, '127.0.0.1')
  assert.match(String(b.peers[0].fingerprint), /^sha256:/)
  assert.equal(loadPeersConfig(B.home, 'pc-b').errors.length, 0)
  assert.equal(a.peers[0].token, b.peers[0].token)

  const alice = await reg(A, 'alice')
  const bob = await reg(B, 'bob')
  assert.equal((await send(A, alice.agent, 'bob@pc-b', 'hello through pairing')).status, 'stored')
  assert.equal((await take(B, bob.agent))[0].message, 'hello through pairing')
})

test('a code works once: a third PC cannot reuse it', async () => {
  const code = await startPair(A)
  await req(B, 'pair_join', { code: code.code }) // B re-pairs; it is already known, so this just replaces the entry
  await rejects(req(C, 'pair_join', { code: code.code }), 'FORBIDDEN')
  assert.equal(peersOnDisk(A).peers.some(p => p.name === 'pc-c'), false)
})

test('a wrong secret is refused and a later correct attempt still works; peers.json collects both PCs', async () => {
  const code = await startPair(A)
  const parsed = decodeCode(code.code)
  assert.equal(typeof parsed, 'object')
  const wrong = encodeCode({ ...(parsed as object), secret: '0'.repeat(32) } as Parameters<typeof encodeCode>[0])
  await rejects(req(C, 'pair_join', { code: wrong }), 'FORBIDDEN')
  await req(C, 'pair_join', { code: code.code })
  await until(() => linkUp(A, 'pc-c'), 10_000, 'A to see C up')
  assert.deepEqual(peersOnDisk(A).peers.map(p => p.name).sort(), ['pc-b', 'pc-c'])
})

test('a code whose fingerprint does not match the answering PC is refused before anything is sent', async () => {
  const code = await startPair(A)
  const parsed = decodeCode(code.code) as Parameters<typeof encodeCode>[0]
  const forged = encodeCode({ ...parsed, fingerprint: 'ee'.repeat(32) })
  await rejects(req(B, 'pair_join', { code: forged }), 'FORBIDDEN')
  assert.equal(((await req(A, 'pair_status')) as { state: string }).state, 'waiting', 'the real host never saw an attempt')
  await req(A, 'pair_cancel')
})

test('five wrong attempts close the pairing window, and cancel does too', async () => {
  const code = await startPair(A)
  const parsed = decodeCode(code.code) as Parameters<typeof encodeCode>[0]
  const wrong = encodeCode({ ...parsed, secret: '1'.repeat(32) })
  for (let i = 0; i < 5; i++) await rejects(req(C, 'pair_join', { code: wrong }), 'FORBIDDEN')
  const s = (await req(A, 'pair_status')) as { state: string; detail: string }
  assert.equal(s.state, 'failed')
  await rejects(req(C, 'pair_join', { code: code.code }), 'FORBIDDEN')

  const second = await startPair(A)
  await req(A, 'pair_cancel')
  assert.equal(((await req(A, 'pair_status')) as { state: string }).state, 'cancelled')
  await rejects(req(C, 'pair_join', { code: second.code }), 'FORBIDDEN')
})

test('bad input is reported, not crashed on', async () => {
  await rejects(req(B, 'pair_join', { code: 'nonsense' }), 'BAD_REQUEST')
  await rejects(req(B, 'pair_join', {}), 'BAD_REQUEST')
  const own = await startPair(A)
  await rejects(req(A, 'pair_join', { code: own.code }), 'BAD_REQUEST')
  await req(A, 'pair_cancel')
  await rejects(req(A, 'pair_start', { port: 70000 }), 'BAD_REQUEST')
})
