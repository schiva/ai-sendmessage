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
