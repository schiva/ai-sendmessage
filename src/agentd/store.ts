import { DatabaseSync } from 'node:sqlite'
import type { MessageKind, MessageState } from './protocol.ts'

export interface AgentRow {
  agent: string
  key: string
  name: string
  ref: string
  kind: string
  cwd: string | null
  pid: number | null
  status: 'busy' | 'idle'
  active: number
  last_seen: number
  registered_at: number
}

export interface MessageRow {
  seq: number
  id: string
  to_agent: string
  from_addr: string
  to_addr: string
  kind: MessageKind
  summary: string | null
  message: string
  ts: number
  reply_to: string | null
  ttl: number
  state: MessageState
  created_ms: number
}

export interface IdleSubRow {
  requester: string
  target: string
  created_at: number
}

export interface RemoteIdleSubRow {
  host: string
  requester_addr: string
  target_agent: string
  created_at: number
}

export interface OutboxRow {
  id: string
  peer: string
  frame: string
  sender_agent: string
  to_display: string
  created_ms: number
}

export type NewMessage = Omit<MessageRow, 'seq' | 'state'>

function plain<T>(row: unknown): T {
  return { ...(row as object) } as T
}

export class Store {
  private db: DatabaseSync

  constructor(file: string) {
    this.db = new DatabaseSync(file)
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA busy_timeout = 3000')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        agent TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        ref TEXT NOT NULL,
        kind TEXT NOT NULL,
        cwd TEXT,
        pid INTEGER,
        status TEXT NOT NULL,
        active INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        registered_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS agents_name ON agents(name);
      CREATE TABLE IF NOT EXISTS messages (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        to_agent TEXT NOT NULL,
        from_addr TEXT NOT NULL,
        to_addr TEXT NOT NULL,
        kind TEXT NOT NULL,
        summary TEXT,
        message TEXT NOT NULL,
        ts INTEGER NOT NULL,
        reply_to TEXT,
        ttl INTEGER NOT NULL,
        state TEXT NOT NULL,
        created_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS messages_inbox ON messages(to_agent, state, seq);
      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY,
        peer TEXT NOT NULL,
        frame TEXT NOT NULL,
        sender_agent TEXT NOT NULL,
        to_display TEXT NOT NULL,
        created_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS outbox_peer ON outbox(peer, created_ms);
      CREATE TABLE IF NOT EXISTS remote_idle_subs (
        host TEXT NOT NULL,
        requester_addr TEXT NOT NULL,
        target_agent TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (host, requester_addr, target_agent)
      );
      CREATE TABLE IF NOT EXISTS idle_subs (
        requester TEXT NOT NULL,
        target TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (requester, target)
      );
    `)
  }

  close(): void {
    this.db.close()
  }

  // --- agents ---------------------------------------------------------------

  getAgent(id: string): AgentRow | undefined {
    const r = this.db.prepare('SELECT * FROM agents WHERE agent = ?').get(id)
    return r ? plain<AgentRow>(r) : undefined
  }

  getAgentByKey(key: string): AgentRow | undefined {
    const r = this.db.prepare('SELECT * FROM agents WHERE key = ?').get(key)
    return r ? plain<AgentRow>(r) : undefined
  }

  agentsByName(name: string): AgentRow[] {
    return this.db.prepare('SELECT * FROM agents WHERE name = ? ORDER BY registered_at').all(name).map(r => plain<AgentRow>(r))
  }

  allAgents(): AgentRow[] {
    return this.db.prepare('SELECT * FROM agents ORDER BY name, registered_at').all().map(r => plain<AgentRow>(r))
  }

  insertAgent(a: AgentRow): void {
    this.db
      .prepare(
        'INSERT INTO agents (agent,key,name,ref,kind,cwd,pid,status,active,last_seen,registered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(a.agent, a.key, a.name, a.ref, a.kind, a.cwd, a.pid, a.status, a.active, a.last_seen, a.registered_at)
  }

  reviveAgent(
    id: string,
    fields: { name: string; kind: string; cwd: string | null; pid: number | null; status: 'busy' | 'idle' },
    now: number,
  ): void {
    this.db
      .prepare('UPDATE agents SET name=?, kind=?, cwd=?, pid=?, status=?, active=1, last_seen=? WHERE agent=?')
      .run(fields.name, fields.kind, fields.cwd, fields.pid, fields.status, now, id)
  }

  touch(id: string, now: number): void {
    this.db.prepare('UPDATE agents SET last_seen=? WHERE agent=?').run(now, id)
  }

  setStatus(id: string, status: 'busy' | 'idle'): void {
    this.db.prepare('UPDATE agents SET status=? WHERE agent=?').run(status, id)
  }

  deactivate(id: string): void {
    this.db.prepare('UPDATE agents SET active=0 WHERE agent=?').run(id)
  }

  deleteAgent(id: string): void {
    this.db.prepare('DELETE FROM messages WHERE to_agent=?').run(id)
    this.db.prepare('DELETE FROM idle_subs WHERE requester=? OR target=?').run(id, id)
    this.db.prepare('DELETE FROM remote_idle_subs WHERE target_agent=?').run(id)
    this.db.prepare('DELETE FROM agents WHERE agent=?').run(id)
  }

  // --- messages -------------------------------------------------------------

  insertMessage(m: NewMessage): MessageRow {
    const r = this.db
      .prepare(
        'INSERT INTO messages (id,to_agent,from_addr,to_addr,kind,summary,message,ts,reply_to,ttl,state,created_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(m.id, m.to_agent, m.from_addr, m.to_addr, m.kind, m.summary, m.message, m.ts, m.reply_to, m.ttl, 'new', m.created_ms)
    return { ...m, seq: Number(r.lastInsertRowid), state: 'new' }
  }

  messagesFor(agent: string, state: MessageState | 'any', limit: number): MessageRow[] {
    const rows =
      state === 'any'
        ? this.db.prepare('SELECT * FROM messages WHERE to_agent=? ORDER BY seq LIMIT ?').all(agent, limit)
        : this.db.prepare('SELECT * FROM messages WHERE to_agent=? AND state=? ORDER BY seq LIMIT ?').all(agent, state, limit)
    return rows.map(r => plain<MessageRow>(r))
  }

  countState(agent: string, state: MessageState): number {
    const r = this.db.prepare('SELECT COUNT(*) AS n FROM messages WHERE to_agent=? AND state=?').get(agent, state) as { n: number }
    return Number(r.n)
  }

  countInbox(agent: string): number {
    const r = this.db.prepare('SELECT COUNT(*) AS n FROM messages WHERE to_agent=?').get(agent) as { n: number }
    return Number(r.n)
  }

  markState(ids: string[], agent: string, to: MessageState, from: MessageState[]): number {
    if (ids.length === 0) return 0
    const marks = ids.map(() => '?').join(',')
    const fromMarks = from.map(() => '?').join(',')
    const r = this.db
      .prepare(`UPDATE messages SET state=? WHERE to_agent=? AND id IN (${marks}) AND state IN (${fromMarks})`)
      .run(to, agent, ...ids, ...from)
    return Number(r.changes)
  }

  /** Delete the oldest messages of the given state until the inbox has room. */
  dropOldest(agent: string, state: MessageState, count: number): number {
    const r = this.db
      .prepare('DELETE FROM messages WHERE seq IN (SELECT seq FROM messages WHERE to_agent=? AND state=? ORDER BY seq LIMIT ?)')
      .run(agent, state, count)
    return Number(r.changes)
  }

  deleteAckedBefore(cutoffMs: number): number {
    const r = this.db.prepare("DELETE FROM messages WHERE state='acked' AND created_ms < ?").run(cutoffMs)
    return Number(r.changes)
  }

  hasMessageId(id: string): boolean {
    return this.db.prepare('SELECT 1 AS x FROM messages WHERE id=?').get(id) !== undefined
  }

  // --- outbox (messages for other hosts that are not acknowledged yet) ----------

  insertOutbox(r: OutboxRow): void {
    this.db
      .prepare('INSERT OR REPLACE INTO outbox (id,peer,frame,sender_agent,to_display,created_ms) VALUES (?,?,?,?,?,?)')
      .run(r.id, r.peer, r.frame, r.sender_agent, r.to_display, r.created_ms)
  }

  getOutbox(id: string): OutboxRow | undefined {
    const r = this.db.prepare('SELECT * FROM outbox WHERE id=?').get(id)
    return r ? plain<OutboxRow>(r) : undefined
  }

  outboxForPeer(peer: string): OutboxRow[] {
    return this.db.prepare('SELECT * FROM outbox WHERE peer=? ORDER BY created_ms, id').all(peer).map(r => plain<OutboxRow>(r))
  }

  countOutbox(peer: string): number {
    const r = this.db.prepare('SELECT COUNT(*) AS n FROM outbox WHERE peer=?').get(peer) as { n: number }
    return Number(r.n)
  }

  deleteOutbox(id: string): void {
    this.db.prepare('DELETE FROM outbox WHERE id=?').run(id)
  }

  outboxExpired(cutoffMs: number): OutboxRow[] {
    return this.db.prepare('SELECT * FROM outbox WHERE created_ms < ?').all(cutoffMs).map(r => plain<OutboxRow>(r))
  }

  // --- idle subscriptions -----------------------------------------------------

  upsertIdleSub(requester: string, target: string, now: number): void {
    this.db.prepare('INSERT OR REPLACE INTO idle_subs (requester,target,created_at) VALUES (?,?,?)').run(requester, target, now)
  }

  takeIdleSubs(target: string): IdleSubRow[] {
    const rows = this.db.prepare('SELECT * FROM idle_subs WHERE target=?').all(target).map(r => plain<IdleSubRow>(r))
    this.db.prepare('DELETE FROM idle_subs WHERE target=?').run(target)
    return rows
  }

  upsertRemoteIdleSub(host: string, requesterAddr: string, targetAgent: string, now: number): void {
    this.db
      .prepare('INSERT OR REPLACE INTO remote_idle_subs (host,requester_addr,target_agent,created_at) VALUES (?,?,?,?)')
      .run(host, requesterAddr, targetAgent, now)
  }

  takeRemoteIdleSubs(targetAgent: string): RemoteIdleSubRow[] {
    const rows = this.db.prepare('SELECT * FROM remote_idle_subs WHERE target_agent=?').all(targetAgent).map(r => plain<RemoteIdleSubRow>(r))
    this.db.prepare('DELETE FROM remote_idle_subs WHERE target_agent=?').run(targetAgent)
    return rows
  }

  idleSubTargets(): string[] {
    const local = this.db.prepare('SELECT DISTINCT target FROM idle_subs').all().map(r => (r as { target: string }).target)
    const remote = this.db.prepare('SELECT DISTINCT target_agent FROM remote_idle_subs').all().map(r => (r as { target_agent: string }).target_agent)
    return [...new Set([...local, ...remote])]
  }

  // --- gc ---------------------------------------------------------------------

  inactiveAgentsWithoutMessages(cutoffMs: number): string[] {
    return this.db
      .prepare(
        'SELECT agent FROM agents WHERE active=0 AND last_seen < ? AND NOT EXISTS (SELECT 1 FROM messages WHERE to_agent=agents.agent)',
      )
      .all(cutoffMs)
      .map(r => (r as { agent: string }).agent)
  }
}
