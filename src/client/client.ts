import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { fileURLToPath } from 'node:url'
import { homeDir, pipePath } from '../agentd/config.ts'

export class ApiCallError extends Error {
  code: string
  data?: unknown
  constructor(code: string, message: string, data?: unknown) {
    super(message)
    this.code = code
    this.data = data
  }
}

interface Pending {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
}

// From source the daemon is src/agentd/main.ts. Inside the plugin bundle (dist/*.mjs) it is the sibling dist/agentd.mjs.
const DAEMON_PATH = fileURLToPath(new URL(import.meta.url.endsWith('.mjs') ? './agentd.mjs' : '../agentd/main.ts', import.meta.url))

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function tryConnect(pipe: string): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const s = net.connect(pipe)
    s.once('connect', () => {
      s.off('error', reject)
      resolve(s)
    })
    s.once('error', reject)
  })
}

function startDaemon(env: NodeJS.ProcessEnv): void {
  const child = spawn(process.execPath, ['--no-warnings', DAEMON_PATH], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env,
  })
  child.unref()
}

/** How long a client waits for a daemon it has just started to accept connections (the default for every client but the hooks). */
export const DEFAULT_START_TIMEOUT_MS = 8_000
/** How long a client waits for the token file of a daemon that accepts connections (it is written before the pipe opens, so this is only a safety margin). */
export const TOKEN_WAIT_MS = 3_000

async function connectWithAutostart(pipe: string, autostart: boolean, env: NodeJS.ProcessEnv, home: string, startTimeoutMs: number): Promise<net.Socket> {
  try {
    return await tryConnect(pipe)
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code
    if (!autostart || (code !== 'ENOENT' && code !== 'ECONNREFUSED')) throw e
  }
  startDaemon(env)
  const deadline = Date.now() + startTimeoutMs
  let last: unknown
  while (Date.now() < deadline) {
    await sleep(100)
    try {
      return await tryConnect(pipe)
    } catch (e) {
      last = e
    }
  }
  throw new Error(`agentd did not start within ${Math.round(startTimeoutMs / 100) / 10}s (${String((last as Error)?.message ?? last)}); see ${path.join(home, 'agentd.log')}`)
}

async function readToken(home: string): Promise<string> {
  const file = path.join(home, 'token')
  for (let i = 0; i < TOKEN_WAIT_MS / 100; i++) {
    try {
      const t = fs.readFileSync(file, 'utf8').trim()
      if (t) return t
    } catch {
      // not written yet
    }
    await sleep(100)
  }
  throw new Error(`cannot read the agentd token at ${file}`)
}

export interface HelloResult {
  server_version: string
  protocol: number
  host: string
  lease_ms: number
  pid: number
}

export class Client extends EventEmitter {
  hello!: HelloResult
  private socket: net.Socket
  private nextId = 1
  private pending = new Map<number, Pending>()
  private buf = ''

  private constructor(socket: net.Socket) {
    super()
    this.socket = socket
    socket.setEncoding('utf8')
    socket.on('data', (chunk: string) => this.onData(chunk))
    socket.on('close', () => {
      for (const p of this.pending.values()) p.reject(new Error('connection to agentd closed'))
      this.pending.clear()
      this.emit('close')
    })
    socket.on('error', () => {})
  }

  /**
   * By default this talks to the daemon of the current user. `pipe`, `home` and `env` address another daemon
   * (used to run several hosts on one PC for tests); `env` is also what an auto-started daemon receives.
   */
  static async connect(opts: { autostart?: boolean; pipe?: string; home?: string; env?: Record<string, string>; startTimeoutMs?: number } = {}): Promise<Client> {
    const env: NodeJS.ProcessEnv = { ...process.env, ...opts.env }
    if (opts.pipe) env.AGENTLINK_PIPE = opts.pipe
    if (opts.home) env.AGENTLINK_HOME = opts.home
    const pipe = opts.pipe ?? opts.env?.AGENTLINK_PIPE ?? pipePath()
    const home = opts.home ?? opts.env?.AGENTLINK_HOME ?? homeDir()
    const socket = await connectWithAutostart(pipe, opts.autostart ?? true, env, home, opts.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS)
    const c = new Client(socket)
    const token = await readToken(home)
    c.hello = (await c.request('hello', { v: 1, client: 'agentlink-client', token })) as HelloResult
    return c
  }

  private onData(chunk: string): void {
    this.buf += chunk
    let nl: number
    while ((nl = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, nl).trim()
      this.buf = this.buf.slice(nl + 1)
      if (!line) continue
      let msg: { id?: number | null; result?: unknown; error?: { code: string; message: string; data?: unknown }; event?: string; data?: unknown }
      try {
        msg = JSON.parse(line)
      } catch {
        continue
      }
      if (msg.event) {
        this.emit('event', msg.event, msg.data)
        this.emit(msg.event, msg.data)
        continue
      }
      const p = typeof msg.id === 'number' ? this.pending.get(msg.id) : undefined
      if (!p) continue
      this.pending.delete(msg.id as number)
      if (msg.error) p.reject(new ApiCallError(msg.error.code, msg.error.message, msg.error.data))
      else p.resolve(msg.result)
    }
  }

  request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++
      this.pending.set(id, { resolve, reject })
      this.socket.write(JSON.stringify({ id, method, params }) + '\n', err => {
        if (err) {
          this.pending.delete(id)
          reject(err)
        }
      })
    })
  }

  close(): void {
    this.socket.destroy()
  }
}
