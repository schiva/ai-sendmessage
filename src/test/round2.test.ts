// Round 2 of the desktop work: pair code expiry, outbox cap, ACL starter file, directory traffic, pre-auth connections.
// New tests of this branch go here (the other branch uses other files).
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import type { Client } from '../client/client.ts'
import { decodeCode } from '../agentd/pair.ts'
import { cleanup as lanCleanup, makeNode, rejects, start, status, stop } from './lan-harness.ts'

after(() => lanCleanup())

const req = (n: { client: Client | null }, method: string, params: Record<string, unknown> = {}) => (n.client as Client).request(method, params)
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// --- R3: a pairing code expires ----------------------------------------------------------------

test('a pairing code stops working when its time is up, and the port that was opened for it closes again', async () => {
  const maker = await makeNode('pc-x1', { AGENTLINK_PAIR_MIN_TTL_S: '1' })
  const joiner = await makeNode('pc-x2')
  try {
    await start(maker)
    await start(joiner)
    const started = (await req(maker, 'pair_start', { address: '127.0.0.1', port: maker.port, ttl_s: 1 })) as { code: string; expires_s: number }
    assert.equal(started.expires_s, 1, 'the short time is honoured when the minimum allows it')
    assert.equal(typeof decodeCode(started.code), 'object')
    assert.equal(((await status(maker)) as unknown as { listening: unknown }).listening !== null, true, 'the port is open while the code is valid')

    await sleep(1600)
    const after = (await req(maker, 'pair_status')) as { state: string }
    assert.equal(after.state, 'expired')
    const refused = await rejects(req(joiner, 'pair_join', { code: started.code }), 'INTERNAL')
    assert.match(refused.message, /expired or was cancelled/, 'the message says what is probably wrong')
    assert.ok(!/Firewall/.test(refused.message), 'and does not send the user to the firewall')
    assert.equal(((await status(maker)) as unknown as { listening: unknown }).listening, null, 'no peers configured: the LAN port is closed again')
  } finally {
    await stop(maker)
    await stop(joiner)
  }
})

test('without the override a code is valid for at least 10 seconds', async () => {
  const maker = await makeNode('pc-x3')
  try {
    await start(maker)
    const started = (await req(maker, 'pair_start', { address: '127.0.0.1', port: maker.port, ttl_s: 1 })) as { expires_s: number }
    assert.equal(started.expires_s, 10)
    await req(maker, 'pair_cancel')
  } finally {
    await stop(maker)
  }
})

// --- R1: a host that stays away cannot make the outbox grow without bound --------------------------

import { linkUp, pair, reg, send, take, until } from './lan-harness.ts'

async function queued(n: { client: Client | null }, peer: string): Promise<number> {
  return ((await status(n as Parameters<typeof status>[0])) as unknown as { peers: Array<{ host: string; queued: number }> }).peers.find(p => p.host === peer)?.queued ?? -1
}

test('the outbox of an unreachable host stops at its message limit, and everything waiting is delivered when it returns', async () => {
  const tx = await makeNode('pc-y1', { AGENTLINK_OUTBOX_MAX: '3' })
  const rx = await makeNode('pc-y2')
  try {
    await start(tx)
    await start(rx)
    await pair(tx, rx)
    const alice = await reg(tx, 'alice')
    const bob = await reg(rx, 'bob')
    await stop(rx) // the other host goes away
    await until(async () => !(await linkUp(tx, 'pc-y2')), 10_000, 'the link to go down')

    for (const m of ['one', 'two', 'three']) assert.equal((await send(tx, alice.agent, 'bob@pc-y2', m)).status, 'queued_remote')
    assert.equal(await queued(tx, 'pc-y2'), 3)
    const refused = await rejects(send(tx, alice.agent, 'bob@pc-y2', 'four'), 'RATE_LIMITED')
    assert.match(refused.message, /3 messages are already waiting for pc-y2/)
    assert.equal(await queued(tx, 'pc-y2'), 3, 'the refused message was not queued')

    await start(rx) // it comes back
    await until(() => linkUp(tx, 'pc-y2'), 15_000, 'the link to come back')
    const got: string[] = []
    await until(async () => {
      for (const m of await take(rx, bob.agent)) got.push(m.message)
      return got.length >= 3
    }, 15_000, 'the three waiting messages')
    assert.deepEqual([...got].sort(), ['one', 'three', 'two'])
    await until(async () => (await queued(tx, 'pc-y2')) === 0, 5000, 'the outbox to drain')
    assert.equal((await send(tx, alice.agent, 'bob@pc-y2', 'five')).status, 'stored', 'sending works again')
  } finally {
    await stop(tx)
    await stop(rx)
  }
})

