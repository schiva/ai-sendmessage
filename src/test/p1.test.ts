import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import net from 'node:net'
import { Client, ApiCallError } from '../client/client.ts'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-p1-'))
process.env.AGENTLINK_HOME = tmp
process.env.AGENTLINK_PIPE = `\\\\.\\pipe\\agentlink-test-${randomBytes(4).toString('hex')}`
process.env.AGENTLINK_HOST = 'pc-test'
process.env.AGENTLINK_LEASE_MS = '1500'
process.env.AGENTLINK_SWEEP_MS = '100'
process.env.AGENTLINK_DUP_WINDOW_MS = '400'

const clients: Client[] = []
async function connect(): Promise<Client> {
  const c = await Client.connect()
  clients.push(c)
  return c
}

async function reg(c: Client, name: string, key = `k:${name}:${randomBytes(3).toString('hex')}`) {
  return (await c.request('register', { name, kind: 'test', key })) as { agent: string; address: string; ref: string; resumed: boolean }
}

async function rejects(p: Promise<unknown>, code: string): Promise<ApiCallError> {
  try {
    await p
  } catch (e) {
    assert.ok(e instanceof ApiCallError, `expected ApiCallError, got ${String(e)}`)
    assert.equal(e.code, code, `expected ${code}, got ${e.code}: ${e.message}`)
    return e
  }
  assert.fail(`expected ${code}, but the call succeeded`)
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

let main: Client

before(async () => {
  main = await connect()
})

after(async () => {
  try {
    const c = await Client.connect({ autostart: false })
    await c.request('shutdown')
  } catch {
    // already stopped
  }
  for (const c of clients) c.close()
  await sleep(300)
  fs.rmSync(tmp, { recursive: true, force: true })
})

test('hello reports host, lease and protocol', () => {
  assert.equal(main.hello.host, 'pc-test')
  assert.equal(main.hello.lease_ms, 1500)
  assert.equal(main.hello.protocol, 1)
})

test('wrong token is rejected and the connection is closed', async () => {
  const pipe = process.env.AGENTLINK_PIPE as string
  const reply = await new Promise<string>((resolve, reject) => {
    const s = net.connect(pipe, () => s.write(JSON.stringify({ id: 1, method: 'hello', params: { v: 1, token: 'nope' } }) + '\n'))
    let got = ''
    s.on('data', d => (got += d.toString()))
    s.on('close', () => resolve(got))
    s.on('error', reject)
  })
  assert.match(reply, /UNAUTHORIZED/)
})

test('methods before hello are rejected', async () => {
  const pipe = process.env.AGENTLINK_PIPE as string
  const reply = await new Promise<string>((resolve, reject) => {
    const s = net.connect(pipe, () => s.write(JSON.stringify({ id: 1, method: 'list', params: {} }) + '\n'))
    let got = ''
    s.on('data', d => (got += d.toString()))
    s.on('close', () => resolve(got))
    s.on('error', reject)
  })
  assert.match(reply, /UNAUTHORIZED/)
})

test('register validates names and is idempotent per key', async () => {
  await rejects(main.request('register', { name: 'bad name' }), 'BAD_REQUEST')
  await rejects(main.request('register', { name: 'a@b' }), 'BAD_REQUEST')
  const a = await reg(main, 'idem', 'key-idem')
  const b = await reg(main, 'idem', 'key-idem')
  assert.equal(a.agent, b.agent)
  assert.equal(a.ref, b.ref)
  assert.equal(a.resumed, false)
  assert.equal(b.resumed, true)
  assert.equal(a.address, 'idem@pc-test')
})

test('re-registering a live agent keeps its busy status', async () => {
  const a = await reg(main, 'stays-busy', 'key-stays-busy')
  await main.request('heartbeat', { agent: a.agent, status: 'busy' })
  await reg(main, 'stays-busy', 'key-stays-busy')
  const viewer = await reg(main, 'viewer-busy')
  const list = (await main.request('list', { agent: viewer.agent })) as { agents: Array<{ address: string; status: string }> }
  assert.equal(list.agents.find(x => x.address === 'stays-busy@pc-test')?.status, 'busy')
})

test('send, inbox take and ack move a message through its states', async () => {
  const alice = await reg(main, 'alice')
  const bob = await reg(main, 'bob')
  const sent = (await main.request('send', { agent: alice.agent, to: 'bob', message: 'hello bob', summary: 'greeting' })) as { id: string; status: string; to: string }
  assert.equal(sent.status, 'stored')
  assert.equal(sent.to, `bob@pc-test [${bob.ref}]`)

  const hb = (await main.request('heartbeat', { agent: bob.agent })) as { unread: number }
  assert.equal(hb.unread, 1)

  const peek = (await main.request('inbox', { agent: bob.agent, mode: 'peek' })) as { messages: Array<{ state: string }> }
  assert.equal(peek.messages.length, 1)
  assert.equal(peek.messages[0].state, 'new')

  const take = (await main.request('inbox', { agent: bob.agent })) as {
    messages: Array<{ id: string; from: string; message: string; summary: string; state: string }>
    remaining: number
  }
  assert.equal(take.messages.length, 1)
  assert.equal(take.messages[0].message, 'hello bob')
  assert.equal(take.messages[0].summary, 'greeting')
  assert.equal(take.messages[0].from, `alice@pc-test [${alice.ref}]`)
  assert.equal(take.messages[0].state, 'delivered')
  assert.equal(take.remaining, 0)

  const again = (await main.request('inbox', { agent: bob.agent })) as { messages: unknown[] }
  assert.equal(again.messages.length, 0)

  const ack = (await main.request('ack', { agent: bob.agent, ids: [sent.id, 'unknown-id'] })) as { acked: number }
  assert.equal(ack.acked, 1)
  const acked = (await main.request('inbox', { agent: bob.agent, mode: 'peek', state: 'acked' })) as { messages: Array<{ state: string }> }
  assert.equal(acked.messages[0].state, 'acked')
})

test('a reply addressed with the copied "from" reaches the sender', async () => {
  const carol = await reg(main, 'carol')
  const dave = await reg(main, 'dave')
  await main.request('send', { agent: carol.agent, to: 'dave', message: 'ping' })
  const got = (await main.request('inbox', { agent: dave.agent })) as { messages: Array<{ from: string }> }
  await main.request('send', { agent: dave.agent, to: got.messages[0].from, message: 'pong' })
  const back = (await main.request('inbox', { agent: carol.agent })) as { messages: Array<{ message: string }> }
  assert.equal(back.messages[0].message, 'pong')
})

test('list shows other agents with status and unread counts', async () => {
  const eve = await reg(main, 'eve')
  const frank = await reg(main, 'frank')
  await main.request('heartbeat', { agent: frank.agent, status: 'busy' })
  await main.request('send', { agent: eve.agent, to: 'frank', message: 'x' })
  const r = (await main.request('list', { agent: eve.agent })) as {
    self: string
    agents: Array<{ address: string; status: string; unread: number }>
  }
  assert.equal(r.self, `eve@pc-test [${eve.ref}]`)
  assert.ok(!r.agents.some(a => a.address === 'eve@pc-test'))
  const f = r.agents.find(a => a.address === 'frank@pc-test')
  assert.ok(f)
  assert.equal(f.status, 'busy')
  assert.equal(f.unread, 1)
})

test('same name needs a ref; a live agent beats an offline one', async () => {
  const sender = await reg(main, 'sender1')
  const w1 = await reg(main, 'worker')
  const w2 = await reg(main, 'worker')
  const e = await rejects(main.request('send', { agent: sender.agent, to: 'worker', message: 'which one?' }), 'AMBIGUOUS_NAME')
  assert.match(e.message, new RegExp(w1.ref))
  assert.match(e.message, new RegExp(w2.ref))

  await main.request('send', { agent: sender.agent, to: `worker@pc-test [${w2.ref}]`, message: 'to w2' })
  const g2 = (await main.request('inbox', { agent: w2.agent })) as { messages: unknown[] }
  const g1 = (await main.request('inbox', { agent: w1.agent })) as { messages: unknown[] }
  assert.equal(g2.messages.length, 1)
  assert.equal(g1.messages.length, 0)

  await main.request('unregister', { agent: w1.agent })
  await main.request('send', { agent: sender.agent, to: 'worker', message: 'now unambiguous' })
  const g2b = (await main.request('inbox', { agent: w2.agent })) as { messages: Array<{ message: string }> }
  assert.equal(g2b.messages[0].message, 'now unambiguous')
})

test('unknown agent, unknown host and bad address are reported', async () => {
  const s = await reg(main, 'sender2')
  await rejects(main.request('send', { agent: s.agent, to: 'nobody', message: 'x' }), 'UNKNOWN_AGENT')
  await rejects(main.request('send', { agent: s.agent, to: 'x@other-pc', message: 'x' }), 'UNKNOWN_HOST')
  await rejects(main.request('send', { agent: s.agent, to: 'bad address!', message: 'x' }), 'BAD_REQUEST')
  await rejects(main.request('send', { agent: 'ag_missing', to: 'x', message: 'x' }), 'NOT_REGISTERED')
})

test('message size limit and @-text handling', async () => {
  const s = await reg(main, 'sender3')
  const r = await reg(main, 'recv3')
  await rejects(main.request('send', { agent: s.agent, to: 'recv3', message: 'a'.repeat(64 * 1024 + 1) }), 'TOO_LARGE')
  await main.request('send', { agent: s.agent, to: 'recv3', message: 'a'.repeat(64 * 1024) })
  await main.request('send', { agent: s.agent, to: 'recv3', message: 'look at @C:\\secret.txt and @server:resource' })
  const got = (await main.request('inbox', { agent: r.agent })) as { messages: Array<{ message: string }> }
  assert.equal(got.messages.length, 2)
  assert.equal(got.messages[1].message, 'look at @C:\\secret.txt and @server:resource')
})

test('burst of messages is rate limited', async () => {
  const s = await reg(main, 'sender4')
  await reg(main, 'recv4')
  let limited = 0
  for (let i = 0; i < 15; i++) {
    try {
      await main.request('send', { agent: s.agent, to: 'recv4', message: `m${i}` })
    } catch (e) {
      assert.equal((e as ApiCallError).code, 'RATE_LIMITED')
      limited++
    }
  }
  assert.ok(limited >= 4, `expected at least 4 rate limited sends, got ${limited}`)
})

test('identical repeats within the window are dropped as loops', async () => {
  const s = await reg(main, 'sender5')
  await reg(main, 'recv5')
  await main.request('send', { agent: s.agent, to: 'recv5', message: 'same' })
  await rejects(main.request('send', { agent: s.agent, to: 'recv5', message: 'same' }), 'LOOP_DETECTED')
  await sleep(500)
  await main.request('send', { agent: s.agent, to: 'recv5', message: 'same' })
})

test('inbox wait_ms returns as soon as a message arrives', async () => {
  const s = await reg(main, 'sender6')
  const r = await reg(main, 'recv6')
  const other = await connect()
  const started = Date.now()
  const waiting = other.request('inbox', { agent: r.agent, wait_ms: 5000 }) as Promise<{ messages: Array<{ message: string }> }>
  await sleep(200)
  await main.request('send', { agent: s.agent, to: 'recv6', message: 'wake up' })
  const got = await waiting
  assert.equal(got.messages[0].message, 'wake up')
  assert.ok(Date.now() - started < 3000)
})

test('inbox wait_ms times out with no messages', async () => {
  const r = await reg(main, 'recv7')
  const started = Date.now()
  const got = (await main.request('inbox', { agent: r.agent, wait_ms: 300 })) as { messages: unknown[] }
  assert.equal(got.messages.length, 0)
  assert.ok(Date.now() - started >= 250)
})

test('subscribe pushes messages and marks them delivered', async () => {
  const s = await reg(main, 'sender8')
  const r = await reg(main, 'recv8')
  const sub = await connect()
  await sub.request('subscribe', { agent: r.agent, events: ['message'] })
  const event = new Promise<{ message: string; state: string }>(resolve => sub.once('message', resolve))
  await main.request('send', { agent: s.agent, to: 'recv8', message: 'pushed' })
  const data = await event
  assert.equal(data.message, 'pushed')
  assert.equal(data.state, 'delivered')
  const left = (await main.request('inbox', { agent: r.agent })) as { messages: unknown[] }
  assert.equal(left.messages.length, 0)
})

test('notify_when_idle delivers one notice when the target becomes idle', async () => {
  const watcher = await reg(main, 'watcher')
  const target = await reg(main, 'busybee')
  await main.request('heartbeat', { agent: target.agent, status: 'busy' })
  const sub = (await main.request('notify_when_idle', { agent: watcher.agent, target: 'busybee' })) as { immediate: boolean }
  assert.equal(sub.immediate, false)
  await main.request('heartbeat', { agent: target.agent, status: 'idle' })
  const got = (await main.request('inbox', { agent: watcher.agent })) as { messages: Array<{ kind: string; message: string }> }
  assert.equal(got.messages.length, 1)
  assert.equal(got.messages[0].kind, 'idle_notice')
  assert.match(got.messages[0].message, /busybee@pc-test is idle/)

  await main.request('heartbeat', { agent: target.agent, status: 'busy' })
  await main.request('heartbeat', { agent: target.agent, status: 'idle' })
  const none = (await main.request('inbox', { agent: watcher.agent })) as { messages: unknown[] }
  assert.equal(none.messages.length, 0, 'the subscription is one-shot')
})

test('notify_when_idle answers at once when the target is already idle', async () => {
  const watcher = await reg(main, 'watcher2')
  await reg(main, 'sleeper')
  const sub = (await main.request('notify_when_idle', { agent: watcher.agent, target: 'sleeper' })) as { immediate: boolean }
  assert.equal(sub.immediate, true)
  const got = (await main.request('inbox', { agent: watcher.agent })) as { messages: Array<{ kind: string }> }
  assert.equal(got.messages[0].kind, 'idle_notice')
})

test('an agent without heartbeats goes offline but keeps its inbox', async () => {
  const s = await reg(main, 'sender9')
  const r = await reg(main, 'recv9')
  await main.request('send', { agent: s.agent, to: 'recv9', message: 'while you were away' })
  await sleep(1900)
  const keep = (await main.request('heartbeat', { agent: s.agent })) as { unread: number }
  assert.equal(keep.unread, 0)
  const list = (await main.request('list', { agent: s.agent })) as { agents: Array<{ address: string; status: string; unread: number }> }
  const row = list.agents.find(a => a.address === 'recv9@pc-test')
  assert.ok(row)
  assert.equal(row.status, 'offline')
  assert.equal(row.unread, 1)
  await main.request('heartbeat', { agent: r.agent })
  const back = (await main.request('inbox', { agent: r.agent })) as { messages: Array<{ message: string }> }
  assert.equal(back.messages[0].message, 'while you were away')
})

test('messages survive a daemon restart and the same key resumes the same agent', async () => {
  const s = await reg(main, 'sender10', 'key-sender10')
  const r = await reg(main, 'recv10', 'key-recv10')
  await main.request('send', { agent: s.agent, to: 'recv10', message: 'persist me' })

  const first = main.hello.pid
  await main.request('shutdown')
  await sleep(600)
  main = await connect()
  assert.notEqual(main.hello.pid, first, 'a new daemon process should have been started')

  const r2 = await reg(main, 'recv10', 'key-recv10')
  assert.equal(r2.agent, r.agent)
  assert.equal(r2.resumed, true)
  const got = (await main.request('inbox', { agent: r2.agent })) as { messages: Array<{ message: string }> }
  assert.equal(got.messages[0].message, 'persist me')
})

test('two clients racing to start the daemon end up on a single instance', async () => {
  const c0 = await Client.connect({ autostart: false })
  await c0.request('shutdown')
  c0.close()
  await sleep(600)
  const [a, b, c] = await Promise.all([connect(), connect(), connect()])
  assert.equal(a.hello.pid, b.hello.pid)
  assert.equal(b.hello.pid, c.hello.pid)
  main = a
})
