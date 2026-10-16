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
  private timer: NodeJS.Timeout | null = null

  constructor(identity: Identity) {
    this.identity = identity
  }

  get registration(): Registration | null {
    return this.reg
  }

  private async ensure(): Promise<void> {
    if (this.client && this.reg) return
    if (!this.connecting) {
      this.connecting = (async () => {
        const c = await Client.connect()
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

  async call<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await this.ensure()
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

  /** Keep the lease alive without touching the agent's busy/idle status. */
  startHeartbeat(): void {
    if (this.timer) return
    const every = Math.max(1000, Math.floor(Number(this.client?.hello.lease_ms ?? 30_000) / 3))
    this.timer = setInterval(() => {
      this.call('heartbeat').catch(() => {})
    }, every)
    this.timer.unref()
  }

  async start(): Promise<Registration> {
    await this.ensure()
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