test('the byte limit counts too', async () => {
  const tx = await makeNode('pc-y3', { AGENTLINK_OUTBOX_MAX_BYTES: '3000' })
  const rx = await makeNode('pc-y4')
  try {
    await start(tx)
    await start(rx)
    await pair(tx, rx)
    const alice = await reg(tx, 'alice')
    await stop(rx)
    await until(async () => !(await linkUp(tx, 'pc-y4')), 10_000, 'the link to go down')
    const big = 'x'.repeat(1500)
    assert.equal((await send(tx, alice.agent, 'bob@pc-y4', big + '1')).status, 'queued_remote')
    await rejects(send(tx, alice.agent, 'bob@pc-y4', big + '2'), 'RATE_LIMITED')
    assert.equal(await queued(tx, 'pc-y4'), 1)
  } finally {
    await stop(tx)
    await stop(rx)
  }
})

// --- R4 and R5: traffic of the peer link ---------------------------------------------------------------

import { WebSocket } from 'ws'
import { TOKEN, rawPeer, writePeers } from './lan-harness.ts'

const rawPeerConfig = (n: { port: number }) => ({ listen: { host: '127.0.0.1', port: n.port }, peers: [{ name: 'raw-host', token: TOKEN, dial: false }] })
const agentsFrames = (frames: Array<Record<string, unknown>>) => frames.filter(f => f.t === 'agents')

test('the list of agents is sent to a peer when it changes and now and then, not at every tick', async () => {
  const n = await makeNode('pc-z1', { AGENTLINK_DIRECTORY_MS: '100', AGENTLINK_DIRECTORY_KEEPALIVE_MS: '1500' })
  try {
    await start(n)
    writePeers(n, rawPeerConfig(n))
    await req(n, 'reload_peers')
    const steady = await reg(n, 'steady')
    const peer = await rawPeer(n, 'raw-host', TOKEN)
    await peer.waitFor(f => f.t === 'welcome')
    await peer.waitFor(f => f.t === 'agents')
    const base = agentsFrames(peer.frames).length

    // For 2.4 s an agent is touched every 150 ms (its last_seen moves) while nothing else changes: one keepalive at most.
    const end = Date.now() + 2400
    while (Date.now() < end) {
      await req(n, 'heartbeat', { agent: steady.agent })
      await sleep(150)
    }
    const quiet = agentsFrames(peer.frames).length - base
    assert.ok(quiet <= 2, `at 100 ms ticks that would be about 24 frames; got ${quiet}`)

    await reg(n, 'newcomer') // a real change goes out at the next tick
    await peer.waitFor(f => f.t === 'agents' && JSON.stringify(f.agents).includes('newcomer'), 1200)
    peer.ws.close()
  } finally {
    await stop(n)
  }
})

async function openIdle(port: number, count: number): Promise<WebSocket[]> {
  const sockets: WebSocket[] = []
  for (let i = 0; i < count; i++) {
    const ws = new WebSocket(`wss://127.0.0.1:${port}`, { rejectUnauthorized: false })
    ws.on('error', () => {})
    await new Promise<void>(resolve => {
      ws.once('open', () => resolve())
      ws.once('error', () => resolve())
    })
    sockets.push(ws)
  }
  return sockets
}

test('idle connections that never say who they are are limited per address, the oldest goes first, and a real peer still gets in', async () => {
  const n = await makeNode('pc-z2', { AGENTLINK_MAX_PREAUTH_PER_IP: '3' })
  let idle: WebSocket[] = []
  try {
    await start(n)
    writePeers(n, rawPeerConfig(n))
    await req(n, 'reload_peers')
    idle = await openIdle(n.port, 8)
    await sleep(400)
    const open = idle.filter(s => s.readyState === WebSocket.OPEN)
    assert.equal(open.length, 3, 'only the three newest idle connections are still open')
    assert.deepEqual(open, idle.slice(-3), 'and they are the last three that were opened')

    const peer = await rawPeer(n, 'raw-host', TOKEN) // arrives while the address is at its limit
    await peer.waitFor(f => f.t === 'welcome', 3000)
    peer.ws.close()
  } finally {
    for (const s of idle) s.terminate()
    await stop(n)
  }
})

test('the overall limit of idle connections holds too', async () => {
  const n = await makeNode('pc-z3', { AGENTLINK_MAX_PREAUTH: '4', AGENTLINK_MAX_PREAUTH_PER_IP: '100' })
  let idle: WebSocket[] = []
  try {
    await start(n)
    writePeers(n, rawPeerConfig(n))
    await req(n, 'reload_peers')
    idle = await openIdle(n.port, 7)
    await sleep(400)
    assert.equal(idle.filter(s => s.readyState === WebSocket.OPEN).length, 4)
  } finally {
    for (const s of idle) s.terminate()
    await stop(n)
  }
})

