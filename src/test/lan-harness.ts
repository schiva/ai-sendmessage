// Shared helpers for tests that run several hosts (daemons) on one PC: each has its own pipe, data folder, host name and port.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { WebSocket } from 'ws'
import { Client, ApiCallError } from '../client/client.ts'

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
export const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-lan-'))
export const TOKEN = 'shared-secret-for-a-and-b-0123456789'
export const TOKEN_X = 'raw-test-client-secret-0123456789ab'

export function cleanup(): void {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
}

export interface Node {
  host: string
  home: string
  pipe: string
  port: number
  env: Record<string, string>
  client: Client | null
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port
      s.close(() => resolve(p))
    })
    s.on('error', reject)
  })
}

export async function makeNode(host: string, extraEnv: Record<string, string> = {}): Promise<Node> {
  const home = path.join(tmpRoot, host)
  fs.mkdirSync(home, { recursive: true })
  return {
    host,
    home,
    pipe: `\\\\.\\pipe\\agentlink-lan-${host}-${randomBytes(3).toString('hex')}`,
    port: await freePort(),
    client: null,
    env: {
      AGENTLINK_HOST: host,
      AGENTLINK_LEASE_MS: '8000',
      AGENTLINK_SWEEP_MS: '200',
      AGENTLINK_DUP_WINDOW_MS: '50',
      AGENTLINK_PEER_RECONNECT_MIN_MS: '100',
      AGENTLINK_PEER_RECONNECT_MAX_MS: '400',
      AGENTLINK_PEER_PING_MS: '1000',
      AGENTLINK_ACK_WAIT_MS: '1500',
      AGENTLINK_DIRECTORY_MS: '300',
      ...extraEnv,
    },
  }
}

/** Connection options that address this node's daemon (for the SDK as well). */
export function addr(n: Node): { pipe: string; home: string; env: Record<string, string> } {
  return { pipe: n.pipe, home: n.home, env: n.env }
}

export async function start(n: Node): Promise<Client> {
  n.client = await Client.connect(addr(n))
  return n.client
}

async function pipeGone(pipe: string, ms: number): Promise<void> {
  const end = Date.now() + ms
  for (;;) {
    const alive = await new Promise<boolean>(resolve => {
      const s = net.connect(pipe)
      s.once('connect', () => {
        s.destroy()
        resolve(true)
      })
      s.once('error', () => resolve(false))
    })
    if (!alive) return
    if (Date.now() > end) assert.fail(`the daemon on ${pipe} did not shut down within ${ms}ms`)
    await sleep(100)
  }
}

export async function stop(n: Node): Promise<void> {
  let lastError = ''
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      const c = await Client.connect({ autostart: false, ...addr(n) })
      await c.request('shutdown')
      c.close()
      lastError = ''
      break
    } catch (e) {
      lastError = String(e)
      if (/ENOENT|ECONNREFUSED/.test(lastError)) break // not running at all
      await sleep(200)
    }
  }
  n.client?.close()
  n.client = null
  try {
    await pipeGone(n.pipe, 10_000)
  } catch (e) {
    assert.fail(`${String(e instanceof Error ? e.message : e)}; last error while asking it to stop: ${lastError || '(none: the shutdown request was accepted)'}`)
  }
  await sleep(150)
}

export interface PeersStatus {
  fingerprint: string
  listening: { host: string; port: number } | null
  config_errors: string[]
  peers: Array<{ host: string; link: 'up' | 'down'; queued: number; error: string | null }>
}

export async function status(n: Node): Promise<PeersStatus> {
  return (await (n.client as Client).request('peers')) as PeersStatus
}

export function writeJson(n: Node, file: string, content: unknown): void {
  fs.writeFileSync(path.join(n.home, file), typeof content === 'string' ? content : JSON.stringify(content))
}

export function writePeers(n: Node, cfg: unknown): void {
  writeJson(n, 'peers.json', cfg)
}

