// Joining a new PC with only its address and a confirmation number: see docs/JOIN.md (design) and docs/JOIN-API.md (specification).
//   The receiving PC (H) opens a window. The new PC (J) connects and sends a commitment; H answers with a nonce; J reveals its nonce.
//   Both compute the same 6-digit number from what each of them saw (the certificate of H among it). J shows it, H never does: a person types
//   it at H, which approves exactly one request by its id. Only then is a token handed over, and H writes peers.json after J confirmed it.
import { randomBytes } from 'node:crypto'
import net from 'node:net'
import { WebSocket } from 'ws'
import type { Config } from './config.ts'
import { joinCommit, joinSas, normalizeHostName, parseDigits, sasEquals } from './join-sas.ts'
import { ApiError } from './protocol.ts'
import { displayFingerprint, normalizeFingerprint } from './tls.ts'

/** What the join service needs from the LAN layer (implemented by PeerManager). */
export interface JoinHost {
  selfHost: string
  /** Fingerprint of this PC's certificate (lowercase hex). */
  fingerprint: string
  /** Opens the LAN port for a window (or notes that it is open already) and says where it is. */
  openLanPort(address?: string, port?: number): Promise<{ address: string; port: number }>
  /** The window is over: the port may close unless something else still needs it. */
  closeLanPort(): Promise<void>
  /** The address of an existing peer ('' when it only connects to us), or null when there is no such peer. */
  peerAddress(name: string): string | null
  /** Receiving side: record the new PC (peers.json) and apply it. */
  addJoinedPeer(name: string, token: string, listen: { host: string; port: number }): Promise<void>
  /** Joining side: record the PC we joined. */
  addHostPeer(entry: { name: string; address: string; port: number; token: string; fingerprint: string }): Promise<void>
}

const now = (): number => performance.now()
const ID_RE = /^[0-9a-f]{4}$/
const NONCE_HEX_RE = /^[0-9a-f]{32}$/
const TOKEN_HEX_RE = /^[0-9a-f]{64}$/
/** Wrong numbers typed at the receiving PC: per request, and in all before the window closes. */
const REQUEST_ATTEMPTS = 3
const WINDOW_ATTEMPTS = 5
/** After this many malformed or misordered sessions an address is turned away for a while. */
const PROTOCOL_ERRORS = 3
const PROTOCOL_BACKOFF_MS = 60_000
const RECENT_KEPT = 5

type SessionState = 'handshake' | 'pending' | 'approving'

interface Session {
  id: string
  ws: WebSocket
  ip: string
  host: string
  commit: string
  nonceH: Buffer
  sas: string | null
  state: SessionState
  failures: number
  since: number
  timer: NodeJS.Timeout | null
  replaces: { host: string; address: string } | null
  /** Set while approving: called when the new PC confirmed (true) or the attempt failed (false). */
  finish: ((ok: boolean) => void) | null
}

interface Window {
  expiresAt: number
  count: number
  failures: number
  started: number
  address: string
  port: number
  timer: NodeJS.Timeout
}

type Result = 'joined' | 'rejected' | 'expired' | 'failed'

export interface PendingView {
  open: boolean
  expires_s: number | null
  remaining: number
  requests: Array<{ id: string; host: string; address: string; age_s: number; state: 'pending' | 'approving'; replaces: { host: string; address: string } | null }>
  recent: Array<{ host: string; address: string; result: Result; ago_s: number }>
}

/** The messages an error reason becomes on the joining side. */
const REASON_TEXT: Record<string, string> = {
  window_closed: 'the other PC is not accepting new PCs; run "agentctl pair --open" there first',
  busy: 'the other PC has too many requests waiting (or one from this address already); try again in a moment',
  bad_name: 'the other PC does not accept this host name',
  rate_limited: 'too many attempts at the other PC; wait a few seconds and try again',
  rejected: 'the other PC turned the request down',
  request_gone: 'the request is gone (it expired or the window closed)',
  bad_order: 'protocol error (frames in the wrong order)',
  bad_commit: 'protocol error (the revealed value does not match)',
  bad_frame: 'protocol error (malformed frame)',
}

