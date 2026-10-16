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