export async function until<T>(fn: () => Promise<T | undefined | false>, ms: number, what: string): Promise<T> {
  const end = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) assert.fail(`timed out after ${ms}ms waiting for ${what}`)
    await sleep(150)
  }
}

export async function linkUp(n: Node, peer: string): Promise<boolean> {
  const s = await status(n)
  return s.peers.find(p => p.host === peer)?.link === 'up'
}

/** Gives two running nodes each other's address, certificate fingerprint and a shared token, and waits for the link. */
export async function pair(a: Node, b: Node): Promise<void> {
  const fpA = (await status(a)).fingerprint
  const fpB = (await status(b)).fingerprint
  writePeers(a, { listen: { host: '127.0.0.1', port: a.port }, peers: [{ name: b.host, address: '127.0.0.1', port: b.port, token: TOKEN, fingerprint: fpB }] })
  writePeers(b, { listen: { host: '127.0.0.1', port: b.port }, peers: [{ name: a.host, address: '127.0.0.1', port: a.port, token: TOKEN, fingerprint: fpA }] })
  await (a.client as Client).request('reload_peers')
  await (b.client as Client).request('reload_peers')
  await until(() => linkUp(a, b.host), 10_000, `${a.host} to see ${b.host} up`)
  await until(() => linkUp(b, a.host), 10_000, `${b.host} to see ${a.host} up`)
}

export async function reg(n: Node, name: string, key = `k:${name}`): Promise<{ agent: string; ref: string; address: string }> {
  return (await (n.client as Client).request('register', { name, kind: 'test', key })) as { agent: string; ref: string; address: string }
}

export async function send(n: Node, agent: string, to: string, message: string): Promise<{ id: string; status: string; to: string }> {
  return (await (n.client as Client).request('send', { agent, to, message })) as { id: string; status: string; to: string }
}

export interface Msg {
  id: string
  from: string
  message: string
  kind: string
  state: string
}

export async function take(n: Node, agent: string): Promise<Msg[]> {
  return ((await (n.client as Client).request('inbox', { agent })) as { messages: Msg[] }).messages
}

export async function rejects(p: Promise<unknown>, code: string): Promise<ApiCallError> {
  try {
    await p
  } catch (e) {
    assert.ok(e instanceof ApiCallError, `expected ApiCallError, got ${String(e)}`)
    assert.equal(e.code, code, `expected ${code}, got ${e.code}: ${e.message}`)
    return e
  }
  assert.fail(`expected ${code}, but the call succeeded`)
}

/** A hand-rolled peer used to probe the receiving side: connects to `n` as host `asHost`. */
export async function rawPeer(n: Node, asHost: string, token: string): Promise<{
  ws: WebSocket
  frames: Array<Record<string, unknown>>
  closed: () => boolean
  send: (f: unknown) => void
  waitFor: (pred: (f: Record<string, unknown>) => boolean, ms?: number) => Promise<Record<string, unknown>>
}> {
  const ws = new WebSocket(`wss://127.0.0.1:${n.port}`, { rejectUnauthorized: false })
  const frames: Array<Record<string, unknown>> = []
  let closed = false
  ws.on('message', d => frames.push(JSON.parse(d.toString())))
  ws.on('close', () => (closed = true))
  ws.on('error', () => {})
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve())
    ws.once('error', reject)
  })
  ws.send(JSON.stringify({ t: 'hello', v: 1, host: asHost, token }))
  const waitFor = async (pred: (f: Record<string, unknown>) => boolean, ms = 4000) => {
    const end = Date.now() + ms
    for (;;) {
      const f = frames.find(pred)
      if (f) return f
      if (Date.now() > end) assert.fail(`raw peer: timed out waiting for a frame; got ${JSON.stringify(frames.slice(-3))}`)
      await sleep(50)
    }
  }
  return { ws, frames, closed: () => closed, send: f => ws.send(JSON.stringify(f)), waitFor }
}
