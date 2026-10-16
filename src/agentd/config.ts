import os from 'node:os'
import path from 'node:path'

export interface Config {
  leaseMs: number
  sweepMs: number
  rateBurst: number
  ratePerMin: number
  dupWindowMs: number
  peerReconnectMinMs: number
  peerReconnectMaxMs: number
  peerPingMs: number
  ackWaitMs: number
  outboxTtlMs: number
  directoryMs: number
  /** How often a LAN port that could not be opened (address not up yet, port busy) is tried again. */
  listenRetryMs: number
  /** A message the other host refused for a passing reason (rate limit) is sent again: first after this long, then twice as long each time (at most a minute). */
  retryBaseMs: number
  retryMaxAttempts: number
  /** Other hosts see only the folder name of an agent's working directory; with this on they see the whole path. */
  shareFullCwd: boolean
  /** The shortest time a pairing code may be valid for (seconds). */
  pairMinTtlS: number
  /** Messages waiting in the outbox for one host that cannot be reached: at most this many, and at most this many bytes. */
  outboxMaxMessages: number
  outboxMaxBytes: number
  /** The list of agents is sent to a peer when it changed, and anyway after this long. */
  directoryKeepaliveMs: number
  /** Connections that have not said who they are yet: at most this many in all, and at most this many from one address. */
  maxPreAuth: number
  maxPreAuthPerIp: number
}

function num(name: string, def: number): number {
  const v = Number(process.env[name])
  return Number.isFinite(v) && v > 0 ? v : def
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 64) || 'user'
}

export function homeDir(): string {
  if (process.env.AGENTLINK_HOME) return process.env.AGENTLINK_HOME
  const base = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local')
  return path.join(base, 'AgentLink')
}

export function pipePath(): string {
  if (process.env.AGENTLINK_PIPE) return process.env.AGENTLINK_PIPE
  return `\\\\.\\pipe\\agentlink-${sanitize(os.userInfo().username)}`
}

export function hostName(): string {
  return sanitize(process.env.AGENTLINK_HOST ?? os.hostname()).toLowerCase()
}

export function loadConfig(): Config {
  return {
    leaseMs: num('AGENTLINK_LEASE_MS', 30_000),
    sweepMs: num('AGENTLINK_SWEEP_MS', 5_000),
    rateBurst: num('AGENTLINK_RATE_BURST', 10),
    ratePerMin: num('AGENTLINK_RATE_PER_MIN', 60),
    dupWindowMs: num('AGENTLINK_DUP_WINDOW_MS', 2_000),
    peerReconnectMinMs: num('AGENTLINK_PEER_RECONNECT_MIN_MS', 1_000),
    peerReconnectMaxMs: num('AGENTLINK_PEER_RECONNECT_MAX_MS', 30_000),
    peerPingMs: num('AGENTLINK_PEER_PING_MS', 10_000),
    ackWaitMs: num('AGENTLINK_ACK_WAIT_MS', 2_000),
    outboxTtlMs: num('AGENTLINK_OUTBOX_TTL_MS', 24 * 60 * 60 * 1000),
    directoryMs: num('AGENTLINK_DIRECTORY_MS', 3_000),
    listenRetryMs: num('AGENTLINK_LISTEN_RETRY_MS', 15_000),
    retryBaseMs: num('AGENTLINK_RETRY_BASE_MS', 2_000),
    retryMaxAttempts: num('AGENTLINK_RETRY_MAX_ATTEMPTS', 8),
    shareFullCwd: process.env.AGENTLINK_SHARE_FULL_CWD === '1',
    pairMinTtlS: num('AGENTLINK_PAIR_MIN_TTL_S', 10),
    outboxMaxMessages: num('AGENTLINK_OUTBOX_MAX', 500),
    outboxMaxBytes: num('AGENTLINK_OUTBOX_MAX_BYTES', 16 * 1024 * 1024),
    directoryKeepaliveMs: num('AGENTLINK_DIRECTORY_KEEPALIVE_MS', 30_000),
    maxPreAuth: num('AGENTLINK_MAX_PREAUTH', 32),
    maxPreAuthPerIp: num('AGENTLINK_MAX_PREAUTH_PER_IP', 4),
  }
}
