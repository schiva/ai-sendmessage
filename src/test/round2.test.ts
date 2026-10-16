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
