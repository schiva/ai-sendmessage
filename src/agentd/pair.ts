// Pairing: replaces the manual exchange of host names, fingerprints and tokens (docs/LAN.md).
//   Host A: `agentctl pair`        prints a one-time code (A's address, A's certificate fingerprint, a random secret)
//   Host B: `agentctl pair <code>` connects to A with A's certificate pinned from the code and proves it knows the secret
// Both sides then write each other into peers.json. The link token is derived from the secret, so the secret itself is
// never stored and a used code is worthless.
import os from 'node:os'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { normalizeFingerprint } from './tls.ts'

export const CODE_PREFIX = 'AL1-'
export const DEFAULT_PAIR_TTL_S = 600
export const MAX_PAIR_FAILURES = 5

export interface PairCode {
  address: string
  port: number
  fingerprint: string // normalized lowercase hex
  secret: string // 32 hex characters
}

export function encodeCode(c: PairCode): string {
  return CODE_PREFIX + Buffer.from(`${c.address}\n${c.port}\n${c.fingerprint}\n${c.secret}`, 'utf8').toString('base64url')
}

/** Returns the decoded code, or a string that says what is wrong with it. */
export function decodeCode(text: string): PairCode | string {
  const t = text.trim()
  if (!t.startsWith(CODE_PREFIX)) return `a pairing code starts with "${CODE_PREFIX}"`
  let parts: string[]
  try {
    parts = Buffer.from(t.slice(CODE_PREFIX.length), 'base64url').toString('utf8').split('\n')
  } catch {
    return 'the pairing code is damaged'
  }
  if (parts.length !== 4) return 'the pairing code is damaged (was it copied completely?)'
  const [address, portText, fingerprint, secret] = parts
  const port = Number(portText)
  if (!address || address.length > 253 || /\s/.test(address)) return 'the pairing code is damaged'
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 'the pairing code is damaged'
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) return 'the pairing code is damaged'
  if (!/^[0-9a-f]{32}$/.test(secret)) return 'the pairing code is damaged'
  return { address, port, fingerprint: normalizeFingerprint(fingerprint), secret }
}

/** What the joining host sends to show that it holds the code. Bound to its own host name. */
export function pairProof(secret: string, joinerHost: string): string {
  return createHmac('sha256', secret).update(`agentlink-pair-v1|${joinerHost}`).digest('hex')
}

/** The shared link token both hosts store in peers.json. */
export function linkToken(secret: string): string {
  return createHmac('sha256', secret).update('agentlink-link-v1').digest('hex')
}

export function proofMatches(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** IPv4 addresses of this PC that other PCs of a LAN could reach, most likely first. */
export function lanAddresses(): string[] {
  const out: string[] = []
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue
      out.push(a.address)
    }
  }
  return out
}