export class JoinService {
  private host: JoinHost
  private cfg: Config
  private log: (line: string) => void
  private window: Window | null = null
  private sessions = new Map<string, Session>()
  private byWs = new Map<WebSocket, Session>()
  private recent: Array<{ host: string; address: string; result: Result; at: number }> = []
  private ipLast = new Map<string, number>()
  private ipErrors = new Map<string, { count: number; until: number }>()
  private starts: number[] = []
  private outgoing = new Map<string, Outgoing>()

  constructor(host: JoinHost, cfg: Config, log: (line: string) => void) {
    this.host = host
    this.cfg = cfg
    this.log = log
  }

  isOpen(): boolean {
    return this.window !== null
  }

  // --- receiving side: the window --------------------------------------------------------------------------

  async open(opts: { ttlS?: number; count?: number; address?: string; port?: number }): Promise<Record<string, unknown>> {
    const ttlS = Math.min(Math.max(opts.ttlS ?? 600, this.cfg.joinMinTtlS), 3600)
    const count = Math.min(Math.max(Math.floor(opts.count ?? 1), 1), 8)
    if (this.window) await this.close('reopened')
    const where = await this.host.openLanPort(opts.address, opts.port)
    const timer = setTimeout(() => void this.close('expired'), ttlS * 1000)
    timer.unref()
    this.window = { expiresAt: now() + ttlS * 1000, count, failures: 0, started: 0, address: where.address, port: where.port, timer }
    this.log(`join window opened on ${where.address}:${where.port} for ${ttlS}s (${count} PC${count === 1 ? '' : 's'})`)
    return {
      open: true,
      expires_s: ttlS,
      count,
      host: this.host.selfHost,
      address: where.address,
      port: where.port,
      command: `agentctl join ${where.address}${where.port === 7420 ? '' : `:${where.port}`}`,
    }
  }

  async close(reason: string): Promise<Record<string, unknown>> {
    const w = this.window
    if (!w) return { open: false }
    clearTimeout(w.timer)
    this.window = null
    for (const s of [...this.sessions.values()]) this.dropSession(s, s.state === 'handshake' ? 'failed' : 'expired', 'window_closed')
    this.log(`join window closed (${reason})`)
    await this.host.closeLanPort()
    return { open: false }
  }

  pending(): PendingView {
    const w = this.window
    const t = now()
    return {
      open: w !== null,
      expires_s: w ? Math.max(0, Math.round((w.expiresAt - t) / 1000)) : null,
      remaining: w ? w.count : 0,
      requests: [...this.sessions.values()]
        .filter((s): s is Session & { state: 'pending' | 'approving' } => s.state !== 'handshake')
        .map(s => ({ id: s.id, host: s.host, address: s.ip, age_s: Math.round((t - s.since) / 1000), state: s.state, replaces: s.replaces })),
      recent: this.recent.slice(-RECENT_KEPT).map(r => ({ host: r.host, address: r.address, result: r.result, ago_s: Math.round((t - r.at) / 1000) })),
    }
  }

  private remember(s: Session, result: Result): void {
    this.recent.push({ host: s.host, address: s.ip, result, at: now() })
    if (this.recent.length > 50) this.recent.shift()
  }

  /** Ends a session: tells the new PC why (unless it is gone already), closes its socket and forgets it. */
  private dropSession(s: Session, result: Result, reason: string): void {
    if (!this.sessions.delete(s.id)) return
    this.byWs.delete(s.ws)
    if (s.timer) clearTimeout(s.timer)
    if (s.state !== 'handshake') this.remember(s, result)
    const finish = s.finish
    s.finish = null
    try {
      s.ws.send(JSON.stringify({ t: 'error', code: 'FORBIDDEN', reason }))
    } catch {
      // already closed
    }
    try {
      s.ws.close(1008, reason)
    } catch {
      // already closed
    }
    finish?.(false)
  }

  // --- receiving side: frames of the protocol (called for connections that have not identified themselves) ---