test('a peer that reconnects at once (as the dialer does after a drop) is not blocked by its own earlier attempts', async () => {
  const n = await makeNode('pc-z4', { AGENTLINK_MAX_PREAUTH_PER_IP: '2' })
  try {
    await start(n)
    writePeers(n, rawPeerConfig(n))
    await req(n, 'reload_peers')
    for (let i = 0; i < 6; i++) {
      const peer = await rawPeer(n, 'raw-host', TOKEN)
      await peer.waitFor(f => f.t === 'welcome', 3000)
      peer.ws.close()
      await sleep(30)
    }
  } finally {
    await stop(n)
  }
})

// --- R6: the daemon says in its log that it upgraded the database ----------------------------------------

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { SCHEMA_VERSION, Store } from '../agentd/store.ts'

test('Store.upgrade is set for a database that was changed by opening it, and only then', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-upgrade-'))
  try {
    const fresh = path.join(dir, 'fresh.db')
    const s1 = new Store(fresh)
    assert.equal(s1.upgrade, null, 'a new database is not an upgrade')
    s1.close()
    const s2 = new Store(fresh)
    assert.equal(s2.upgrade, null, 'opening a current database again changes nothing')
    s2.close()

    const old = path.join(dir, 'old.db') // as written before versions existed: version 0, the tables of version 1
    const db = new DatabaseSync(old)
    db.exec(`
      CREATE TABLE agents (agent TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, ref TEXT NOT NULL, kind TEXT NOT NULL, cwd TEXT, pid INTEGER, status TEXT NOT NULL, active INTEGER NOT NULL, last_seen INTEGER NOT NULL, registered_at INTEGER NOT NULL);
      CREATE TABLE messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, to_agent TEXT NOT NULL, from_addr TEXT NOT NULL, to_addr TEXT NOT NULL, kind TEXT NOT NULL, summary TEXT, message TEXT NOT NULL, ts INTEGER NOT NULL, reply_to TEXT, ttl INTEGER NOT NULL, state TEXT NOT NULL, created_ms INTEGER NOT NULL);
      CREATE TABLE outbox (id TEXT PRIMARY KEY, peer TEXT NOT NULL, frame TEXT NOT NULL, sender_agent TEXT NOT NULL, to_display TEXT NOT NULL, created_ms INTEGER NOT NULL);
      CREATE TABLE remote_idle_subs (host TEXT NOT NULL, requester_addr TEXT NOT NULL, target_agent TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (host, requester_addr, target_agent));
      CREATE TABLE idle_subs (requester TEXT NOT NULL, target TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (requester, target));
    `)
    db.close()
    const s3 = new Store(old)
    assert.deepEqual(s3.upgrade, { from: 1, to: SCHEMA_VERSION })
    s3.close()
    const s4 = new Store(old)
    assert.equal(s4.upgrade, null, 'the second start finds nothing to upgrade')
    s4.close()
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('the daemon writes the upgrade to agentd.log', async () => {
  const n = await makeNode('pc-u1')
  try {
    // A database from before versions existed, in the data folder of the node, before the daemon starts.
    const old = new DatabaseSync(path.join(n.home, 'agentd.db'))
    old.exec(`
      CREATE TABLE agents (agent TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, ref TEXT NOT NULL, kind TEXT NOT NULL, cwd TEXT, pid INTEGER, status TEXT NOT NULL, active INTEGER NOT NULL, last_seen INTEGER NOT NULL, registered_at INTEGER NOT NULL);
      CREATE TABLE messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, to_agent TEXT NOT NULL, from_addr TEXT NOT NULL, to_addr TEXT NOT NULL, kind TEXT NOT NULL, summary TEXT, message TEXT NOT NULL, ts INTEGER NOT NULL, reply_to TEXT, ttl INTEGER NOT NULL, state TEXT NOT NULL, created_ms INTEGER NOT NULL);
      CREATE TABLE outbox (id TEXT PRIMARY KEY, peer TEXT NOT NULL, frame TEXT NOT NULL, sender_agent TEXT NOT NULL, to_display TEXT NOT NULL, created_ms INTEGER NOT NULL);
      CREATE TABLE remote_idle_subs (host TEXT NOT NULL, requester_addr TEXT NOT NULL, target_agent TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (host, requester_addr, target_agent));
      CREATE TABLE idle_subs (requester TEXT NOT NULL, target TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (requester, target));
    `)
    old.close()
    await start(n)
    const log = fs.readFileSync(path.join(n.home, 'agentd.log'), 'utf8')
    assert.match(log, new RegExp(`database upgraded from schema 1 to ${SCHEMA_VERSION}`))
  } finally {
    await stop(n)
  }
})

// --- R2: agentctl acl init ---------------------------------------------------------------------------------

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { aclStarter, writeAclStarter } from '../agentd/acl-init.ts'
import { Acl, parseAcl } from '../agentd/acl.ts'

const AGENTCTL = path.join(path.resolve(fileURLToPath(new URL('../..', import.meta.url))), 'src/client/agentctl.ts')

test('the ACL starter is a valid acl.json that allows this PC and its peers and denies everyone else', () => {
  const starter = aclStarter('pc-a', ['pc-b', 'pc-c', 'pc-b', 'pc-a'])
  const parsed = parseAcl(starter, 'pc-a')
  assert.deepEqual(parsed.errors, [], 'the real parser accepts it')
  assert.equal(parsed.default, 'deny')

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-aclinit-'))
  try {
    writeAclStarter(dir, starter, false)
    const acl = new Acl(dir, 'pc-a')
    acl.load(true)
    const allowed = (from: string, to: string) => {
      const [fn, fh] = from.split('@')
      const [tn, th] = to.split('@')
      return acl.check({ name: fn, host: fh }, { name: tn, host: th }).allowed
    }
    assert.equal(allowed('alice@pc-a', 'bob@pc-a'), true, 'on this PC')
    assert.equal(allowed('alice@pc-a', 'bob@pc-b'), true, 'to a peer')
    assert.equal(allowed('bob@pc-c', 'alice@pc-a'), true, 'from a peer')
    assert.equal(allowed('bob@pc-b', 'carol@pc-c'), false, 'between two peers (this PC does not route)')
    assert.equal(allowed('eve@pc-evil', 'alice@pc-a'), false, 'a host that was not listed')
    assert.equal(allowed('alice@pc-a', 'eve@pc-evil'), false)
    assert.equal(starter.rules.length, 5, 'this PC, and two rules for each of the two peers (duplicates and itself are dropped)')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('an existing acl.json is never replaced without force, and is kept as acl.json.bak when it is', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-aclinit-'))
  try {
    fs.writeFileSync(path.join(dir, 'acl.json'), '{"default":"allow","rules":[]}')
    assert.throws(() => writeAclStarter(dir, aclStarter('pc-a', []), false), { code: 'EEXIST' })
    assert.equal(fs.readFileSync(path.join(dir, 'acl.json'), 'utf8'), '{"default":"allow","rules":[]}', 'untouched')
    const done = writeAclStarter(dir, aclStarter('pc-a', ['pc-b']), true)
    assert.equal(done.backup, path.join(dir, 'acl.json.bak'))
    assert.equal(fs.readFileSync(done.backup as string, 'utf8'), '{"default":"allow","rules":[]}')
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'acl.json'), 'utf8')).default, 'deny')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('agentctl acl init writes the starter for the hosts of peers.json, reloads it, and refuses to overwrite', async () => {
  const a = await makeNode('pc-w1')
  const b = await makeNode('pc-w2')
  try {
    await start(a)
    await start(b)
    await pair(a, b)
    const ctl = (...args: string[]) => {
      const r = spawnSync(process.execPath, ['--no-warnings', AGENTCTL, ...args], { env: { ...process.env, ...a.env, AGENTLINK_HOME: a.home, AGENTLINK_PIPE: a.pipe }, encoding: 'utf8', timeout: 60_000 })
      return { status: r.status, out: r.stdout.trim(), err: r.stderr.trim() }
    }
    const shown = ctl('acl', 'init', '--print')
    assert.equal(shown.status, 0, shown.err)
    assert.equal(JSON.parse(shown.out).default, 'deny')
    assert.equal(fs.existsSync(path.join(a.home, 'acl.json')), false, '--print writes nothing')

    const init = ctl('acl', 'init')
    assert.equal(init.status, 0, init.err)
    assert.match(init.out, /Default: deny/)
    assert.match(init.out, /pc-w2/)
    assert.equal(JSON.parse(fs.readFileSync(path.join(a.home, 'acl.json'), 'utf8')).rules.length, 3)

    assert.equal(ctl('acl', 'check', 'alice@pc-w1', 'bob@pc-w2').status, 0, 'a peer is allowed, and the daemon has the new rules')
    assert.equal(ctl('acl', 'check', 'eve@pc-evil', 'bob@pc-w1').status, 1, 'an unknown host is denied')

    const again = ctl('acl', 'init')
    assert.equal(again.status, 1)
    assert.match(again.err, /already exists/)
    assert.equal(ctl('acl', 'init', '--force').status, 0)
    assert.equal(fs.existsSync(path.join(a.home, 'acl.json.bak')), true)
  } finally {
    await stop(a)
    await stop(b)
  }
})
