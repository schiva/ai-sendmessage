// LAN peering: TLS WebSocket links to the hosts listed in peers.json (RFP section 4.1, 6, 8).
//   - every link is a TLS connection; the dialer pins the peer certificate fingerprint (S-02)
//   - the dialed host authenticates the caller with a shared token and the peers.json allow list (S-01, S-02)
//   - messages are stored first (outbox) and sent at least once; the receiver deduplicates by id (F-06, F-07)
import https from 'node:https'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { WebSocket, WebSocketServer } from 'ws'
import type { RawData } from 'ws'
import type { Config } from './config.ts'
import type { Core } from './core.ts'
import { ApiError, NAME_RE, REF_RE } from './protocol.ts'
import type { ErrorCode } from './protocol.ts'
import { DEFAULT_PORT, HOST_RE, loadPeersConfig, upsertPeerFile } from './peers-config.ts'
import type { PeerEntry, PeersConfig } from './peers-config.ts'
import { JoinService } from './join.ts'
import { DEFAULT_PAIR_TTL_S, MAX_PAIR_FAILURES, decodeCode, encodeCode, lanAddresses, linkToken, pairProof, proofMatches } from './pair.ts'
import type { HostStatus, OutFrame, RemoteAgent, RemoteGateway } from './remote.ts'
import type { Store } from './store.ts'
import { displayFingerprint, normalizeFingerprint } from './tls.ts'
import type { TlsMaterial } from './tls.ts'

const MAX_FRAME = 512 * 1024
/** The largest frame accepted from a connection that has not said who it is. */
const MAX_PREAUTH_FRAME = 4096
const HANDSHAKE_MS = 5_000
const MAX_REMOTE_AGENTS = 200
const KNOWN_CODES = new Set<string>([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'NOT_REGISTERED',
  'UNKNOWN_AGENT',
  'AMBIGUOUS_NAME',
  'UNKNOWN_HOST',
  'TOO_LARGE',
  'RATE_LIMITED',
  'FORBIDDEN',
  'LOOP_DETECTED',
  'INTERNAL',
])

type Initiator = 'self' | 'peer'

interface Link {
  host: string
  ws: WebSocket
  initiator: Initiator
  since: number
  alive: boolean
  agents: RemoteAgent[]
  pingTimer: NodeJS.Timeout
  /** What the last list of agents sent to this peer looked like (without last_seen), and when it was sent. */
  lastDirectory: string
  lastDirectoryAt: number
}

interface Dialer {
  peer: PeerEntry
  stopped: boolean
  timer: NodeJS.Timeout | undefined
  backoff: number
  ws: WebSocket | undefined
  lastError: string | null
}

interface Pending {
  resolve: () => void
  /** The other host refused for a passing reason: the message stays queued and is sent again. */
  queue: () => void
  reject: (e: Error) => void
}

/** Refusals that pass: the same message is accepted later. Every other error is final, and an unknown one is treated as final too. */
const TRANSIENT_CODES = new Set<string>(['RATE_LIMITED'])
/** After a retry was sent, wait this long for its answer before it counts as due again (the answer normally takes milliseconds). */
const RETRY_ANSWER_WAIT_MS = 30_000

export function retryDelayMs(attempts: number, baseMs: number): number {
  return Math.min(baseMs * 2 ** Math.max(0, attempts - 1), 60_000)
}

type PairOutcome = 'waiting' | 'paired' | 'expired' | 'cancelled' | 'failed'

interface PairState {
  secret: string
  address: string
  port: number
  expiresAt: number
  failures: number
  state: PairOutcome
  host: string | null
  detail: string | null
  timer: NodeJS.Timeout
}

const isWildcard = (h: string) => h === '0.0.0.0' || h === '::'

