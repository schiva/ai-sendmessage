import { randomBytes, randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { Config } from './config.ts'
import { ApiError, LIMITS, NAME_RE, PROTOCOL_VERSION, TO_RE } from './protocol.ts'
import type { AgentStatus, MessageKind, MessageState } from './protocol.ts'
import type { AgentRow, MessageRow, Store } from './store.ts'
import type { MsgFrame, NoticeFrame, RemoteAgent, RemoteGateway, WatchFrame } from './remote.ts'
import type { Acl } from './acl.ts'
import { VERSION } from '../version.ts'

type Params = Record<string, unknown>

export interface WireMessage {
  id: string
  from: string
  to: string
  kind: MessageKind
  summary: string | null
  message: string
  ts: number
  reply_to: string | null
  state: MessageState
}

function str(p: Params, name: string, opts: { required?: boolean; max?: number } = {}): string | undefined {
  const v = p[name]
  if (v === undefined || v === null) {
    if (opts.required) throw new ApiError('BAD_REQUEST', `"${name}" is required`)
    return undefined
  }
  if (typeof v !== 'string') throw new ApiError('BAD_REQUEST', `"${name}" must be a string`)
  if (opts.max !== undefined && v.length > opts.max) throw new ApiError('BAD_REQUEST', `"${name}" is longer than ${opts.max} characters`)
  return v
}

function int(p: Params, name: string, def: number, min: number, max: number): number {
  const v = p[name]
  if (v === undefined || v === null) return def
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ApiError('BAD_REQUEST', `"${name}" must be a number`)
  return Math.min(max, Math.max(min, Math.floor(v)))
}

export class Core {
  readonly events = new EventEmitter()
  readonly host: string
  private store: Store
  private cfg: Config
  private buckets = new Map<string, { tokens: number; last: number }>()
  private recent = new Map<string, number>()
  private remote: RemoteGateway | null = null
  private acl: Acl | null = null

  constructor(store: Store, host: string, cfg: Config) {
    this.store = store
    this.host = host
    this.cfg = cfg
    this.events.setMaxListeners(0)
  }

  setRemote(remote: RemoteGateway): void {
    this.remote = remote
  }

  setAcl(acl: Acl): void {
    this.acl = acl
  }

  /** F-14: throws FORBIDDEN when the ACL does not allow `from` to reach `to`. */
  private checkAcl(from: { name: string; host: string }, to: { name: string; host: string }): void {
    if (!this.acl) return
    const d = this.acl.check(from, to)
    if (!d.allowed) throw new ApiError('FORBIDDEN', `blocked by the ACL of host ${this.host}: ${d.reason}`)
  }

  // --- helpers ----------------------------------------------------------------

  private isLive(a: AgentRow): boolean {
    return a.active === 1 && Date.now() - a.last_seen <= this.cfg.leaseMs
  }

  private statusOf(a: AgentRow): AgentStatus {
    return this.isLive(a) ? a.status : 'offline'
  }

  private address(a: AgentRow): string {
    return `${a.name}@${this.host}`
  }

  private fromAddress(a: AgentRow): string {
    return `${a.name}@${this.host} [${a.ref}]`
  }

  private requireAgent(p: Params): AgentRow {
    const id = str(p, 'agent', { required: true }) as string
    const a = this.store.getAgent(id)
    if (!a || a.active !== 1) throw new ApiError('NOT_REGISTERED', 'unknown or unregistered agent; call register first')
    this.store.touch(a.agent, Date.now())
    return a
  }

  private toWire(m: MessageRow, state?: MessageState): WireMessage {
    return {
      id: m.id,
      from: m.from_addr,
      to: m.to_addr,
      kind: m.kind,
      summary: m.summary,
      message: m.message,
      ts: m.ts,
      reply_to: m.reply_to,
      state: state ?? m.state,
    }
  }

  private parseTo(to: string): { name: string; host: string | null; ref: string | null } {
    const m = TO_RE.exec(to.trim())
    if (!m) throw new ApiError('BAD_REQUEST', `invalid address "${to}" (use name, name@host or name@host [ref])`)
    return { name: m[1], host: m[2] ? m[2].toLowerCase() : null, ref: m[3] ? m[3].toLowerCase() : null }
  }

  private resolve(to: string): AgentRow {
    const t = this.parseTo(to)
    if (t.host && t.host !== this.host) {
      throw new ApiError('UNKNOWN_HOST', `host "${t.host}" is not this host; this operation only works for agents on this host`)
    }
    return this.resolveLocal(t.name, t.ref)
  }

  private resolveLocal(name: string, ref: string | null): AgentRow {
    let cands = this.store.agentsByName(name)
    if (ref) cands = cands.filter(a => a.ref === ref)
    if (cands.length === 0) throw new ApiError('UNKNOWN_AGENT', `no agent named "${name}"${ref ? ` with ref ${ref}` : ''} on host ${this.host}`)
    const live = cands.filter(a => this.isLive(a))
    const pool = live.length > 0 ? live : cands
    if (pool.length > 1) {
      const list = pool.map(a => `${this.address(a)} [${a.ref}]`)
      throw new ApiError('AMBIGUOUS_NAME', `several agents answer to "${name}": ${list.join(', ')}; add a [ref]`, { candidates: list })
    }
    return pool[0]
  }

  private takeToken(agent: string): boolean {
    const now = Date.now()
    const perMs = this.cfg.ratePerMin / 60_000
    const b = this.buckets.get(agent) ?? { tokens: this.cfg.rateBurst, last: now }
    b.tokens = Math.min(this.cfg.rateBurst, b.tokens + (now - b.last) * perMs)
    b.last = now
    this.buckets.set(agent, b)
    if (b.tokens < 1) return false
    b.tokens -= 1
    return true
  }

  private ensureRoom(agent: string, force: boolean): boolean {
    if (this.store.countInbox(agent) < LIMITS.inboxMax) return true
    this.store.dropOldest(agent, 'acked', 1)
    if (this.store.countInbox(agent) < LIMITS.inboxMax) return true
    if (!force) return false
    this.store.dropOldest(agent, 'delivered', 1)
    if (this.store.countInbox(agent) < LIMITS.inboxMax) return true
    this.store.dropOldest(agent, 'new', 1)
    return true
  }

  private deliver(
    target: AgentRow,
    fields: { from: string; kind: MessageKind; summary: string | null; message: string; reply_to: string | null },
    force: boolean,
    id?: string,
  ): MessageRow | undefined {
    if (!this.ensureRoom(target.agent, force)) return undefined
    const row = this.store.insertMessage({
      id: id ?? randomUUID(),
      to_agent: target.agent,
      from_addr: fields.from,
      to_addr: this.fromAddress(target),
      kind: fields.kind,
      summary: fields.summary,
      message: fields.message,
      ts: Math.floor(Date.now() / 1000),
      reply_to: fields.reply_to,
      ttl: 3,
      created_ms: Date.now(),
    })
    this.events.emit('message', target.agent, row)
    return row
  }

  private fireIdle(target: AgentRow, reason: 'idle' | 'offline'): void {
    const subs = this.store.takeIdleSubs(target.agent)
    for (const sub of subs) {
      if (Date.now() - sub.created_at > LIMITS.idleSubTtlMs) continue
      const requester = this.store.getAgent(sub.requester)
      if (!requester) continue
      const text = reason === 'idle' ? `${this.address(target)} is idle` : `${this.address(target)} exited or went offline`
      this.deliver(requester, { from: `agentlink@${this.host}`, kind: 'idle_notice', summary: text, message: text, reply_to: null }, true)
    }
    for (const sub of this.store.takeRemoteIdleSubs(target.agent)) {
      if (Date.now() - sub.created_at > LIMITS.idleSubTtlMs) continue
      this.sendNotice(sub.host, sub.requester_addr, target, reason)
    }
  }

  /** Tell a watcher on another host that `target` is idle (best effort, persisted in the outbox until acknowledged). */
  private sendNotice(host: string, requesterAddr: string, target: AgentRow, reason: 'idle' | 'offline'): void {
    if (!this.remote) return
    const frame: NoticeFrame = { t: 'notice', id: randomUUID(), to: requesterAddr, kind: 'idle_notice', target: this.fromAddress(target), reason }
    this.remote.send(host, frame, '', requesterAddr).catch(() => {})
  }

  // --- methods ------------------------------------------------------------------

  hello(p: Params): Record<string, unknown> {
    const v = p.v
    if (v !== PROTOCOL_VERSION) throw new ApiError('BAD_REQUEST', `unsupported protocol version ${String(v)} (server speaks ${PROTOCOL_VERSION})`)
    return {
      server_version: VERSION,
      protocol: PROTOCOL_VERSION,
      host: this.host,
      lease_ms: this.cfg.leaseMs,
      pid: process.pid,
    }
  }

  register(p: Params): Record<string, unknown> {
    const name = str(p, 'name', { required: true }) as string
    if (!NAME_RE.test(name)) throw new ApiError('BAD_REQUEST', 'name may only contain letters, digits, "-" and "_" (max 64)')
    const kind = str(p, 'kind', { max: 64 }) ?? 'generic'
    if (!NAME_RE.test(kind)) throw new ApiError('BAD_REQUEST', 'kind may only contain letters, digits, "-" and "_" (max 64)')
    const cwd = str(p, 'cwd', { max: 1024 }) ?? null
    const pidRaw = p.pid
    const pid = typeof pidRaw === 'number' && Number.isInteger(pidRaw) ? pidRaw : null
    const key = str(p, 'key', { max: 256 }) ?? `anon:${randomBytes(8).toString('hex')}`
    const now = Date.now()

    const existing = this.store.getAgentByKey(key)
    if (existing) {
      // Re-registering a live agent (every hook invocation does) must not reset its busy/idle status.
      const status = this.isLive(existing) ? existing.status : 'idle'
      this.store.reviveAgent(existing.agent, { name, kind, cwd, pid, status }, now)
      const a = this.store.getAgent(existing.agent) as AgentRow
      return { agent: a.agent, name: a.name, ref: a.ref, address: this.address(a), resumed: true, unread: this.store.countState(a.agent, 'new') }
    }

    let ref = randomBytes(3).toString('hex')
    while (this.store.agentsByName(name).some(a => a.ref === ref)) ref = randomBytes(3).toString('hex')
    const a: AgentRow = {
      agent: `ag_${randomBytes(6).toString('hex')}`,
      key,
      name,
      ref,
      kind,
      cwd,
      pid,
      status: 'idle',
      active: 1,
      last_seen: now,
      registered_at: now,
    }
    this.store.insertAgent(a)
    return { agent: a.agent, name, ref, address: this.address(a), resumed: false, unread: 0 }
  }

  unregister(p: Params): Record<string, never> {
    const a = this.requireAgent(p)
    this.store.deactivate(a.agent)
    this.fireIdle(a, 'offline')
    return {}
  }

  heartbeat(p: Params): Record<string, unknown> {
    const a = this.requireAgent(p)
    const s = p.status
    if (s !== undefined && s !== null) {
      if (s !== 'busy' && s !== 'idle') throw new ApiError('BAD_REQUEST', 'status must be "busy" or "idle"')
      const wasIdle = this.statusOf(a) === 'idle'
      this.store.setStatus(a.agent, s)
      if (s === 'idle' && !wasIdle) this.fireIdle(a, 'idle')
    }
    return { unread: this.store.countState(a.agent, 'new') }
  }

  async send(p: Params): Promise<Record<string, unknown>> {
    const from = this.requireAgent(p)
    const to = str(p, 'to', { required: true }) as string
    const message = str(p, 'message', { required: true }) as string
    const summary = str(p, 'summary', { max: LIMITS.maxSummaryChars }) ?? null
    const replyTo = str(p, 'reply_to', { max: 64 }) ?? null
    if (message.length === 0) throw new ApiError('BAD_REQUEST', '"message" must not be empty')
    const bytes = Buffer.byteLength(message, 'utf8')
    if (bytes > LIMITS.maxMessageBytes) {
      throw new ApiError('TOO_LARGE', `message is ${bytes} bytes; the limit is ${LIMITS.maxMessageBytes}`)
    }

    const t = this.parseTo(to)
    const isRemote = t.host !== null && t.host !== this.host
    let local: AgentRow | undefined
    if (isRemote) {
      if (!this.remote?.knownHost(t.host as string)) {
        throw new ApiError('UNKNOWN_HOST', `host "${t.host}" is not in peers.json (${this.remote ? 'see "agentctl peers"' : 'LAN is not configured'})`)
      }
    } else {
      local = this.resolveLocal(t.name, t.ref)
    }

    this.checkAcl({ name: from.name, host: this.host }, { name: local ? local.name : t.name, host: local ? this.host : (t.host as string) })

    if (!this.takeToken(from.agent)) {
      throw new ApiError('RATE_LIMITED', 'too many messages from this agent just now; batch them into one message or wait a moment', {
        retry_after_ms: Math.ceil(60_000 / this.cfg.ratePerMin),
      })
    }
    const targetKey = local ? local.agent : `${t.host}|${t.name}|${t.ref ?? ''}`
    const dupKey = `${from.agent}|${targetKey}|${message}`
    const seen = this.recent.get(dupKey)
    const now = Date.now()
    if (seen !== undefined && now - seen < this.cfg.dupWindowMs) {
      throw new ApiError('LOOP_DETECTED', 'an identical message was just sent to this agent; dropped')
    }
    this.recent.set(dupKey, now)

    if (local) {
      const row = this.deliver(local, { from: this.fromAddress(from), kind: 'message', summary, message, reply_to: replyTo }, false)
      if (!row) throw new ApiError('RATE_LIMITED', `the inbox of ${this.address(local)} is full`)
      return { id: row.id, status: 'stored', to: this.fromAddress(local) }
    }

    const display = `${t.name}@${t.host}${t.ref ? ` [${t.ref}]` : ''}`
    const frame: MsgFrame = {
      t: 'msg',
      id: randomUUID(),
      from: this.fromAddress(from),
      to: display,
      kind: 'message',
      summary,
      message,
      ts: Math.floor(now / 1000),
      reply_to: replyTo,
      ttl: 3,
    }
    const status = await (this.remote as RemoteGateway).send(t.host as string, frame, from.agent, display)
    return { id: frame.id, status, to: display }
  }

  /** A message arrived over an authenticated peer link. Throws ApiError, which the peer receives as an error ack. */
  receiveRemote(peerHost: string, f: Record<string, unknown>): void {
    const id = f.id
    if (typeof id !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new ApiError('BAD_REQUEST', 'invalid message id')
    if (this.store.hasMessageId(id)) return // a retransmission of something we already stored

    const from = f.from
    const hostPattern = peerHost.replace(/[.]/g, '\\.')
    const fromRe = new RegExp('^[A-Za-z0-9_-]{1,64}@' + hostPattern + ' \\[[0-9a-f]{4,12}\\]$')
    if (typeof from !== 'string' || !fromRe.test(from)) {
      throw new ApiError('FORBIDDEN', `sender address does not belong to host "${peerHost}"`)
    }
    if (f.kind !== 'message') throw new ApiError('BAD_REQUEST', 'only plain messages can be sent between hosts')
    const message = f.message
    if (typeof message !== 'string' || message.length === 0) throw new ApiError('BAD_REQUEST', '"message" is required')
    const bytes = Buffer.byteLength(message, 'utf8')
    if (bytes > LIMITS.maxMessageBytes) throw new ApiError('TOO_LARGE', `message is ${bytes} bytes; the limit is ${LIMITS.maxMessageBytes}`)
    const summary = typeof f.summary === 'string' ? f.summary.slice(0, LIMITS.maxSummaryChars) : null
    const replyTo = typeof f.reply_to === 'string' ? f.reply_to.slice(0, 64) : null
    if (typeof f.ttl !== 'number' || !Number.isInteger(f.ttl) || f.ttl <= 0) throw new ApiError('LOOP_DETECTED', 'message ttl is exhausted')
    if (typeof f.to !== 'string') throw new ApiError('BAD_REQUEST', '"to" is required')
    if (!this.takeToken(`peer:${peerHost}`)) throw new ApiError('RATE_LIMITED', `too many messages from host "${peerHost}" just now`)

    const t = this.parseTo(f.to)
    if (t.host !== null && t.host !== this.host) throw new ApiError('UNKNOWN_HOST', `this host is "${this.host}", not "${t.host}"`)
    const target = this.resolveLocal(t.name, t.ref)
    this.checkAcl({ name: from.slice(0, from.indexOf('@')), host: peerHost }, { name: target.name, host: this.host })
    const row = this.deliver(target, { from, kind: 'message', summary, message, reply_to: replyTo }, false, id)
    if (!row) throw new ApiError('RATE_LIMITED', `the inbox of ${this.address(target)} is full`)
  }

  /** A system notice for one of our agents (for example a delivery failure reported later by a peer). */
  deliverNotice(agentId: string, text: string): void {
    const a = this.store.getAgent(agentId)
    if (!a) return
    this.deliver(a, { from: `agentlink@${this.host}`, kind: 'delivery_notice', summary: text.slice(0, LIMITS.maxSummaryChars), message: text, reply_to: null }, true)
  }

  /** What this host tells its peers about its agents. */
  localDirectory(): RemoteAgent[] {
    return this.store
      .allAgents()
      .filter(a => a.active === 1)
      .map(a => ({
        name: a.name,
        ref: a.ref,
        kind: a.kind,
        status: this.statusOf(a),
        cwd: a.cwd,
        unread: this.store.countState(a.agent, 'new'),
        last_seen: Math.floor(a.last_seen / 1000),
      }))
  }

  list(p: Params): Record<string, unknown> {
    const self = this.requireAgent(p)
    const scope = str(p, 'scope') ?? 'all'
    if (scope !== 'local' && scope !== 'all') throw new ApiError('BAD_REQUEST', 'scope must be "local" or "all"')
    const agents = this.store
      .allAgents()
      .filter(a => a.agent !== self.agent)
      .map(a => ({
        address: this.address(a),
        name: a.name,
        ref: a.ref,
        host: this.host,
        kind: a.kind,
        status: this.statusOf(a),
        cwd: a.cwd,
        unread: this.store.countState(a.agent, 'new'),
        last_seen: Math.floor(a.last_seen / 1000),
      }))
    const remoteAgents =
      scope === 'all' && this.remote
        ? this.remote.directory().flatMap(d =>
            d.agents.map(a => ({
              address: `${a.name}@${d.host}`,
              name: a.name,
              ref: a.ref,
              host: d.host,
              kind: a.kind,
              status: a.status,
              cwd: a.cwd,
              unread: a.unread,
              last_seen: a.last_seen,
            })),
          )
        : []
    return { self: this.fromAddress(self), agents: [...agents, ...remoteAgents], hosts: this.remote ? this.remote.hosts() : [] }
  }

  async inbox(p: Params): Promise<Record<string, unknown>> {
    const a = this.requireAgent(p)
    const mode = str(p, 'mode') ?? 'take'
    if (mode !== 'peek' && mode !== 'take') throw new ApiError('BAD_REQUEST', 'mode must be "peek" or "take"')
    const state = str(p, 'state') ?? 'new'
    if (state !== 'new' && state !== 'delivered' && state !== 'acked' && state !== 'any') {
      throw new ApiError('BAD_REQUEST', 'state must be new, delivered, acked or any')
    }
    const limit = int(p, 'limit', LIMITS.inboxDefaultLimit, 1, LIMITS.inboxMaxLimit)
    const waitMs = int(p, 'wait_ms', 0, 0, LIMITS.maxWaitMs)

    let rows = this.store.messagesFor(a.agent, state, limit)
    if (rows.length === 0 && waitMs > 0 && state === 'new') {
      await new Promise<void>(resolve => {
        const done = (): void => {
          clearTimeout(timer)
          this.events.off('message', onMsg)
          resolve()
        }
        const onMsg = (agent: string): void => {
          if (agent === a.agent) done()
        }
        const timer = setTimeout(done, waitMs)
        this.events.on('message', onMsg)
      })
      this.store.touch(a.agent, Date.now())
      rows = this.store.messagesFor(a.agent, state, limit)
    }

    let out: WireMessage[]
    if (mode === 'take') {
      const newIds = rows.filter(r => r.state === 'new').map(r => r.id)
      this.store.markState(newIds, a.agent, 'delivered', ['new'])
      out = rows.map(r => this.toWire(r, r.state === 'new' ? 'delivered' : r.state))
    } else {
      out = rows.map(r => this.toWire(r))
    }
    return { messages: out, remaining: this.store.countState(a.agent, 'new') }
  }

  ack(p: Params): Record<string, unknown> {
    const a = this.requireAgent(p)
    const ids = p.ids
    if (!Array.isArray(ids) || ids.some(i => typeof i !== 'string') || ids.length > 100) {
      throw new ApiError('BAD_REQUEST', '"ids" must be an array of up to 100 message ids')
    }
    return { acked: this.store.markState(ids as string[], a.agent, 'acked', ['new', 'delivered']) }
  }

  async notifyWhenIdle(p: Params): Promise<Record<string, unknown>> {
    const a = this.requireAgent(p)
    const t = this.parseTo(str(p, 'target', { required: true }) as string)
    if (t.host !== null && t.host !== this.host) {
      if (!this.remote?.knownHost(t.host)) throw new ApiError('UNKNOWN_HOST', `host "${t.host}" is not in peers.json`)
      this.checkAcl({ name: a.name, host: this.host }, { name: t.name, host: t.host })
      const display = `${t.name}@${t.host}${t.ref ? ` [${t.ref}]` : ''}`
      const frame: WatchFrame = { t: 'watch', id: randomUUID(), target: display, requester: this.fromAddress(a) }
      const status = await this.remote.send(t.host, frame, a.agent, display)
      return { immediate: false, status }
    }
    const target = this.resolveLocal(t.name, t.ref)
    if (target.agent === a.agent) throw new ApiError('BAD_REQUEST', 'cannot watch yourself')
    this.checkAcl({ name: a.name, host: this.host }, { name: target.name, host: this.host })
    if (this.statusOf(target) === 'idle') {
      this.fireImmediate(a, target)
      return { immediate: true }
    }
    this.store.upsertIdleSub(a.agent, target.agent, Date.now())
    return { immediate: false }
  }

  /** A watcher on another host asks to be told when one of our agents becomes idle. */
  receiveWatch(peerHost: string, f: Record<string, unknown>): void {
    const id = f.id
    if (typeof id !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new ApiError('BAD_REQUEST', 'invalid message id')
    const requester = f.requester
    const hostPattern = peerHost.replace(/[.]/g, '\\.')
    const reqRe = new RegExp('^[A-Za-z0-9_-]{1,64}@' + hostPattern + ' \\[[0-9a-f]{4,12}\\]$')
    if (typeof requester !== 'string' || !reqRe.test(requester)) {
      throw new ApiError('FORBIDDEN', `requester address does not belong to host "${peerHost}"`)
    }
    if (typeof f.target !== 'string') throw new ApiError('BAD_REQUEST', '"target" is required')
    if (!this.takeToken(`peer:${peerHost}`)) throw new ApiError('RATE_LIMITED', `too many requests from host "${peerHost}" just now`)
    const t = this.parseTo(f.target)
    if (t.host !== null && t.host !== this.host) throw new ApiError('UNKNOWN_HOST', `this host is "${this.host}", not "${t.host}"`)
    const target = this.resolveLocal(t.name, t.ref)
    this.checkAcl({ name: requester.slice(0, requester.indexOf('@')), host: peerHost }, { name: target.name, host: this.host })
    if (this.statusOf(target) === 'idle') this.sendNotice(peerHost, requester, target, 'idle')
    else this.store.upsertRemoteIdleSub(peerHost, requester, target.agent, Date.now())
  }

  /** The host of an agent we watch says it became idle. The notice text is written here, never taken from the peer. */
  receiveNotice(peerHost: string, f: Record<string, unknown>): void {
    const id = f.id
    if (typeof id !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new ApiError('BAD_REQUEST', 'invalid message id')
    if (this.store.hasMessageId(id)) return
    if (f.kind !== 'idle_notice') throw new ApiError('BAD_REQUEST', 'unsupported notice')
    if (f.reason !== 'idle' && f.reason !== 'offline') throw new ApiError('BAD_REQUEST', 'unsupported notice reason')
    const hostPattern = peerHost.replace(/[.]/g, '\\.')
    const targetRe = new RegExp('^([A-Za-z0-9_-]{1,64})@' + hostPattern + ' \\[([0-9a-f]{4,12})\\]$')
    const m = typeof f.target === 'string' ? targetRe.exec(f.target) : null
    if (!m) throw new ApiError('FORBIDDEN', `target address does not belong to host "${peerHost}"`)
    if (typeof f.to !== 'string') throw new ApiError('BAD_REQUEST', '"to" is required')
    if (!this.takeToken(`peer:${peerHost}`)) throw new ApiError('RATE_LIMITED', `too many notices from host "${peerHost}" just now`)
    const t = this.parseTo(f.to)
    if (t.host !== null && t.host !== this.host) throw new ApiError('UNKNOWN_HOST', `this host is "${this.host}", not "${t.host}"`)
    const requester = this.resolveLocal(t.name, t.ref)
    const who = `${m[1]}@${peerHost}`
    const text = f.reason === 'idle' ? `${who} is idle` : `${who} exited or went offline`
    this.deliver(requester, { from: `agentlink@${peerHost}`, kind: 'idle_notice', summary: text, message: text, reply_to: null }, true, id)
  }

  private fireImmediate(requester: AgentRow, target: AgentRow): void {
    const text = `${this.address(target)} is idle`
    this.deliver(requester, { from: `agentlink@${this.host}`, kind: 'idle_notice', summary: text, message: text, reply_to: null }, true)
  }

  /** Called by the server when a subscribed connection receives a message. */
  markDelivered(agent: string, id: string): void {
    this.store.markState([id], agent, 'delivered', ['new'])
  }

  sweep(): void {
    const now = Date.now()
    for (const target of this.store.idleSubTargets()) {
      const a = this.store.getAgent(target)
      if (!a) continue
      if (this.statusOf(a) === 'offline') this.fireIdle(a, 'offline')
    }
    this.store.deleteAckedBefore(now - LIMITS.ackedRetentionMs)
    for (const id of this.store.inactiveAgentsWithoutMessages(now - LIMITS.inactiveAgentGcMs)) this.store.deleteAgent(id)
    for (const [k, t] of this.recent) if (now - t > this.cfg.dupWindowMs) this.recent.delete(k)
    for (const [k, b] of this.buckets) if (now - b.last > 120_000) this.buckets.delete(k)
  }
}