  /** Returns 'keep' when the socket now belongs to a join session (the caller stops its handshake timer), 'close' when it was turned away. */
  onFrame(ws: WebSocket, f: Record<string, unknown>, ip: string): 'keep' | 'close' {
    if (f.t === 'join') return this.onJoin(ws, f, ip)
    const s = this.byWs.get(ws)
    if (!s) return this.turnAway(ws, ip, 'bad_order', true)
    if (f.t === 'join_reveal') return this.onReveal(s, f)
    if (f.t === 'join_done') {
      if (s.state !== 'approving' || !s.finish) return this.turnAway(ws, ip, 'bad_order', true)
      const finish = s.finish
      s.finish = null
      finish(true)
      return 'keep'
    }
    return this.turnAway(ws, ip, 'bad_frame', true)
  }

  private turnAway(ws: WebSocket, ip: string, reason: string, protocolError: boolean): 'close' {
    if (protocolError) {
      const e = this.ipErrors.get(ip) ?? { count: 0, until: 0 }
      e.count++
      if (e.count >= PROTOCOL_ERRORS) e.until = now() + PROTOCOL_BACKOFF_MS
      this.ipErrors.set(ip, e)
    }
    const s = this.byWs.get(ws)
    if (s) this.dropSession(s, 'failed', reason)
    else {
      try {
        ws.send(JSON.stringify({ t: 'error', code: 'FORBIDDEN', reason }))
      } catch {
        // already closed
      }
      ws.close(1008, reason)
    }
    return 'close'
  }

  private onJoin(ws: WebSocket, f: Record<string, unknown>, ip: string): 'keep' | 'close' {
    const w = this.window
    const t = now()
    if (!w || t > w.expiresAt) return this.turnAway(ws, ip, 'window_closed', false)
    if (this.byWs.has(ws)) return this.turnAway(ws, ip, 'bad_order', true)
    const blocked = this.ipErrors.get(ip)
    if (blocked && blocked.until > t) return this.turnAway(ws, ip, 'rate_limited', false)

    // Every session start counts, the ones that are dropped a moment later too.
    this.starts = this.starts.filter(x => t - x < 5000)
    const last = this.ipLast.get(ip)
    if (w.started >= this.cfg.joinWindowBudget || this.starts.length >= this.cfg.joinGlobalBurst || (last !== undefined && t - last < this.cfg.joinIpIntervalMs)) {
      return this.turnAway(ws, ip, 'rate_limited', false)
    }
    w.started++
    this.starts.push(t)
    this.ipLast.set(ip, t)

    const host = typeof f.host === 'string' ? normalizeHostName(f.host) : null
    if (f.v !== 1 || typeof f.commit !== 'string' || !/^[0-9a-f]{64}$/.test(f.commit)) return this.turnAway(ws, ip, 'bad_frame', true)
    if (host === null || host === this.host.selfHost) return this.turnAway(ws, ip, 'bad_name', true)
    // A separate pool: when it is full the newcomer is turned away, nobody is evicted.
    if (this.sessions.size >= this.cfg.joinPendingMax || [...this.sessions.values()].some(s => s.ip === ip)) return this.turnAway(ws, ip, 'busy', false)

    let id = randomBytes(2).toString('hex')
    while (this.sessions.has(id)) id = randomBytes(2).toString('hex')
    const known = this.host.peerAddress(host)
    const s: Session = {
      id,
      ws,
      ip,
      host,
      commit: f.commit,
      nonceH: randomBytes(16),
      sas: null,
      state: 'handshake',
      failures: 0,
      since: t,
      timer: null,
      replaces: known === null ? null : { host, address: known === '' ? '(connects to this PC only)' : known },
      finish: null,
    }
    s.timer = setTimeout(() => this.dropSession(s, 'failed', 'bad_order'), this.cfg.joinRevealMs)
    s.timer.unref()
    this.sessions.set(id, s)
    this.byWs.set(ws, s)
    ws.once('close', () => this.onClosed(ws))
    ws.send(JSON.stringify({ t: 'join_challenge', v: 1, host: this.host.selfHost, nonce: s.nonceH.toString('hex') }))
    return 'keep'
  }