function tokenMatches(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function rawLength(d: RawData): number {
  if (Array.isArray(d)) return d.reduce((n, b) => n + b.length, 0)
  return d instanceof ArrayBuffer ? d.byteLength : d.length
}

function parseFrame(data: RawData, isBinary: boolean): Record<string, unknown> | null {
  if (isBinary) return null
  try {
    const f = JSON.parse(data.toString())
    return typeof f === 'object' && f !== null && !Array.isArray(f) ? (f as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function cleanAgents(raw: unknown): RemoteAgent[] {
  if (!Array.isArray(raw)) return []
  const out: RemoteAgent[] = []
  for (const a of raw.slice(0, MAX_REMOTE_AGENTS)) {
    if (typeof a !== 'object' || a === null) continue
    const e = a as Record<string, unknown>
    if (typeof e.name !== 'string' || !NAME_RE.test(e.name)) continue
    if (typeof e.ref !== 'string' || !REF_RE.test(e.ref)) continue
    const kind = typeof e.kind === 'string' && NAME_RE.test(e.kind) ? e.kind : 'generic'
    const status = e.status === 'busy' || e.status === 'idle' ? e.status : 'offline'
    out.push({
      name: e.name,
      ref: e.ref,
      kind,
      status,
      cwd: typeof e.cwd === 'string' ? e.cwd.slice(0, 1024) : null,
      unread: typeof e.unread === 'number' && Number.isFinite(e.unread) ? Math.max(0, Math.floor(e.unread)) : 0,
      last_seen: typeof e.last_seen === 'number' && Number.isFinite(e.last_seen) ? Math.floor(e.last_seen) : 0,
    })
  }
  return out
}

export class PeerManager implements RemoteGateway {
  private core: Core
  private store: Store
  private cfg: Config
  private home: string
  private tls: TlsMaterial
  private selfHost: string
  private log: (line: string) => void
  private config: PeersConfig = { listen: null, peers: [], errors: [] }
  private links = new Map<string, Link>()
  private dialers = new Map<string, Dialer>()
  private pending = new Map<string, Pending>()
  private httpsServer: https.Server | null = null
  private wss: WebSocketServer | null = null
  private listening: { host: string; port: number } | null = null
  private listenError: string | null = null
  private directoryTimer: NodeJS.Timeout | null = null
  private pairing: PairState | null = null
  private listenRetry: NodeJS.Timeout | null = null
  private listenRetryAt: number | null = null
  private lastListenFailure = ''
  private stopped = false
  private unauthenticated: Array<{ ws: WebSocket; ip: string }> = []
  private ipOf = new WeakMap<WebSocket, string>()
  /** Joining a new PC (docs/JOIN.md). */
  readonly join: JoinService

  constructor(opts: { core: Core; store: Store; cfg: Config; home: string; tls: TlsMaterial; selfHost: string; log: (line: string) => void }) {
    this.core = opts.core
    this.store = opts.store
    this.cfg = opts.cfg
    this.home = opts.home
    this.tls = opts.tls
    this.selfHost = opts.selfHost
    this.log = opts.log
    this.join = new JoinService(
      {
        selfHost: opts.selfHost,
        fingerprint: opts.tls.fingerprint,
        openLanPort: (address, port) => this.ensureLanPort(address, port),
        closeLanPort: () => this.releaseLanPort(),
        peerAddress: name => this.config.peers.find(p => p.name === name)?.address ?? (this.config.peers.some(p => p.name === name) ? '' : null),
        addJoinedPeer: async (name, token, listen) => {
          upsertPeerFile(this.home, { name, token, dial: false }, listen)
          await this.apply(loadPeersConfig(this.home, this.selfHost)) // a changed token also ends the link of an entry that is replaced
        },
        addHostPeer: async entry => {
          upsertPeerFile(this.home, { ...entry, dial: true })
          await this.apply(loadPeersConfig(this.home, this.selfHost))
        },
      },
      opts.cfg,
      opts.log,
    )
  }

  // --- RemoteGateway ---------------------------------------------------------------

  knownHost(host: string): boolean {
    return this.config.peers.some(p => p.name === host)
  }

  directory(): Array<{ host: string; agents: RemoteAgent[] }> {
    return [...this.links.values()].map(l => ({ host: l.host, agents: l.agents }))
  }

  hosts(): HostStatus[] {
    return this.config.peers.map(p => {
      const link = this.links.get(p.name)
      return {
        host: p.name,
        link: link ? 'up' : 'down',
        since: link ? Math.floor(link.since / 1000) : null,
        queued: this.store.countOutbox(p.name),
        error: link ? null : (this.dialers.get(p.name)?.lastError ?? null),
      }
    })
  }

  async send(host: string, frame: OutFrame, senderAgent: string, toDisplay: string): Promise<'stored' | 'queued_remote'> {
    // A host that stays away must not make the outbox grow without bound. Only messages are refused: idle notices are small and expire.
    if (frame.t === 'msg') {
      const { count, bytes } = this.store.outboxUsage(host)
      if (count >= this.cfg.outboxMaxMessages || bytes + JSON.stringify(frame).length > this.cfg.outboxMaxBytes) {
        throw new ApiError(
          'RATE_LIMITED',
          `${count} message${count === 1 ? ' is' : 's are'} already waiting for ${host} (${Math.ceil(bytes / 1024)} KiB), the limit is ${this.cfg.outboxMaxMessages} messages or ${Math.round(this.cfg.outboxMaxBytes / 1024 / 1024)} MiB; ${host} has not been reachable. Try again when the link is up.`,
        )
      }
    }
    this.store.insertOutbox({
      id: frame.id,
      peer: host,
      frame: JSON.stringify(frame),
      sender_agent: senderAgent,
      to_display: toDisplay,
      created_ms: Date.now(),
    })
    const link = this.links.get(host)
    if (!link) return 'queued_remote'
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(frame.id)
        resolve('queued_remote')
      }, this.cfg.ackWaitMs)
      this.pending.set(frame.id, {
        resolve: () => {
          clearTimeout(timer)
          resolve('stored')
        },
        queue: () => {
          clearTimeout(timer)
          resolve('queued_remote')
        },
        reject: e => {
          clearTimeout(timer)
          reject(e)
        },
      })
      try {
        link.ws.send(JSON.stringify(frame))
      } catch {
        clearTimeout(timer)
        this.pending.delete(frame.id)
        resolve('queued_remote')
      }
    })
  }

  // --- configuration -----------------------------------------------------------------

  status(): Record<string, unknown> {
    return {
      host: this.selfHost,
      fingerprint: displayFingerprint(this.tls.fingerprint),
      listening: this.listening,
      listen_error: this.listenError,
      listen_retry_s: this.listenRetryAt === null ? null : Math.max(0, Math.ceil((this.listenRetryAt - Date.now()) / 1000)),
      config_errors: this.config.errors,
      peers: this.hosts(),
    }
  }

  async apply(next: PeersConfig): Promise<void> {
    const prev = this.config
    this.config = next

    // Peers that disappeared or changed: drop their dialer and link.
    for (const [name, d] of [...this.dialers]) {
      const n = next.peers.find(p => p.name === name)
      const same = n && n.dial && n.address === d.peer.address && n.port === d.peer.port && n.token === d.peer.token && n.fingerprint === d.peer.fingerprint
      if (!same) this.stopDialer(name)
    }
    for (const [name, link] of [...this.links]) {
      const before = prev.peers.find(p => p.name === name)
      const n = next.peers.find(p => p.name === name)
      if (!n || !before || n.token !== before.token) link.ws.close(1000, 'peer configuration changed')
    }
    for (const p of next.peers) if (p.dial && !this.dialers.has(p.name)) this.startDialer(p)

    // Listener.
    const want = next.listen
    const have = this.listening
    if (!want || !have || want.host !== have.host || want.port !== have.port) {
      await this.stopListener()
      if (want) await this.startListener(want)
    }
    this.scheduleListenRetry()

    if (next.peers.length > 0 && !this.directoryTimer) {
      this.directoryTimer = setInterval(() => this.broadcastDirectory(), this.cfg.directoryMs)
      this.directoryTimer.unref()
    }
    if (next.peers.length === 0 && this.directoryTimer) {
      clearInterval(this.directoryTimer)
      this.directoryTimer = null
    }
    for (const e of next.errors) this.log(`peers.json: ${e}`)
  }

  async stop(): Promise<void> {
    this.stopped = true
    this.join.stop()
    if (this.listenRetry) clearTimeout(this.listenRetry)
    this.listenRetry = null
    this.listenRetryAt = null
    if (this.pairing) clearTimeout(this.pairing.timer)
    if (this.directoryTimer) clearInterval(this.directoryTimer)
    this.directoryTimer = null
    for (const name of [...this.dialers.keys()]) this.stopDialer(name)
    for (const l of this.links.values()) l.ws.terminate()
    await this.stopListener()
  }

  /** Called periodically by the daemon: sends refused messages again when their time has come, and expires undeliverable ones. */
  sweep(): void {
    this.retryDue()
    const expired = this.store.outboxExpired(Date.now() - this.cfg.outboxTtlMs)
    for (const row of expired) {
      this.store.deleteOutbox(row.id)
      this.core.deliverNotice(row.sender_agent, `Message to ${row.to_display} could not be delivered within ${Math.round(this.cfg.outboxTtlMs / 3_600_000)}h and was dropped.`)
    }
  }

  // --- pairing (see pair.ts) ---------------------------------------------------------------------------

  /** Host side: opens the LAN port for one joining PC and returns the code to type there. */
  async startPairing(opts: { address?: string; port?: number; ttlS?: number }): Promise<Record<string, unknown>> {
    const ttlS = Math.min(Math.max(opts.ttlS ?? DEFAULT_PAIR_TTL_S, this.cfg.pairMinTtlS), 3600)
    if (this.pairing) {
      clearTimeout(this.pairing.timer)
      this.pairing.state = 'cancelled'
      this.pairing.secret = ''
    }
    const { address, port } = await this.ensureLanPort(opts.address, opts.port)
    const secret = randomBytes(16).toString('hex')
    const timer = setTimeout(() => this.endPairing('expired'), ttlS * 1000)
    timer.unref()
    this.pairing = { secret, address, port, expiresAt: Date.now() + ttlS * 1000, failures: 0, state: 'waiting', host: null, detail: null, timer }
    this.log(`pairing opened on ${address}:${port} for ${ttlS}s`)
    const others = lanAddresses().filter(a => a !== address)
    return { code: encodeCode({ address, port, fingerprint: this.tls.fingerprint, secret }), address, port, expires_s: ttlS, host: this.selfHost, other_addresses: others }
  }

  /** Opens the LAN port for a pairing or a join window (or finds it open) and says where it is. */
  private async ensureLanPort(addressOpt?: string, portOpt?: number): Promise<{ address: string; port: number }> {
    const l = this.listening
    const port = portOpt ?? l?.port ?? DEFAULT_PORT
    let address = addressOpt
    if (!address) address = l && !isWildcard(l.host) && l.host !== '127.0.0.1' ? l.host : lanAddresses()[0]
    if (!address) throw new ApiError('BAD_REQUEST', 'no LAN address of this PC found; pass --address <IP of this PC>')
    const reachable = this.listening && this.listening.port === port && (this.listening.host === address || isWildcard(this.listening.host))
    if (!reachable) {
      if (this.join.isOpen()) throw new ApiError('BAD_REQUEST', `a join window is open on ${this.listening?.host}:${this.listening?.port}; close it first ("agentctl pair --close") to use another address or port`)
      await this.stopListener()
      await this.startListener({ host: address, port })
      if (!this.listening) {
        const why = this.listenError ?? 'unknown error'
        await this.restoreListener()
        throw new ApiError('INTERNAL', `cannot listen on ${address}:${port}: ${why}`)
      }
    }
    return { address, port }
  }

  /** A pairing or join window is over: the port goes back to what peers.json asks for, unless the other kind of window still needs it. */
  private async releaseLanPort(): Promise<void> {
    if (this.pairing?.state === 'waiting' || this.join.isOpen()) return
    await this.restoreListener()
  }

  pairStatus(): Record<string, unknown> {
    const p = this.pairing
    if (!p) return { state: 'none' }
    return { state: p.state, host: p.host, detail: p.detail, expires_s: Math.max(0, Math.round((p.expiresAt - Date.now()) / 1000)) }
  }

  cancelPairing(): Record<string, unknown> {
    if (this.pairing?.state === 'waiting') this.endPairing('cancelled')
    return this.pairStatus()
  }

  private endPairing(state: PairOutcome, host: string | null = null, detail: string | null = null): void {
    const p = this.pairing
    if (!p || p.state !== 'waiting') return
    clearTimeout(p.timer)
    p.state = state
    p.host = host
    p.detail = detail
    p.secret = ''
    this.log(`pairing ${state}${host ? ` with ${host}` : ''}${detail ? `: ${detail}` : ''}`)
    // The port was only opened for pairing; go back to what peers.json asks for. After a success `apply` follows anyway.
    if (state !== 'paired') void this.releaseLanPort()
  }

  private async restoreListener(): Promise<void> {
    try {
      await this.apply(loadPeersConfig(this.home, this.selfHost))
    } catch (e) {
      this.log(`could not restore the listener: ${String(e)}`)
    }
  }

  /** Host side: a joining PC sent a `pair` frame. */
  private onPair(ws: WebSocket, f: Record<string, unknown>): void {
    const refuse = (code: string) => {
      try {
        ws.send(JSON.stringify({ t: 'error', code }))
      } catch {
        // closing anyway
      }
      ws.close(1008, 'refused')
    }
    const p = this.pairing
    if (!p || p.state !== 'waiting' || Date.now() > p.expiresAt) return refuse('UNAUTHORIZED')
    const host = typeof f.host === 'string' ? f.host.toLowerCase() : ''
    if (f.v !== 1 || !HOST_RE.test(host) || host === this.selfHost) return refuse('BAD_REQUEST')
    if (!proofMatches(f.proof, pairProof(p.secret, host))) {
      p.failures++
      this.log(`pairing: wrong proof from "${host.slice(0, 64)}" (${p.failures}/${MAX_PAIR_FAILURES})`)
      if (p.failures >= MAX_PAIR_FAILURES) this.endPairing('failed', null, 'too many wrong attempts')
      return refuse('UNAUTHORIZED')
    }
    try {
      upsertPeerFile(this.home, { name: host, token: linkToken(p.secret), dial: false }, { host: p.address, port: p.port })
    } catch (e) {
      this.endPairing('failed', null, e instanceof Error ? e.message : String(e))
      return refuse('INTERNAL')
    }
    this.endPairing('paired', host)
    ws.send(JSON.stringify({ t: 'paired', v: 1, host: this.selfHost }), () => {
      ws.close(1000, 'paired')
      void this.releaseLanPort()
    })
  }

  /** Joining side: connects to the host that made `codeText`, proves the code and records the host in peers.json. */
  joinPairing(codeText: string): Promise<{ host: string; address: string; port: number }> {
    const c = decodeCode(codeText)
    if (typeof c === 'string') throw new ApiError('BAD_REQUEST', c)
    if (c.fingerprint === this.tls.fingerprint) throw new ApiError('BAD_REQUEST', 'this code was made by this PC; run "agentctl pair <code>" on the other PC')
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://${c.address}:${c.port}`, { rejectUnauthorized: false, handshakeTimeout: HANDSHAKE_MS, maxPayload: MAX_FRAME, minVersion: 'TLSv1.2' })
      let settled = false
      const finish = (err: ApiError | null, value?: { host: string; address: string; port: number }) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (err) {
          try {
            ws.terminate()
          } catch {
            // already closed
          }
          reject(err)
        } else {
          ws.close(1000, 'paired')
          resolve(value as { host: string; address: string; port: number })
        }
      }
      const timer = setTimeout(() => finish(new ApiError('INTERNAL', `no answer from ${c.address}:${c.port} within 15 s`)), 15_000)
      ws.on('open', () => {
        const sock = (ws as unknown as { _socket?: { getPeerCertificate?: () => { fingerprint256?: string } } })._socket
        const got = normalizeFingerprint(sock?.getPeerCertificate?.().fingerprint256 ?? '')
        if (got !== c.fingerprint) {
          return finish(new ApiError('FORBIDDEN', `the certificate at ${c.address}:${c.port} does not match the code (wrong code, or another PC answers on that address)`))
        }
        ws.send(JSON.stringify({ t: 'pair', v: 1, host: this.selfHost, proof: pairProof(c.secret, this.selfHost) }))
      })
      ws.on('message', (data, isBinary) => {
        const f = parseFrame(data, isBinary)
        if (!f) return finish(new ApiError('INTERNAL', 'unexpected reply from the other PC'))
        if (f.t === 'error') return finish(new ApiError('FORBIDDEN', `the other PC refused the code (${String(f.code)}): it may have expired, been used already, or be mistyped`))
        const peerHost = f.t === 'paired' && typeof f.host === 'string' ? f.host.toLowerCase() : ''
        if (!HOST_RE.test(peerHost) || peerHost === this.selfHost) return finish(new ApiError('INTERNAL', 'unexpected reply from the other PC'))
        try {
          upsertPeerFile(this.home, { name: peerHost, address: c.address, port: c.port, token: linkToken(c.secret), fingerprint: displayFingerprint(c.fingerprint), dial: true })
        } catch (e) {
          return finish(new ApiError('INTERNAL', e instanceof Error ? e.message : String(e)))
        }
        this.apply(loadPeersConfig(this.home, this.selfHost)).then(
          () => finish(null, { host: peerHost, address: c.address, port: c.port }),
          e => finish(new ApiError('INTERNAL', String(e))),
        )
      })
      ws.on('error', e => {
        const code = (e as NodeJS.ErrnoException).code
        // The PC answered with "nothing is listening": its pairing is over (code expired or cancelled). No answer at all points at the
        // firewall or at a wrong address.
        const hint =
          code === 'ECONNREFUSED'
            ? `nothing is waiting for a pairing there: the code has probably expired or was cancelled. Run "agentctl pair" again on that PC.`
            : `Is TCP ${c.port} allowed in the Windows Firewall of that PC (see docs/LAN.md, "Firewall rule"), and is ${c.address} the right address?`
        finish(new ApiError('INTERNAL', `cannot reach ${c.address}:${c.port}: ${e.message}. ${hint}`))
      })
      ws.on('close', () => finish(new ApiError('INTERNAL', 'the other PC closed the connection before pairing finished')))
    })
  }

  // --- listener (inbound links) ------------------------------------------------------------

  private startListener(l: { host: string; port: number }): Promise<void> {
    return new Promise(resolve => {
      const server = https.createServer({ key: this.tls.key, cert: this.tls.cert, minVersion: 'TLSv1.2' })
      const wss = new WebSocketServer({ server, maxPayload: MAX_FRAME })
      wss.on('connection', (ws, req) => {
        this.admitUnauthenticated(ws, req.socket.remoteAddress ?? '')
        this.bind(ws, 'peer', null, () => this.forgetUnauthenticated(ws))
      })
      // ws re-emits the errors of the server it is attached to. Without a listener that is an uncaught exception, and a busy port or a
      // missing address would kill the daemon before the handler below runs. The server's own handler deals with it.
      wss.on('error', () => {})
      server.once('error', e => {
        this.listenError = `${(e as NodeJS.ErrnoException).code ?? 'error'}: ${e.message}`
        const failure = `listener ${l.host}:${l.port} failed: ${this.listenError}`
        if (failure !== this.lastListenFailure) this.log(failure) // a retry that fails the same way is not logged again
        this.lastListenFailure = failure
        wss.close()
        resolve()
      })
      server.listen(l.port, l.host, () => {
        this.httpsServer = server
        this.wss = wss
        this.listening = { host: l.host, port: (server.address() as { port: number }).port }
        this.listenError = null
        this.lastListenFailure = ''
        this.log(`listening for peers on ${l.host}:${this.listening.port}`)
        resolve()
      })
    })
  }

  /**
   * peers.json asks for a LAN port but it is not open (the address is not up yet after a boot or a network change, or the port is busy):
   * try again every listenRetryMs until it opens, instead of staying closed until someone reloads or restarts.
   */
  private scheduleListenRetry(): void {
    if (this.listenRetry) clearTimeout(this.listenRetry)
    this.listenRetry = null
    this.listenRetryAt = null
    if (this.stopped || !this.config.listen || this.listening) return
    this.listenRetryAt = Date.now() + this.cfg.listenRetryMs
    this.listenRetry = setTimeout(() => {
      this.listenRetry = null
      this.listenRetryAt = null
      const want = this.config.listen
      if (this.stopped || !want || this.listening) return
      void this.startListener(want).then(() => this.scheduleListenRetry())
    }, this.cfg.listenRetryMs)
    this.listenRetry.unref()
  }

  /**
   * Connections that have not said who they are yet are limited, so that idle sockets cannot use up the daemon: when the limit for
   * one address (or the overall limit) is reached, the oldest of them is closed to make room. A peer that connects now is never turned
   * away, and whoever opens many sockets only closes its own.
   */
  private admitUnauthenticated(ws: WebSocket, ip: string): void {
    const drop = (entry: { ws: WebSocket }) => {
      this.unauthenticated = this.unauthenticated.filter(e => e !== entry)
      entry.ws.terminate()
    }
    const sameIp = this.unauthenticated.filter(e => e.ip === ip)
    if (sameIp.length >= this.cfg.maxPreAuthPerIp) drop(sameIp[0])
    if (this.unauthenticated.length >= this.cfg.maxPreAuth) drop(this.unauthenticated[0])
    this.ipOf.set(ws, ip)
    this.unauthenticated.push({ ws, ip })
    ws.once('close', () => this.forgetUnauthenticated(ws))
  }

  private forgetUnauthenticated(ws: WebSocket): void {
    this.unauthenticated = this.unauthenticated.filter(e => e.ws !== ws)
  }

  private stopListener(): Promise<void> {
    const server = this.httpsServer
    const wss = this.wss
    this.httpsServer = null
    this.wss = null
    this.listening = null
    if (!server || !wss) return Promise.resolve()
    for (const c of wss.clients) c.terminate()
    return new Promise(resolve => wss.close(() => server.close(() => resolve())))
  }

  // --- dialers (outbound links) ---------------------------------------------------------------

  /** The link initiated by the host with the smaller name is the one both sides keep. */
  private winnerInitiator(host: string): Initiator {
    return this.selfHost < host ? 'self' : 'peer'
  }

  private startDialer(peer: PeerEntry): void {
    const d: Dialer = { peer, stopped: false, timer: undefined, backoff: this.cfg.peerReconnectMinMs, ws: undefined, lastError: null }
    this.dialers.set(peer.name, d)
    this.attempt(d)
  }

  private stopDialer(name: string): void {
    const d = this.dialers.get(name)
    if (!d) return
    d.stopped = true
    if (d.timer) clearTimeout(d.timer)
    try {
      d.ws?.terminate()
    } catch {
      // already closed
    }
    this.dialers.delete(name)
  }

  private schedule(d: Dialer, ms: number): void {
    if (d.stopped) return
    d.timer = setTimeout(() => this.attempt(d), ms)
    d.timer.unref()
  }

  private attempt(d: Dialer): void {
    if (d.stopped) return
    const existing = this.links.get(d.peer.name)
    if (existing && existing.initiator === this.winnerInitiator(d.peer.name)) {
      this.schedule(d, this.cfg.peerReconnectMinMs)
      return
    }
    const { peer } = d
    const ws = new WebSocket(`wss://${peer.address}:${peer.port}`, {
      rejectUnauthorized: false, // self-signed: trust comes from the pinned fingerprint below
      handshakeTimeout: HANDSHAKE_MS,
      maxPayload: MAX_FRAME,
      minVersion: 'TLSv1.2',
    })
    d.ws = ws
    let opened = false
    ws.on('open', () => {
      opened = true
      const sock = (ws as unknown as { _socket?: { getPeerCertificate?: () => { fingerprint256?: string } } })._socket
      const got = normalizeFingerprint(sock?.getPeerCertificate?.().fingerprint256 ?? '')
      if (got !== peer.fingerprint) {
        d.lastError = `certificate fingerprint mismatch (pinned ${displayFingerprint(peer.fingerprint)}, got ${got ? displayFingerprint(got) : 'none'})`
        this.log(`peer ${peer.name}: ${d.lastError}`)
        ws.terminate()
        return
      }
      ws.send(JSON.stringify({ t: 'hello', v: 1, host: this.selfHost, token: peer.token }))
      this.bind(ws, 'self', peer.name, () => {
        d.backoff = this.cfg.peerReconnectMinMs
        d.lastError = null
      }, msg => {
        d.lastError = msg
      })
    })
    ws.on('error', e => {
      if (!opened || !d.lastError) d.lastError = e.message
    })
    ws.on('close', () => {
      if (d.ws === ws) d.ws = undefined
      this.schedule(d, d.backoff)
      d.backoff = Math.min(d.backoff * 2, this.cfg.peerReconnectMaxMs)
    })
  }

  // --- one socket, both directions -----------------------------------------------------------------

  private bind(ws: WebSocket, initiator: Initiator, expectHost: string | null, onUp?: () => void, onProblem?: (msg: string) => void): void {
    let host: string | null = null
    const authTimer = setTimeout(() => ws.terminate(), HANDSHAKE_MS)
    ws.on('close', () => clearTimeout(authTimer))
    ws.on('error', () => {})

    ws.on('message', (data, isBinary) => {
      // Before a peer has identified itself a frame is small; refuse anything larger without reading it.
      if (host === null && initiator === 'peer' && rawLength(data) > MAX_PREAUTH_FRAME) {
        ws.terminate()
        return
      }
      const f = parseFrame(data, isBinary)
      if (!f) {
        ws.terminate()
        return
      }

      if (host === null) {
        // Handshake phase.
        if (initiator === 'peer') {
          if (f.t === 'pair') return this.onPair(ws, f)
          if (f.t === 'join' || f.t === 'join_reveal' || f.t === 'join_done') {
            // A join session may wait for minutes: it leaves the pre-auth pool and its handshake timer.
            if (this.join.onFrame(ws, f, this.ipOf.get(ws) ?? '') === 'keep') {
              clearTimeout(authTimer)
              this.forgetUnauthenticated(ws)
            }
            return
          }
          const peer = f.t === 'hello' && f.v === 1 && typeof f.host === 'string' ? this.config.peers.find(p => p.name === f.host) : undefined
          if (!peer || !tokenMatches(f.token, peer.token)) {
            this.log(`rejected inbound peer "${String(f.host).slice(0, 64)}": ${peer ? 'bad token' : 'not in peers.json'}`)
            ws.send(JSON.stringify({ t: 'error', code: 'UNAUTHORIZED' }))
            ws.close(1008, 'unauthorized')
            return
          }
          ws.send(JSON.stringify({ t: 'welcome', v: 1, host: this.selfHost }))
          host = peer.name
        } else {
          if (f.t === 'error') {
            onProblem?.(`peer refused the connection: ${String(f.code)}`)
            ws.terminate()
            return
          }
          if (f.t !== 'welcome' || f.host !== expectHost) {
            onProblem?.('unexpected handshake reply')
            ws.terminate()
            return
          }
          host = expectHost
        }
        clearTimeout(authTimer)
        if (!this.establish(host as string, ws, initiator)) return
        onUp?.()
        return
      }

      const link = this.links.get(host)
      if (!link || link.ws !== ws) return
      link.alive = true
      switch (f.t) {
        case 'agents':
          link.agents = cleanAgents(f.agents)
          break
        case 'msg':
        case 'watch':
        case 'notice':
          this.onTransfer(link, f)
          break
        case 'ack':
          this.onAck(host, f)
          break
        default:
          break
      }
    })
  }

  private establish(host: string, ws: WebSocket, initiator: Initiator): boolean {
    const existing = this.links.get(host)
    if (existing) {
      if (initiator === this.winnerInitiator(host)) {
        existing.ws.close(1000, 'replaced')
        this.dropLink(existing)
      } else {
        ws.close(1000, 'duplicate link')
        return false
      }
    }
    const link: Link = {
      host,
      ws,
      initiator,
      since: Date.now(),
      alive: true,
      agents: [],
      lastDirectory: '',
      lastDirectoryAt: 0,
      pingTimer: setInterval(() => {
        if (!link.alive) {
          ws.terminate()
          return
        }
        link.alive = false
        try {
          ws.ping()
        } catch {
          ws.terminate()
        }
      }, this.cfg.peerPingMs),
    }
    link.pingTimer.unref()
    ws.on('pong', () => (link.alive = true))
    ws.on('close', () => this.dropLink(link))
    this.links.set(host, link)
    this.log(`link to ${host} is up (${initiator === 'self' ? 'outbound' : 'inbound'})`)
    this.sendDirectory(link)
    this.flush(link)
    return true
  }

  private dropLink(link: Link): void {
    clearInterval(link.pingTimer)
    if (this.links.get(link.host) === link) {
      this.links.delete(link.host)
      this.log(`link to ${link.host} is down`)
    }
  }

  // --- frames ------------------------------------------------------------------------------------------

  /** Sends the list of local agents unless this peer already has it: it goes out when it changed and at least every directoryKeepaliveMs. */
  private sendDirectory(link: Link): void {
    const agents = this.core.localDirectory()
    // last_seen moves whenever an agent is touched (a watcher does it every few seconds); it must not make every tick a change.
    const signature = JSON.stringify(agents.map(a => ({ ...a, last_seen: 0 })))
    const now = Date.now()
    if (signature === link.lastDirectory && now - link.lastDirectoryAt < this.cfg.directoryKeepaliveMs) return
    link.lastDirectory = signature
    link.lastDirectoryAt = now
    try {
      link.ws.send(JSON.stringify({ t: 'agents', agents }))
    } catch {
      // the close handler cleans up
    }
  }

  private broadcastDirectory(): void {
    for (const l of this.links.values()) this.sendDirectory(l)
  }

  private flush(link: Link): void {
    const now = Date.now()
    for (const row of this.store.outboxForPeer(link.host)) {
      if (row.next_try_ms > now) continue // refused a moment ago: its own retry time decides
      try {
        link.ws.send(row.frame)
      } catch {
        return
      }
    }
  }

  private onTransfer(link: Link, f: Record<string, unknown>): void {
    const id = typeof f.id === 'string' ? f.id.slice(0, 64) : ''
    let reply: Record<string, unknown>
    try {
      if (f.t === 'msg') this.core.receiveRemote(link.host, f)
      else if (f.t === 'watch') this.core.receiveWatch(link.host, f)
      else this.core.receiveNotice(link.host, f)
      reply = { t: 'ack', id, status: 'stored' }
    } catch (e) {
      if (e instanceof ApiError) reply = { t: 'ack', id, status: 'error', code: e.code, message: e.message.slice(0, 300) }
      else {
        this.log(`error while receiving from ${link.host}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`)
        reply = { t: 'ack', id, status: 'error', code: 'INTERNAL', message: 'internal error' }
      }
    }
    try {
      link.ws.send(JSON.stringify(reply))
    } catch {
      // the sender will retransmit and we will deduplicate
    }
  }

  /** Sends the refused messages whose retry time has come over the links that are up. */
  private retryDue(): void {
    const now = Date.now()
    for (const link of this.links.values()) {
      for (const row of this.store.outboxDue(link.host, now)) {
        try {
          link.ws.send(row.frame)
        } catch {
          break
        }
        // If the answer never comes (the link broke), try again after a while; an answer sets the real time or removes the message.
        this.store.retryOutbox(row.id, row.attempts, now + RETRY_ANSWER_WAIT_MS)
      }
    }
  }

  private onAck(host: string, f: Record<string, unknown>): void {
    const id = typeof f.id === 'string' ? f.id : ''
    const row = this.store.getOutbox(id)
    if (!row || row.peer !== host) return
    const waiter = this.pending.get(id)
    this.pending.delete(id)
    if (f.status === 'stored') {
      this.store.deleteOutbox(id)
      waiter?.resolve()
      return
    }
    const code = (typeof f.code === 'string' && KNOWN_CODES.has(f.code) ? f.code : 'INTERNAL') as ErrorCode
    let message = typeof f.message === 'string' ? f.message.slice(0, 300) : 'delivery failed'
    if (TRANSIENT_CODES.has(code)) {
      const attempts = row.attempts + 1
      if (attempts < this.cfg.retryMaxAttempts) {
        this.store.retryOutbox(id, attempts, Date.now() + retryDelayMs(attempts, this.cfg.retryBaseMs))
        waiter?.queue()
        return
      }
      message = `${message} (gave up after ${attempts} attempts)`
    }
    this.store.deleteOutbox(id)
    if (waiter) waiter.reject(new ApiError(code, `${message} (reported by ${host})`))
    else this.core.deliverNotice(row.sender_agent, `Message to ${row.to_display} could not be delivered: ${code}: ${message}`)
  }
}
