// AgentLink SDK: the smallest way for any program (an AI agent of any kind) to join the network.
//
//   const agent = await AgentLinkAgent.connect({ name: 'summarizer', kind: 'sdk' })
//   agent.onMessage(async msg => { await agent.reply(msg, `got: ${msg.message}`) })
//
// It registers the agent, keeps the lease alive, receives messages by push, acknowledges them after the handler
// finished, reports busy/idle around the handler, and reconnects (re-registering and draining the inbox) when the
// daemon restarts. Nothing in here knows what kind of agent it is; that is the point (F-12).
import { EventEmitter } from 'node:events'
import { Client, ApiCallError } from '../client/client.ts'

export { ApiCallError }

export interface IncomingMessage {
  id: string
  from: string
  to: string
  kind: 'message' | 'idle_notice' | 'delivery_notice' | string
  summary: string | null
  message: string
  ts: number
  reply_to: string | null
  state: string
}

export interface AgentOptions {
  /** Name other agents use to reach this one (letters, digits, "-" and "_"). */
  name: string
  /** What kind of agent this is, shown in listings. Default "sdk". */
  kind?: string
  /** Stable identity: the same key always yields the same agent and inbox. Default `sdk:<name>`. */
  key?: string
  cwd?: string
  /** Reconnect when the daemon connection drops (default true). */
  reconnect?: boolean
  /** Address another daemon than the one of the current user (tests, several hosts on one PC). */
  pipe?: string
  home?: string
  env?: Record<string, string>
}

export type MessageHandler = (msg: IncomingMessage) => void | Promise<void>

interface Registration {
  agent: string
  name: string
  ref: string
  address: string
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export class AgentLinkAgent extends EventEmitter {
  /** `name@host`, valid after connect(). */
  address = ''
  ref = ''
  private opts: AgentOptions
  private client: Client | null = null
  private reg: Registration | null = null
  private handlers: MessageHandler[] = []
  private queue: IncomingMessage[] = []
  private working = false
  private closed = false
  private heartbeat: NodeJS.Timeout | null = null
  private reconnecting = false

  private constructor(opts: AgentOptions) {
    super()
    this.opts = opts
  }

  static async connect(opts: AgentOptions): Promise<AgentLinkAgent> {
    const a = new AgentLinkAgent(opts)
    await a.open()
    return a
  }

  private async open(): Promise<void> {
    const c = await Client.connect({ pipe: this.opts.pipe, home: this.opts.home, env: this.opts.env })
    const reg = (await c.request('register', {
      name: this.opts.name,
      kind: this.opts.kind ?? 'sdk',
      cwd: this.opts.cwd ?? process.cwd(),
      key: this.opts.key ?? `sdk:${this.opts.name}`,
    })) as Registration
    this.client = c
    this.reg = reg
    this.address = reg.address
    this.ref = reg.ref

    // Subscribe first, then drain what arrived while we were away: every message is delivered by exactly one of the two.
    c.on('event', (_name: string, data: IncomingMessage) => this.enqueue(data))
    await c.request('subscribe', { agent: reg.agent, events: ['message', 'idle'] })
    await this.drain()

    c.once('close', () => {
      if (this.client === c) this.client = null
      if (!this.closed && this.opts.reconnect !== false) void this.reconnect()
    })
    const lease = Number(c.hello.lease_ms) || 30_000
    if (this.heartbeat) clearInterval(this.heartbeat)
    this.heartbeat = setInterval(() => {
      this.client?.request('heartbeat', { agent: reg.agent }).catch(() => {})
    }, Math.max(1000, Math.floor(lease / 3)))
    this.heartbeat.unref()
    this.emit('connected', reg.address)
  }

  private async reconnect(): Promise<void> {
    if (this.reconnecting) return
    this.reconnecting = true
    let delay = 200
    while (!this.closed) {
      try {
        await this.open()
        break
      } catch {
        await sleep(delay)
        delay = Math.min(delay * 2, 5000)
      }
    }
    this.reconnecting = false
  }

  private async drain(): Promise<void> {
    if (!this.client || !this.reg) return
    for (;;) {
      const r = (await this.client.request('inbox', { agent: this.reg.agent, mode: 'take', limit: 100 })) as { messages: IncomingMessage[]; remaining: number }
      for (const m of r.messages) this.enqueue(m)
      if (r.remaining === 0) return
    }
  }

  // --- receiving -------------------------------------------------------------------------------

  /** Called for every message, one at a time. Throwing does not stop the agent; it is reported as an 'error' event. */
  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler)
  }

  private enqueue(m: IncomingMessage): void {
    this.queue.push(m)
    if (!this.working) void this.work()
  }

  private async work(): Promise<void> {
    this.working = true
    this.setStatus('busy').catch(() => {})
    while (this.queue.length > 0) {
      const m = this.queue.shift() as IncomingMessage
      for (const h of this.handlers) {
        try {
          await h(m)
        } catch (e) {
          this.emit('error', e instanceof Error ? e : new Error(String(e)))
        }
      }
      this.emit('message', m)
      this.client?.request('ack', { agent: (this.reg as Registration).agent, ids: [m.id] }).catch(() => {})
    }
    this.working = false
    this.setStatus('idle').catch(() => {})
  }

  // --- sending ------------------------------------------------------------------------------------

  private call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.client || !this.reg) return Promise.reject(new Error('not connected to agentd (reconnecting)'))
    return this.client.request(method, { agent: this.reg.agent, ...params }) as Promise<T>
  }

  /** `to` is `name`, `name@host`, or the `from` of a message you received. */
  send(to: string, message: string, opts: { summary?: string; replyTo?: string } = {}): Promise<{ id: string; status: 'stored' | 'queued_remote'; to: string }> {
    return this.call('send', { to, message, summary: opts.summary, reply_to: opts.replyTo })
  }

  reply(msg: IncomingMessage, text: string): Promise<{ id: string; status: 'stored' | 'queued_remote'; to: string }> {
    return this.send(msg.from, text, { replyTo: msg.id })
  }

  list(scope: 'all' | 'local' = 'all'): Promise<{
    self: string
    agents: Array<{ address: string; ref: string; kind: string; status: string; unread: number; host: string }>
    hosts: Array<{ host: string; link: string; queued: number }>
  }> {
    return this.call('list', { scope })
  }

  /** Ask for one notice (an `idle_notice` message) when `target` becomes idle. */
  watch(target: string): Promise<{ immediate: boolean }> {
    return this.call('notify_when_idle', { target })
  }

  setStatus(status: 'busy' | 'idle'): Promise<unknown> {
    return this.call('heartbeat', { status })
  }

  async close(unregister = true): Promise<void> {
    this.closed = true
    if (this.heartbeat) clearInterval(this.heartbeat)
    if (unregister && this.client && this.reg) await this.client.request('unregister', { agent: this.reg.agent }).catch(() => {})
    this.client?.close()
    this.client = null
  }
}
