// Reliability work of the desktop/reliability branch: schema versions, listener retry, retry of transient ack errors, address choice,
// directory privacy and log rotation. New tests of this branch go here (the other branch has its own file).
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { SCHEMA_VERSION, Store } from '../agentd/store.ts'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-reliability-'))
after(() => fs.rmSync(tmp, { recursive: true, force: true }))

// --- D3: schema versions -------------------------------------------------------------------------

/** The schema exactly as releases up to 0.2.3 wrote it: no version in the database. */
const LEGACY_SCHEMA = `
  CREATE TABLE agents (agent TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, ref TEXT NOT NULL, kind TEXT NOT NULL, cwd TEXT, pid INTEGER, status TEXT NOT NULL, active INTEGER NOT NULL, last_seen INTEGER NOT NULL, registered_at INTEGER NOT NULL);
  CREATE INDEX agents_name ON agents(name);
  CREATE TABLE messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, to_agent TEXT NOT NULL, from_addr TEXT NOT NULL, to_addr TEXT NOT NULL, kind TEXT NOT NULL, summary TEXT, message TEXT NOT NULL, ts INTEGER NOT NULL, reply_to TEXT, ttl INTEGER NOT NULL, state TEXT NOT NULL, created_ms INTEGER NOT NULL);
  CREATE INDEX messages_inbox ON messages(to_agent, state, seq);
  CREATE TABLE outbox (id TEXT PRIMARY KEY, peer TEXT NOT NULL, frame TEXT NOT NULL, sender_agent TEXT NOT NULL, to_display TEXT NOT NULL, created_ms INTEGER NOT NULL);
  CREATE INDEX outbox_peer ON outbox(peer, created_ms);
  CREATE TABLE remote_idle_subs (host TEXT NOT NULL, requester_addr TEXT NOT NULL, target_agent TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (host, requester_addr, target_agent));
  CREATE TABLE idle_subs (requester TEXT NOT NULL, target TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (requester, target));
`

function userVersion(file: string): number {
  const db = new DatabaseSync(file)
  try {
    return Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version)
  } finally {
    db.close()
  }
}

test('a new database gets the current schema version', () => {
  const file = path.join(tmp, 'fresh.db')
  new Store(file).close()
  assert.equal(userVersion(file), SCHEMA_VERSION)
})

test('a database from before versions existed is opened as it is, with its data, and then carries a version', () => {
  const file = path.join(tmp, 'legacy.db')
  const legacy = new DatabaseSync(file)
  legacy.exec(LEGACY_SCHEMA)
  legacy.prepare("INSERT INTO agents VALUES ('ag_1','k','alice','abc123','test',NULL,NULL,'idle',1,1,1)").run()
  legacy.prepare("INSERT INTO outbox VALUES ('out-1','pc-b','{}','ag_1','bob@pc-b',5)").run()
  assert.equal(Number((legacy.prepare('PRAGMA user_version').get() as { user_version: number }).user_version), 0)
  legacy.close()

  const store = new Store(file)
  assert.equal(store.getAgent('ag_1')?.name, 'alice', 'existing rows survive')
  assert.equal(store.getOutbox('out-1')?.peer, 'pc-b')
  assert.equal(store.getOutbox('out-1')?.attempts, 0, 'a row from before the migration starts with no attempts')
  assert.equal(store.getOutbox('out-1')?.next_try_ms, 0)
  store.close()
  assert.equal(userVersion(file), SCHEMA_VERSION)

  const again = new Store(file) // opening it a second time changes nothing
  assert.equal(again.getAgent('ag_1')?.name, 'alice')
  again.close()
})

