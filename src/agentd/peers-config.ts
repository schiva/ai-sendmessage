// peers.json: who this host may talk to (S-01) and how to authenticate them (S-02, S-03).
import fs from 'node:fs'
import path from 'node:path'
import { normalizeFingerprint } from './tls.ts'

export interface PeerEntry {
  name: string
  address: string
  port: number
  token: string
  /** Normalized lowercase hex. Required when this host dials the peer. */
  fingerprint: string
  dial: boolean
}

export interface PeersConfig {
  listen: { host: string; port: number } | null
  peers: PeerEntry[]
  errors: string[]
}

export const HOST_RE = /^[a-z0-9][a-z0-9._-]{0,62}$/
export const DEFAULT_PORT = 7420
export const MIN_TOKEN_LENGTH = 16

function isPort(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 65535
}

export function parsePeersConfig(raw: unknown, selfHost: string): PeersConfig {
  const out: PeersConfig = { listen: null, peers: [], errors: [] }
  if (typeof raw !== 'object' || raw === null) {
    out.errors.push('peers.json must contain a JSON object')
    return out
  }
  const obj = raw as { listen?: unknown; peers?: unknown }
  const peersRaw = Array.isArray(obj.peers) ? obj.peers : []
  if (obj.peers !== undefined && !Array.isArray(obj.peers)) out.errors.push('"peers" must be an array')

  const seen = new Set<string>()
  peersRaw.forEach((p, i) => {
    const where = `peers[${i}]`
    if (typeof p !== 'object' || p === null) return void out.errors.push(`${where}: must be an object`)
    const e = p as Record<string, unknown>
    const name = typeof e.name === 'string' ? e.name.toLowerCase() : ''
    if (!HOST_RE.test(name)) return void out.errors.push(`${where}: "name" must be the peer's host name (letters, digits, ".", "-", "_")`)
    if (name === selfHost) return void out.errors.push(`${where}: "${name}" is this host itself`)
    if (seen.has(name)) return void out.errors.push(`${where}: duplicate peer "${name}"`)
    const token = typeof e.token === 'string' ? e.token : ''
    if (token.length < MIN_TOKEN_LENGTH) return void out.errors.push(`${where} (${name}): "token" must be a shared secret of at least ${MIN_TOKEN_LENGTH} characters`)
    const dial = e.dial !== false
    const fingerprint = typeof e.fingerprint === 'string' ? normalizeFingerprint(e.fingerprint) : ''
    let address = ''
    let port = DEFAULT_PORT
    if (dial) {
      if (typeof e.address !== 'string' || e.address.trim() === '') return void out.errors.push(`${where} (${name}): "address" is required unless "dial" is false`)
      address = e.address.trim()
      if (fingerprint.length !== 64) return void out.errors.push(`${where} (${name}): "fingerprint" (SHA-256 of the peer certificate) is required unless "dial" is false`)
      if (e.port !== undefined) {
        if (!isPort(e.port)) return void out.errors.push(`${where} (${name}): "port" must be 1-65535`)
        port = e.port
      }
    }
    seen.add(name)
    out.peers.push({ name, address, port, token, fingerprint, dial })
  })

  if (out.peers.length > 0) {
    const l = (obj.listen ?? {}) as { host?: unknown; port?: unknown }
    const host = typeof l.host === 'string' && l.host.trim() ? l.host.trim() : '127.0.0.1'
    const port = l.port === undefined ? DEFAULT_PORT : l.port
    if (!isPort(port)) out.errors.push('listen.port must be 1-65535')
    else out.listen = { host, port }
  }
  return out
}

export function peersFile(home: string): string {
  return path.join(home, 'peers.json')
}

const LOOPBACK_RE = /^(127\.|localhost$|::1$)/i

/**
 * Adds or replaces one peer in peers.json and keeps everything else (other peers, unknown fields) as it is.
 * `listen` is only written when the file has no usable listen address yet, so a choice the user made stays.
 */
export function upsertPeerFile(home: string, peer: Record<string, unknown> & { name: string }, listen?: { host: string; port: number }): void {
  const file = peersFile(home)
  let raw: Record<string, unknown> = {}
  let text: string | null = null
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(`cannot read peers.json: ${String(e)}`)
  }
  if (text !== null) {
    try {
      const parsed = JSON.parse(text.replace(/^﻿/, ''))
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object')
      raw = parsed as Record<string, unknown>
    } catch {
      throw new Error(`peers.json exists but is not valid JSON; fix or delete ${file} and pair again`)
    }
  }
  const peers = Array.isArray(raw.peers) ? [...raw.peers] : []
  const at = peers.findIndex(p => typeof p === 'object' && p !== null && typeof (p as { name?: unknown }).name === 'string' && (p as { name: string }).name.toLowerCase() === peer.name)
  if (at >= 0) peers[at] = peer
  else peers.push(peer)
  raw.peers = peers
  if (listen) {
    const l = raw.listen as { host?: unknown } | undefined
    const usable = l && typeof l.host === 'string' && l.host.trim() !== '' && !LOOPBACK_RE.test(l.host.trim())
    if (!usable) raw.listen = { host: listen.host, port: listen.port }
  }
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(raw, null, 2) + '\n', { mode: 0o600 })
  fs.renameSync(tmp, file)
}

export function loadPeersConfig(home: string, selfHost: string): PeersConfig {
  let text: string
  try {
    text = fs.readFileSync(peersFile(home), 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { listen: null, peers: [], errors: [] }
    return { listen: null, peers: [], errors: [`cannot read peers.json: ${String(e)}`] }
  }
  try {
    return parsePeersConfig(JSON.parse(text.replace(/^﻿/, '')), selfHost)
  } catch (e) {
    return { listen: null, peers: [], errors: [`peers.json is not valid JSON: ${String(e instanceof Error ? e.message : e)}`] }
  }
}
