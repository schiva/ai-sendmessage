import net from 'node:net'
import { timingSafeEqual } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { Core } from './core.ts'
import type { MessageRow } from './store.ts'
import { ApiError, LIMITS } from './protocol.ts'

interface Conn {
  socket: net.Socket
  authed: boolean
  subs: Map<string, Set<string>> // agent -> events
}

type Params = Record<string, unknown>

export interface AdminHooks {
  aclStatus(): Record<string, unknown>
  reloadAcl(): Record<string, unknown>
  aclCheck(from: string, to: string): Record<string, unknown>
  peersStatus(): Promise<Record<string, unknown>>
  reloadPeers(): Promise<Record<string, unknown>>
  pairStart(p: { address?: string; port?: number; ttlS?: number }): Promise<Record<string, unknown>>
  pairStatus(): Promise<Record<string, unknown>>
  pairCancel(): Promise<Record<string, unknown>>
  pairJoin(code: string): Promise<Record<string, unknown>>
  joinOpen(p: { ttlS?: number; count?: number; address?: string; port?: number }): Promise<Record<string, unknown>>
  joinClose(): Promise<Record<string, unknown>>
  joinPending(): Promise<Record<string, unknown>>
  joinApprove(id: unknown, digits: unknown): Promise<Record<string, unknown>>
  joinStart(p: { address: unknown; port?: unknown; waitS?: unknown }): Promise<Record<string, unknown>>
  joinStatus(request: unknown): Promise<Record<string, unknown>>
  joinCancel(request: unknown): Promise<Record<string, unknown>>
}

