export const PROTOCOL_VERSION = 1

export const LIMITS = {
  maxMessageBytes: 64 * 1024,
  maxSummaryChars: 200,
  maxLineBytes: 512 * 1024,
  inboxMax: 1000,
  inboxDefaultLimit: 20,
  inboxMaxLimit: 100,
  maxWaitMs: 30_000,
  idleSubTtlMs: 12 * 60 * 60 * 1000,
  ackedRetentionMs: 24 * 60 * 60 * 1000,
  inactiveAgentGcMs: 60 * 60 * 1000,
} as const

export const NAME_RE = /^[A-Za-z0-9_-]{1,64}$/
export const REF_RE = /^[0-9a-f]{4,12}$/
export const TO_RE = /^([A-Za-z0-9_-]{1,64})(?:@([A-Za-z0-9._-]{1,253}))?(?:\s*\[([0-9a-f]{4,12})\])?$/

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_REGISTERED'
  | 'UNKNOWN_AGENT'
  | 'AMBIGUOUS_NAME'
  | 'UNKNOWN_HOST'
  | 'TOO_LARGE'
  | 'RATE_LIMITED'
  | 'FORBIDDEN'
  | 'LOOP_DETECTED'
  | 'INTERNAL'

export class ApiError extends Error {
  code: ErrorCode
  data?: unknown
  constructor(code: ErrorCode, message: string, data?: unknown) {
    super(message)
    this.code = code
    this.data = data
  }
}

export type AgentStatus = 'busy' | 'idle' | 'offline'
export type MessageState = 'new' | 'delivered' | 'acked'
export type MessageKind = 'message' | 'idle_notice' | 'delivery_notice'