  private onReveal(s: Session, f: Record<string, unknown>): 'keep' | 'close' {
    if (s.state !== 'handshake') return this.turnAway(s.ws, s.ip, 'bad_order', true)
    if (f.v !== 1 || typeof f.nonce !== 'string' || !NONCE_HEX_RE.test(f.nonce)) return this.turnAway(s.ws, s.ip, 'bad_frame', true)
    const nonceJ = Buffer.from(f.nonce, 'hex')
    if (joinCommit(s.host, nonceJ) !== s.commit) return this.turnAway(s.ws, s.ip, 'bad_commit', true)
    s.sas = joinSas(this.host.fingerprint, s.host, this.host.selfHost, nonceJ, s.nonceH)
    s.state = 'pending'
    if (s.timer) clearTimeout(s.timer)
    s.timer = setTimeout(() => this.dropSession(s, 'expired', 'request_gone'), this.cfg.joinRequestMs)
    s.timer.unref()
    this.log(`join request ${s.id} from ${s.host} (${s.ip})${s.replaces ? ` replaces the peer ${s.replaces.host}` : ''}`)
    return 'keep'
  }

  private onClosed(ws: WebSocket): void {
    const s = this.byWs.get(ws)
    if (!s) return
    this.dropSession(s, s.state === 'handshake' ? 'failed' : 'expired', 'request_gone')
  }

  // --- receiving side: the approval (local API) -----------------------------------------------------------------

  async approve(idRaw: unknown, digitsRaw: unknown): Promise<{ ok: true; host: string; address: string }> {
    const id = typeof idRaw === 'string' ? idRaw.toLowerCase() : ''
    const w = this.window
    if (!w) throw new ApiError('FORBIDDEN', 'no join window is open (run "agentctl pair --open")', { reason: 'window_closed' })
    const s = ID_RE.test(id) ? this.sessions.get(id) : undefined
    if (!s || s.state === 'handshake') throw new ApiError('BAD_REQUEST', `no request "${String(idRaw).slice(0, 12)}" is waiting (see "agentctl pair pending")`, { reason: 'unknown_request' })
    if (s.state === 'approving') throw new ApiError('FORBIDDEN', `request ${s.id} is already being approved`, { reason: 'request_gone' })
    const digits = typeof digitsRaw === 'string' ? parseDigits(digitsRaw) : null
    if (digits === null) throw new ApiError('BAD_REQUEST', 'the confirmation number has 6 digits', { reason: 'bad_digits' })

    if (s.sas === null || !sasEquals(digits, s.sas)) {
      s.failures++
      w.failures++
      if (w.failures >= WINDOW_ATTEMPTS) {
        await this.close('too many wrong numbers')
        throw new ApiError('FORBIDDEN', 'too many wrong numbers: the window is closed', { reason: 'window_closed' })
      }
      if (s.failures >= REQUEST_ATTEMPTS) {
        this.dropSession(s, 'rejected', 'rejected')
        throw new ApiError('FORBIDDEN', `wrong number: request ${s.id} was deleted`, { reason: 'wrong_digits', attempts_left: 0 })
      }
      throw new ApiError('FORBIDDEN', `wrong number (${REQUEST_ATTEMPTS - s.failures} more tries for this request)`, { reason: 'wrong_digits', attempts_left: REQUEST_ATTEMPTS - s.failures })
    }

    // The number is right: hand the token over and write peers.json only after the new PC has confirmed it.
    s.state = 'approving'
    if (s.timer) clearTimeout(s.timer)
    const token = randomBytes(32).toString('hex')
    const confirmed = new Promise<boolean>(resolve => {
      s.finish = resolve
      s.timer = setTimeout(() => this.dropSession(s, 'failed', 'request_gone'), this.cfg.joinDoneMs)
      s.timer.unref()
    })
    try {
      s.ws.send(JSON.stringify({ t: 'joined', v: 1, host: this.host.selfHost, token }))
    } catch {
      this.dropSession(s, 'failed', 'request_gone')
    }
    if (!(await confirmed) || this.sessions.get(s.id) !== s) {
      throw new ApiError('FORBIDDEN', `the new PC did not confirm (request ${s.id} is gone); nothing was saved`, { reason: 'request_gone' })
    }
    if (s.timer) clearTimeout(s.timer)
    await this.host.addJoinedPeer(s.host, token, { host: w.address, port: w.port })
    this.sessions.delete(s.id)
    this.byWs.delete(s.ws)
    this.remember(s, 'joined')
    this.log(`join request ${s.id}: ${s.host} (${s.ip}) is a peer now${s.replaces ? ' (replaced the earlier entry)' : ''}`)
    try {
      s.ws.close(1000, 'joined')
    } catch {
      // gone already
    }
    w.count--
    if (w.count <= 0) await this.close('approved')
    return { ok: true, host: s.host, address: s.ip }
  }