function tokenMatches(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export class Server extends EventEmitter {
  private core: Core
  private token: string
  private log: (line: string) => void
  private srv: net.Server
  private conns = new Set<Conn>()
  private admin: AdminHooks | null

  constructor(core: Core, token: string, log: (line: string) => void, admin: AdminHooks | null = null) {
    super()
    this.core = core
    this.token = token
    this.log = log
    this.admin = admin
    this.srv = net.createServer(socket => this.onConnection(socket))
    core.events.on('message', (agent: string, row: MessageRow) => this.push(agent, row))
  }

  listen(pipe: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.srv.once('error', reject)
      this.srv.listen(pipe, () => {
        this.srv.off('error', reject)
        resolve()
      })
    })
  }

  close(): Promise<void> {
    for (const c of this.conns) c.socket.destroy()
    return new Promise(resolve => this.srv.close(() => resolve()))
  }

  private write(c: Conn, obj: unknown): void {
    if (!c.socket.destroyed) c.socket.write(JSON.stringify(obj) + '\n')
  }

  private push(agent: string, row: MessageRow): void {
    const eventName = row.kind === 'idle_notice' ? 'idle' : 'message'
    for (const c of this.conns) {
      const events = c.subs.get(agent)
      if (!events || !events.has(eventName)) continue
      this.core.markDelivered(agent, row.id)
      this.write(c, {
        event: eventName,
        data: {
          id: row.id,
          from: row.from_addr,
          to: row.to_addr,
          kind: row.kind,
          summary: row.summary,
          message: row.message,
          ts: row.ts,
          reply_to: row.reply_to,
          state: 'delivered',
        },
      })
      return
    }
  }

  private onConnection(socket: net.Socket): void {
    const conn: Conn = { socket, authed: false, subs: new Map() }
    this.conns.add(conn)
    let buf = ''
    socket.setEncoding('utf8')
    socket.on('data', (chunk: string) => {
      buf += chunk
      if (buf.length > LIMITS.maxLineBytes && !buf.includes('\n')) {
        this.write(conn, { id: null, error: { code: 'BAD_REQUEST', message: 'request line too long' } })
        socket.destroy()
        return
      }
      let nl: number
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (line) void this.handleLine(conn, line)
      }
    })
    socket.on('error', () => {})
    socket.on('close', () => this.conns.delete(conn))
  }

  private async handleLine(conn: Conn, line: string): Promise<void> {
    let req: { id?: unknown; method?: unknown; params?: unknown }
    try {
      req = JSON.parse(line)
      if (typeof req !== 'object' || req === null) throw new Error('not an object')
    } catch {
      this.write(conn, { id: null, error: { code: 'BAD_REQUEST', message: 'invalid JSON' } })
      return
    }
    const id = req.id ?? null
    try {
      if (typeof req.method !== 'string') throw new ApiError('BAD_REQUEST', '"method" is required')
      const params: Params = req.params && typeof req.params === 'object' ? (req.params as Params) : {}
      const result = await this.dispatch(conn, req.method, params)
      this.write(conn, { id, result })
      if (req.method === 'shutdown') this.emit('shutdown')
    } catch (e) {
      if (e instanceof ApiError) {
        this.write(conn, { id, error: { code: e.code, message: e.message, ...(e.data !== undefined ? { data: e.data } : {}) } })
        if (e.code === 'UNAUTHORIZED') conn.socket.end()
      } else {
        this.log(`internal error in ${String(req.method)}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`)
        this.write(conn, { id, error: { code: 'INTERNAL', message: 'internal error' } })
      }
    }
  }

  private async dispatch(conn: Conn, method: string, p: Params): Promise<unknown> {
    if (method === 'hello') {
      if (!tokenMatches(p.token, this.token)) throw new ApiError('UNAUTHORIZED', 'invalid token')
      conn.authed = true
      return this.core.hello(p)
    }
    if (!conn.authed) throw new ApiError('UNAUTHORIZED', 'send hello with a valid token first')
    switch (method) {
      case 'register':
        return this.core.register(p)
      case 'unregister':
        return this.core.unregister(p)
      case 'heartbeat':
        return this.core.heartbeat(p)
      case 'send':
        return this.core.send(p)
      case 'list':
        return this.core.list(p)
      case 'inbox':
        return this.core.inbox(p)
      case 'ack':
        return this.core.ack(p)
      case 'notify_when_idle':
        return await this.core.notifyWhenIdle(p)
      case 'subscribe': {
        const agent = p.agent
        if (typeof agent !== 'string') throw new ApiError('BAD_REQUEST', '"agent" is required')
        // Validates the agent and refreshes its lease.
        this.core.heartbeat({ agent })
        const events = p.events
        if (!Array.isArray(events) || events.some(e => e !== 'message' && e !== 'idle')) {
          throw new ApiError('BAD_REQUEST', '"events" must be an array of "message" and/or "idle"')
        }
        conn.subs.set(agent, new Set(events as string[]))
        return {}
      }
      case 'acl':
        return this.admin ? this.admin.aclStatus() : {}
      case 'reload_acl':
        return this.admin ? this.admin.reloadAcl() : {}
      case 'acl_check':
        return this.admin ? this.admin.aclCheck(String(p.from ?? ''), String(p.to ?? '')) : {}
      case 'peers':
        return this.admin ? await this.admin.peersStatus() : { peers: [] }
      case 'reload_peers':
        return this.admin ? await this.admin.reloadPeers() : {}
      case 'pair_start': {
        if (!this.admin) return {}
        const port = p.port === undefined ? undefined : Number(p.port)
        if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) throw new ApiError('BAD_REQUEST', '"port" must be 1-65535')
        const ttlS = p.ttl_s === undefined ? undefined : Number(p.ttl_s)
        if (ttlS !== undefined && !Number.isFinite(ttlS)) throw new ApiError('BAD_REQUEST', '"ttl_s" must be a number')
        return await this.admin.pairStart({ address: typeof p.address === 'string' && p.address.trim() ? p.address.trim() : undefined, port, ttlS })
      }
      case 'pair_status':
        return this.admin ? await this.admin.pairStatus() : {}
      case 'pair_cancel':
        return this.admin ? await this.admin.pairCancel() : {}
      case 'pair_join':
        if (typeof p.code !== 'string' || p.code.trim() === '') throw new ApiError('BAD_REQUEST', '"code" is required')
        return this.admin ? await this.admin.pairJoin(p.code) : {}
      case 'join_open': {
        if (!this.admin) return {}
        const num = (v: unknown, name: string): number | undefined => {
          if (v === undefined) return undefined
          const n = Number(v)
          if (!Number.isFinite(n)) throw new ApiError('BAD_REQUEST', `"${name}" must be a number`)
          return n
        }
        const port = num(p.port, 'port')
        if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) throw new ApiError('BAD_REQUEST', '"port" must be 1-65535')
        return await this.admin.joinOpen({
          ttlS: num(p.ttl_s, 'ttl_s'),
          count: num(p.count, 'count'),
          address: typeof p.address === 'string' && p.address.trim() ? p.address.trim() : undefined,
          port,
        })
      }
      case 'join_close':
        return this.admin ? await this.admin.joinClose() : {}
      case 'join_pending':
        return this.admin ? await this.admin.joinPending() : {}
      case 'join_approve':
        return this.admin ? await this.admin.joinApprove(p.id, p.digits) : {}
      case 'join_start':
        return this.admin ? await this.admin.joinStart({ address: p.address, port: p.port, waitS: p.wait_s }) : {}
      case 'join_status':
        return this.admin ? await this.admin.joinStatus(p.request) : {}
      case 'join_cancel':
        return this.admin ? await this.admin.joinCancel(p.request) : {}
      case 'shutdown':
        return {}
      default:
        throw new ApiError('BAD_REQUEST', `unknown method "${method}"`)
    }
  }
}
