// What the core needs from the LAN layer (implemented by PeerManager in peers.ts).
export interface MsgFrame {
  t: 'msg'
  id: string
  from: string
  to: string
  kind: 'message'
  summary: string | null
  message: string
  ts: number
  reply_to: string | null
  ttl: number
}

/** "Tell me when <target> becomes idle", sent to the host of the target. */
export interface WatchFrame {
  t: 'watch'
  id: string
  target: string
  requester: string
}

/** The answer to a watch: delivered to the requester's host, which writes the notice text itself. */
export interface NoticeFrame {
  t: 'notice'
  id: string
  to: string
  kind: 'idle_notice'
  target: string
  reason: 'idle' | 'offline'
}

export type OutFrame = MsgFrame | WatchFrame | NoticeFrame

export interface RemoteAgent {
  name: string
  ref: string
  kind: string
  status: 'busy' | 'idle' | 'offline'
  cwd: string | null
  unread: number
  last_seen: number
}

export interface HostStatus {
  host: string
  link: 'up' | 'down'
  since: number | null
  queued: number
  error: string | null
}

export interface RemoteGateway {
  knownHost(host: string): boolean
  /** Resolves 'stored' when the peer acknowledged within the wait time, 'queued_remote' otherwise; rejects with the peer's error. */
  send(host: string, frame: OutFrame, senderAgent: string, toDisplay: string): Promise<'stored' | 'queued_remote'>
  directory(): Array<{ host: string; agents: RemoteAgent[] }>
  hosts(): HostStatus[]
}