  // --- joining side ---------------------------------------------------------------------------------------------------

  /** Connects to the receiving PC and returns the confirmation number once it is known; the rest happens in the background. */
  start(opts: { address: unknown; port?: unknown; waitS?: unknown }): Promise<{ request: string; sas: string }> {
    const address = typeof opts.address === 'string' ? opts.address.trim() : ''
    if (!net.isIPv4(address)) throw new ApiError('BAD_REQUEST', 'the address must be an IPv4 address like 192.168.0.5 (host names are not accepted)')
    const port = opts.port === undefined ? 7420 : Number(opts.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ApiError('BAD_REQUEST', '"port" must be 1-65535')
    const waitS = opts.waitS === undefined ? 300 : Math.min(Math.max(Number(opts.waitS) || 300, 5), 3600)
    for (const o of this.outgoing.values()) if (o.state === 'waiting') throw new ApiError('BAD_REQUEST', 'a join is already in progress; cancel it first (join_cancel)')
    const out = new Outgoing(randomBytes(4).toString('hex'), address, port)
    this.outgoing.set(out.id, out)
    if (this.outgoing.size > 20) this.outgoing.delete(this.outgoing.keys().next().value as string)
    return out.run(this.host, waitS * 1000, this.log)
  }

  status(request: unknown): Record<string, unknown> {
    const o = typeof request === 'string' ? this.outgoing.get(request) : undefined
    if (!o) throw new ApiError('BAD_REQUEST', 'no such join request')
    return { state: o.state, waited_s: Math.round((now() - o.since) / 1000), ...(o.hostH ? { host: o.hostH } : {}), ...(o.detail ? { detail: o.detail } : {}) }
  }

  cancel(request: unknown): Record<string, unknown> {
    const o = typeof request === 'string' ? this.outgoing.get(request) : undefined
    if (!o) throw new ApiError('BAD_REQUEST', 'no such join request')
    o.finish('cancelled', 'cancelled')
    return { state: o.state }
  }

  stop(): void {
    if (this.window) clearTimeout(this.window.timer)
    for (const s of this.sessions.values()) if (s.timer) clearTimeout(s.timer)
    for (const o of this.outgoing.values()) o.finish('cancelled', 'the daemon is stopping')
  }
}

/** One attempt of this PC to join another. */
class Outgoing {
  id: string
  address: string
  port: number
  state: 'waiting' | 'joined' | 'failed' | 'expired' | 'cancelled' = 'waiting'
  detail: string | null = null
  hostH: string | null = null
  since = now()
  private ws: WebSocket | null = null
  private timer: NodeJS.Timeout | null = null

  constructor(id: string, address: string, port: number) {
    this.id = id
    this.address = address
    this.port = port
  }

  finish(state: 'joined' | 'failed' | 'expired' | 'cancelled', detail: string | null): void {
    if (this.state !== 'waiting') return
    this.state = state
    this.detail = detail
    if (this.timer) clearTimeout(this.timer)
    try {
      this.ws?.close(state === 'joined' ? 1000 : 1008, state)
    } catch {
      // gone already
    }
  }

