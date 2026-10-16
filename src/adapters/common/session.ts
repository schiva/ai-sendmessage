// A resilient agentd session for adapters: connects on demand, registers, keeps the
// lease alive, and re-registers if the daemon was restarted.
import { Client, ApiCallError } from '../../client/client.ts'
import type { Identity } from './identity.ts'

export interface Registration {
  agent: string
  name: string
  ref: string
  address: string
  resumed: boolean
  unread: number
}

export class Session {
  private identity: Identity
  private client: Client | null = null
  private reg: Registration | null = null
  private connecting: Promise<void> | null = null
  private connectingAutostart = false
  private timer: NodeJS.Timeout | null = null

  constructor(identity: Identity) {
    this.identity = identity
  }

  get registration(): Registration | null {
    return this.reg
  }

  /**
   * Connects and registers. Only a real use (a tool call, the first start) may start a daemon that is not running: a background
   * heartbeat must not, or `agentctl stop` would be undone a few seconds later by every session that is still open.
   */
  private async ensure(autostart: boolean): Promise<void> {
    if (this.client && this.reg) return
    if (this.connecting && autostart && !this.connectingAutostart) {
      // A heartbeat reconnect (which never starts a daemon) is in flight; a real call must not fail because of it.
      await this.connecting.catch(() => {})
      if (this.client && this.reg) return
    }
    if (!this.connecting) {
      this.connectingAutostart = autostart
      this.connecting = (async () => {
        const c = await Client.connect({ autostart })
        c.once('close', () => {
          if (this.client === c) {
            this.client = null
            this.reg = null
          }
        })
        this.client = c
        this.reg = (await c.request('register', { ...this.identity })) as Registration
      })().finally(() => {
        this.connecting = null
      })
    }
    await this.connecting
  }

  async call<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}, opts: { autostart?: boolean } = {}): Promise<T> {
    const autostart = opts.autostart ?? true
    for (let attempt = 0; ; attempt++) {
      await this.ensure(autostart)
      try {
        return (await (this.client as Client).request(method, { agent: (this.reg as Registration).agent, ...params })) as T
      } catch (e) {
        const retryable = (e instanceof ApiCallError && e.code === 'NOT_REGISTERED') || (e instanceof Error && /closed/.test(e.message))
        if (attempt === 0 && retryable) {
          this.client?.close()
          this.client = null
          this.reg = null
          continue
        }
        throw e
      }
    }
  }

  /**
   * Keep the lease alive without touching the agent's busy/idle status. It reconnects and registers again when a daemon is
   * running, but never starts one.
   */
  startHeartbeat(): void {
    if (this.timer) return
    const every = Math.max(1000, Math.floor(Number(this.client?.hello.lease_ms ?? 30_000) / 3))
    this.timer = setInterval(() => {
      this.call('heartbeat', {}, { autostart: false }).catch(() => {})
    }, every)
    this.timer.unref()
  }

  async start(): Promise<Registration> {
    await this.ensure(true)
    return this.reg as Registration
  }

  async close(unregister = false): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    if (unregister && this.client && this.reg) {
      await this.client.request('unregister', { agent: this.reg.agent }).catch(() => {})
    }
    this.client?.close()
    this.client = null
    this.reg = null
  }
}
