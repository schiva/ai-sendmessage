// Agent-level ACL (F-14): who may send to whom. Rules live in acl.json of the data folder.
//
//   { "default": "allow",
//     "rules": [ { "from": "alice@pc-a", "to": "bob@pc-b", "action": "deny" },
//                { "from": "*@pc-c",     "to": "*",        "action": "deny" } ] }
//
// A pattern is `name@host`; either part may be `*`. A bare `name` means `name@<this host>`.
// The first matching rule decides; with no match the "default" applies ("allow" unless stated otherwise).
// Enforcement happens on the sending host (early feedback) and on the receiving host (authoritative).
import fs from 'node:fs'
import path from 'node:path'
import { NAME_RE } from './protocol.ts'
import { HOST_RE } from './peers-config.ts'

export interface Pattern {
  name: string // exact name or "*"
  host: string // exact (lowercase) host or "*"
}

export interface AclRule {
  from: Pattern
  to: Pattern
  action: 'allow' | 'deny'
  text: string
}

export interface AclState {
  default: 'allow' | 'deny'
  rules: AclRule[]
  errors: string[]
  /** True when acl.json exists but could not be used at startup: everything is denied until it is fixed. */
  failClosed: boolean
}

export interface AclDecision {
  allowed: boolean
  /** 1-based rule number, or null when the default decided. */
  rule: number | null
  reason: string
}

export function parsePattern(raw: unknown, selfHost: string): Pattern | string {
  if (typeof raw !== 'string' || raw.trim() === '') return 'must be a non-empty string'
  const s = raw.trim()
  if (s === '*') return { name: '*', host: '*' }
  const at = s.lastIndexOf('@')
  const name = at < 0 ? s : s.slice(0, at)
  const host = at < 0 ? selfHost : s.slice(at + 1).toLowerCase()
  if (name !== '*' && !NAME_RE.test(name)) return `"${name}" is not a valid agent name`
  if (host !== '*' && !HOST_RE.test(host)) return `"${host}" is not a valid host name`
  return { name, host }
}

export function parseAcl(raw: unknown, selfHost: string): AclState {
  const out: AclState = { default: 'allow', rules: [], errors: [], failClosed: false }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    out.errors.push('acl.json must contain a JSON object')
    return out
  }
  const o = raw as { default?: unknown; rules?: unknown }
  if (o.default !== undefined) {
    if (o.default === 'allow' || o.default === 'deny') out.default = o.default
    else out.errors.push('"default" must be "allow" or "deny"')
  }
  if (o.rules !== undefined && !Array.isArray(o.rules)) out.errors.push('"rules" must be an array')
  const rules = Array.isArray(o.rules) ? o.rules : []
  rules.forEach((r, i) => {
    const where = `rules[${i}]`
    if (typeof r !== 'object' || r === null) return void out.errors.push(`${where}: must be an object`)
    const e = r as Record<string, unknown>
    const from = parsePattern(e.from, selfHost)
    if (typeof from === 'string') return void out.errors.push(`${where}.from: ${from}`)
    const to = parsePattern(e.to, selfHost)
    if (typeof to === 'string') return void out.errors.push(`${where}.to: ${to}`)
    if (e.action !== 'allow' && e.action !== 'deny') return void out.errors.push(`${where}.action: must be "allow" or "deny"`)
    out.rules.push({ from, to, action: e.action, text: `${String(e.from)} -> ${String(e.to)}: ${e.action}` })
  })
  return out
}

function matches(p: Pattern, name: string, host: string): boolean {
  return (p.name === '*' || p.name === name) && (p.host === '*' || p.host === host)
}

export class Acl {
  private selfHost: string
  private file: string
  private state: AclState = { default: 'allow', rules: [], errors: [], failClosed: false }

  constructor(home: string, selfHost: string) {
    this.file = path.join(home, 'acl.json')
    this.selfHost = selfHost
  }

  /** Reads acl.json. A broken file keeps the previous rules on reload and fails closed at startup. */
  load(startup: boolean): AclState {
    let text: string
    try {
      text = fs.readFileSync(this.file, 'utf8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        this.state = { default: 'allow', rules: [], errors: [], failClosed: false }
        return this.state
      }
      return this.broken(startup, `cannot read acl.json: ${String(e)}`)
    }
    let raw: unknown
    try {
      raw = JSON.parse(text.replace(/^﻿/, ''))
    } catch (e) {
      return this.broken(startup, `acl.json is not valid JSON: ${String(e instanceof Error ? e.message : e)}`)
    }
    const parsed = parseAcl(raw, this.selfHost)
    if (parsed.errors.length > 0) {
      // A rule that cannot be understood might have been a deny rule: do not silently drop it.
      return this.broken(startup, parsed.errors.join('; '))
    }
    this.state = parsed
    return this.state
  }

  private broken(startup: boolean, why: string): AclState {
    if (startup) {
      this.state = { default: 'deny', rules: [], errors: [why], failClosed: true }
    } else {
      this.state = { ...this.state, errors: [`kept the previous rules because the new acl.json is unusable: ${why}`] }
    }
    return this.state
  }

  status(): AclState {
    return this.state
  }

  check(from: { name: string; host: string }, to: { name: string; host: string }): AclDecision {
    if (this.state.failClosed) {
      return { allowed: false, rule: null, reason: `acl.json is unusable (${this.state.errors[0]}); all sending is blocked until it is fixed` }
    }
    for (let i = 0; i < this.state.rules.length; i++) {
      const r = this.state.rules[i]
      if (matches(r.from, from.name, from.host) && matches(r.to, to.name, to.host)) {
        return { allowed: r.action === 'allow', rule: i + 1, reason: `rule ${i + 1} (${r.text})` }
      }
    }
    return { allowed: this.state.default === 'allow', rule: null, reason: `default "${this.state.default}"` }
  }
}