  run(host: JoinHost, waitMs: number, log: (line: string) => void): Promise<{ request: string; sas: string }> {
    return new Promise((resolve, reject) => {
      const nonceJ = randomBytes(16)
      const hostJ = host.selfHost
      let fpH = ''
      let hostH = ''
      let answered = false
      const fail = (err: ApiError): void => {
        this.finish('failed', err.message)
        if (!answered) {
          answered = true
          reject(err)
        }
      }
      const ws = new WebSocket(`wss://${this.address}:${this.port}`, { rejectUnauthorized: false, handshakeTimeout: 8000, maxPayload: 4096, minVersion: 'TLSv1.2' })
      this.ws = ws
      this.timer = setTimeout(() => {
        this.finish('expired', 'nobody approved the request in time')
        if (!answered) {
          answered = true
          reject(new ApiError('INTERNAL', `no answer from ${this.address}:${this.port} in time`))
        }
      }, waitMs)
      this.timer.unref()

      ws.on('open', () => {
        // The fingerprint comes from this very TLS connection, never from a message.
        const sock = (ws as unknown as { _socket?: { getPeerCertificate?: () => { fingerprint256?: string } } })._socket
        fpH = normalizeFingerprint(sock?.getPeerCertificate?.().fingerprint256 ?? '')
        if (fpH.length !== 64) return fail(new ApiError('INTERNAL', 'could not read the certificate of the other PC'))
        ws.send(JSON.stringify({ t: 'join', v: 1, host: hostJ, commit: joinCommit(hostJ, nonceJ) }))
      })
      ws.on('message', (data, isBinary) => {
        let f: Record<string, unknown> | null = null
        try {
          const parsed = isBinary ? null : JSON.parse(data.toString())
          f = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
        } catch {
          f = null
        }
        if (!f) return fail(new ApiError('INTERNAL', 'unexpected reply from the other PC'))
        if (f.t === 'error') {
          const reason = typeof f.reason === 'string' ? f.reason : ''
          return fail(new ApiError('FORBIDDEN', REASON_TEXT[reason] ?? `the other PC refused (${String(f.code)})`, { reason }))
        }
        if (f.t === 'join_challenge' && !answered) {
          const name = typeof f.host === 'string' ? normalizeHostName(f.host) : null
          if (f.v !== 1 || name === null || name === hostJ || typeof f.nonce !== 'string' || !NONCE_HEX_RE.test(f.nonce)) return fail(new ApiError('INTERNAL', 'unexpected reply from the other PC'))
          hostH = name
          this.hostH = name
          ws.send(JSON.stringify({ t: 'join_reveal', v: 1, nonce: nonceJ.toString('hex') }))
          const sas = joinSas(fpH, hostJ, hostH, nonceJ, Buffer.from(f.nonce, 'hex'))
          answered = true
          resolve({ request: this.id, sas })
          return
        }
        if (f.t === 'joined' && answered && this.state === 'waiting') {
          const name = typeof f.host === 'string' ? normalizeHostName(f.host) : null
          if (f.v !== 1 || name !== hostH || typeof f.token !== 'string' || !TOKEN_HEX_RE.test(f.token)) return this.finish('failed', 'unexpected reply from the other PC')
          host
            .addHostPeer({ name: hostH, address: this.address, port: this.port, token: f.token, fingerprint: displayFingerprint(fpH) })
            .then(() => {
              ws.send(JSON.stringify({ t: 'join_done', v: 1 }))
              this.finish('joined', null)
              log(`joined ${hostH} at ${this.address}:${this.port}`)
            })
            .catch(e => this.finish('failed', String(e instanceof Error ? e.message : e)))
          return
        }
        fail(new ApiError('INTERNAL', 'unexpected reply from the other PC'))
      })
      ws.on('error', e => {
        const code = (e as NodeJS.ErrnoException).code
        const hint =
          code === 'ECONNREFUSED'
            ? 'nothing is listening there: run "agentctl pair --open" on that PC first'
            : `is TCP ${this.port} allowed in the Windows Firewall of that PC (see docs/LAN.md, "Firewall rule"), and is ${this.address} the right address?`
        fail(new ApiError('INTERNAL', `cannot reach ${this.address}:${this.port}: ${e.message}. ${hint}`))
      })
      ws.on('close', () => {
        if (this.state === 'waiting') fail(new ApiError('INTERNAL', 'the other PC closed the connection before the request was approved'))
      })
    })
  }
}