test('a database written by a newer release is refused with a clear message and left alone', () => {
  const file = path.join(tmp, 'future.db')
  new Store(file).close()
  const db = new DatabaseSync(file)
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`)
  db.close()
  assert.throws(() => new Store(file), /newer AgentLink|schema version/)
  assert.equal(userVersion(file), SCHEMA_VERSION + 1, 'the file was not touched')
})

// --- D6: log rotation ----------------------------------------------------------------------------

import { appendLog } from '../agentd/applog.ts'

test('a log file is replaced by <file>.1 when it reaches the cap, one generation only', () => {
  const file = path.join(tmp, 'rotating.log')
  const line = 'x'.repeat(99) // 100 bytes with the newline
  for (let i = 0; i < 25; i++) appendLog(file, line, 1000) // 2500 bytes in total
  assert.ok(fs.statSync(file).size < 1000, 'the live file stays under the cap')
  assert.ok(fs.existsSync(`${file}.1`), 'the previous generation is kept')
  assert.ok(!fs.existsSync(`${file}.2`), 'but only one')
  const total = fs.readFileSync(file, 'utf8').split('\n').length - 1 + fs.readFileSync(`${file}.1`, 'utf8').split('\n').length - 1
  assert.ok(total >= 10 && total <= 25, `lines are kept, the oldest are dropped (${total})`)
})

test('appendLog never throws, even when the folder does not exist', () => {
  assert.doesNotThrow(() => appendLog(path.join(tmp, 'no-such-folder', 'x.log'), 'hello'))
})

test('a line without a newline gets one', () => {
  const file = path.join(tmp, 'plain.log')
  appendLog(file, 'one')
  appendLog(file, 'two\n')
  assert.equal(fs.readFileSync(file, 'utf8'), 'one\ntwo\n')
})

// --- D1: a LAN port that could not be opened is tried again ----------------------------------------

import net from 'node:net'
import type { Client } from '../client/client.ts'
import { TOKEN, cleanup as lanCleanup, makeNode, start, status, stop, until, writePeers } from './lan-harness.ts'

const A = await makeNode('pc-rel-a', { AGENTLINK_LISTEN_RETRY_MS: '200' })

after(async () => {
  await stop(A)
  lanCleanup()
})

const peersStatus = async () => (await status(A)) as unknown as { listening: unknown; listen_error: string | null; listen_retry_s: number | null }
const reload = async () => void (await (A.client as Client).request('reload_peers'))
const failures = () => (fs.readFileSync(path.join(A.home, 'agentd.log'), 'utf8').match(/listener .* failed/g) ?? []).length

test('a busy LAN port is opened as soon as it is free, without a reload, and a repeated failure is logged once', async () => {
  const blocker = net.createServer()
  await new Promise<void>(resolve => blocker.listen(A.port, '127.0.0.1', resolve))
  await start(A)
  writePeers(A, { listen: { host: '127.0.0.1', port: A.port }, peers: [{ name: 'pc-rel-b', token: TOKEN, dial: false }] })
  await reload()

  const before = await peersStatus()
  assert.equal(before.listening, null)
  assert.match(String(before.listen_error), /EADDRINUSE/)
  assert.equal(typeof before.listen_retry_s, 'number', 'the status says it will try again')

  await new Promise(r => setTimeout(r, 900)) // several retries at 200 ms
  assert.equal(failures(), 1, 'the same failure is written to the log once, not at every retry')

  await new Promise<void>(resolve => blocker.close(() => resolve()))
  await until(async () => (await peersStatus()).listening !== null, 5000, 'the listener to open once the port is free')
  const after = await peersStatus()
  assert.equal(after.listen_error, null)
  assert.equal(after.listen_retry_s, null, 'nothing left to retry')
})

test('removing the LAN configuration stops the retries', async () => {
  const blocker = net.createServer()
  // The listener of the previous test holds the port: close it first by emptying the configuration, then block the port again.
  writePeers(A, { peers: [] })
  await reload()
  assert.equal((await peersStatus()).listening, null)
  await new Promise<void>(resolve => blocker.listen(A.port, '127.0.0.1', resolve))
  writePeers(A, { listen: { host: '127.0.0.1', port: A.port }, peers: [{ name: 'pc-rel-b', token: TOKEN, dial: false }] })
  await reload()
  assert.equal(typeof (await peersStatus()).listen_retry_s, 'number')
  writePeers(A, { peers: [] })
  await reload()
  assert.equal((await peersStatus()).listen_retry_s, null, 'no listener wanted any more: no retry')
  await new Promise<void>(resolve => blocker.close(() => resolve()))
})

// --- D2: a passing refusal does not lose the message ---------------------------------------------

import { pair, reg, send, take } from './lan-harness.ts'

async function outboxCount(n: Awaited<ReturnType<typeof makeNode>>, peer: string): Promise<number> {
  return ((await status(n)) as unknown as { peers: Array<{ host: string; queued: number }> }).peers.find(p => p.host === peer)?.queued ?? -1
}

test('messages the other host refuses for its rate limit are sent again and arrive exactly once', async () => {
  const tx = await makeNode('pc-r1', { AGENTLINK_RETRY_BASE_MS: '100', AGENTLINK_RETRY_MAX_ATTEMPTS: '12' })
  const rx = await makeNode('pc-r2', { AGENTLINK_RATE_BURST: '1', AGENTLINK_RATE_PER_MIN: '60' }) // one message from a host per second
  try {
    await start(tx)
    await start(rx)
    await pair(tx, rx)
    const alice = await reg(tx, 'alice')
    const bob = await reg(rx, 'bob')

    const results = await Promise.all(['m1', 'm2', 'm3'].map(m => send(tx, alice.agent, 'bob@pc-r2', m)))
    for (const r of results) assert.ok(['stored', 'queued_remote'].includes(r.status), `not an error: ${r.status}`)

    const got: string[] = []
    await until(async () => {
      for (const m of await take(rx, bob.agent)) got.push(m.message)
      return got.length >= 3
    }, 20_000, 'all three messages at the receiver')
    assert.deepEqual([...got].sort(), ['m1', 'm2', 'm3'], 'each exactly once')
    await until(async () => (await outboxCount(tx, 'pc-r2')) === 0, 5000, 'the outbox to drain')
    assert.deepEqual(await take(tx, alice.agent), [], 'no delivery notice: nothing was lost')
  } finally {
    await stop(tx)
    await stop(rx)
  }
})

test('a message that keeps being refused is dropped after the attempts with a notice, not retried for ever', async () => {
  const tx = await makeNode('pc-r3', { AGENTLINK_RETRY_BASE_MS: '50', AGENTLINK_RETRY_MAX_ATTEMPTS: '3' })
  const rx = await makeNode('pc-r4', { AGENTLINK_RATE_BURST: '1', AGENTLINK_RATE_PER_MIN: '1' }) // practically no refill during the test
  try {
    await start(tx)
    await start(rx)
    await pair(tx, rx)
    const alice = await reg(tx, 'alice')
    const bob = await reg(rx, 'bob')
    await send(tx, alice.agent, 'bob@pc-r4', 'first')
    await send(tx, alice.agent, 'bob@pc-r4', 'second').catch(() => {})
    const notices: string[] = []
    await until(async () => {
      for (const m of await take(tx, alice.agent)) notices.push(m.message)
      return notices.length > 0
    }, 15_000, 'the delivery notice')
    assert.match(notices[0], /could not be delivered/)
    assert.match(notices[0], /gave up after 3 attempts/)
    assert.equal(await outboxCount(tx, 'pc-r4'), 0, 'nothing is left to retry')
    assert.deepEqual((await take(rx, bob.agent)).map(m => m.message), ['first'], 'only the accepted message arrived')
  } finally {
    await stop(tx)
    await stop(rx)
  }
})

test('a final refusal is not retried: an unknown agent is reported at once and leaves nothing behind', async () => {
  const tx = await makeNode('pc-r5', { AGENTLINK_RETRY_BASE_MS: '50' })
  const rx = await makeNode('pc-r6')
  try {
    await start(tx)
    await start(rx)
    await pair(tx, rx)
    const alice = await reg(tx, 'alice')
    await assert.rejects(send(tx, alice.agent, 'nobody@pc-r6', 'hello'), /UNKNOWN_AGENT|no agent named/)
    assert.equal(await outboxCount(tx, 'pc-r6'), 0)
  } finally {
    await stop(tx)
    await stop(rx)
  }
})
