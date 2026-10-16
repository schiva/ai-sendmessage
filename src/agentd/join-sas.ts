// Pure functions for `agentctl join` SAS calculation, commitment, digit parsing and host normalization (docs/JOIN-API.md section 2).
import { createHash, timingSafeEqual } from 'node:crypto'

const HOST_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,62}$/

/** Length-prefixed encoding: 4-byte big-endian byte length followed by the raw bytes (UTF-8 for strings). */
function lp(x: string | Buffer): Buffer {
  const body = typeof x === 'string' ? Buffer.from(x, 'utf8') : x
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(body.length, 0)
  return Buffer.concat([len, body])
}

function fingerprintBytes(fp: string): Buffer {
  if (typeof fp !== 'string') throw new TypeError('fingerprint must be a 64-character hex string')
  const stripped = fp.replace(/^sha-?256[:=]?/i, '').replace(/:/g, '')
  if (!/^[0-9a-fA-F]{64}$/.test(stripped)) {
    throw new TypeError(`invalid SHA-256 fingerprint: "${fp}"`)
  }
  return Buffer.from(stripped.toLowerCase(), 'hex')
}

export function joinCommit(hostJ: string, nonceJ: Buffer): string {
  if (typeof hostJ !== 'string') throw new TypeError('hostJ must be a string')
  if (!Buffer.isBuffer(nonceJ)) throw new TypeError('nonceJ must be a Buffer')
  return createHash('sha256')
    .update(lp('agentlink-join-v1-commit'))
    .update(lp(hostJ))
    .update(lp(nonceJ))
    .digest('hex')
}

export function joinSas(fpH: string, hostJ: string, hostH: string, nonceJ: Buffer, nonceH: Buffer): string {
  const fp = fingerprintBytes(fpH)
  if (typeof hostJ !== 'string' || typeof hostH !== 'string') throw new TypeError('host names must be strings')
  if (!Buffer.isBuffer(nonceJ) || !Buffer.isBuffer(nonceH)) throw new TypeError('nonces must be Buffers')
  const h = createHash('sha256')
    .update(lp('agentlink-join-v1-sas'))
    .update(lp(fp))
    .update(lp(hostJ))
    .update(lp(hostH))
    .update(lp(nonceJ))
    .update(lp(nonceH))
    .digest()
  const code = BigInt('0x' + h.subarray(0, 8).toString('hex')) % 1_000_000n
  return code.toString(10).padStart(6, '0')
}

export function formatSas(sas: string): string {
  if (typeof sas !== 'string' || !/^[0-9]{6}$/.test(sas)) {
    throw new TypeError(`SAS must be a 6-digit ASCII string, got "${String(sas)}"`)
  }
  return `${sas.slice(0, 3)} ${sas.slice(3, 6)}`
}

export function parseDigits(input: string): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input.replace(/[\s.-]+/g, '')
  return /^[0-9]{6}$/.test(cleaned) ? cleaned : null
}

export function normalizeHostName(raw: string): string | null {
  if (typeof raw !== 'string') return null
  const lower = raw.toLowerCase()
  if (!HOST_NAME_RE.test(lower) || lower.endsWith('.')) return null
  return lower
}

export function sasEquals(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}
