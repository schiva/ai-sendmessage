// agentd entry point. Started on demand by the client library (see src/client/client.ts).
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { homeDir, hostName, loadConfig, pipePath } from './config.ts'
import { Core } from './core.ts'
import { PeerManager } from './peers.ts'
import { loadPeersConfig } from './peers-config.ts'
import { Server } from './server.ts'
import { Acl, parsePattern } from './acl.ts'
import { ApiError } from './protocol.ts'
import { Store } from './store.ts'
import { ensureTls } from './tls.ts'

const home = homeDir()
fs.mkdirSync(home, { recursive: true })
const logFile = path.join(home, 'agentd.log')

function log(line: string): void {
  try {
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`)
  } catch {
    // logging must never take the daemon down
  }
}

function ensureToken(file: string): string {
  try {
    const t = randomBytes(32).toString('hex')
    fs.writeFileSync(file, t, { flag: 'wx' })
    return t
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
    return fs.readFileSync(file, 'utf8').trim()
  }
}

const token = ensureToken(path.join(home, 'token'))
const cfg = loadConfig()
const server = await (async () => {
  // Bind the pipe first: whoever wins the pipe is the single instance.
  const store = new Store(path.join(home, 'agentd.db'))
  const host = hostName()
  const core = new Core(store, host, cfg)
  // The LAN layer starts after the pipe is bound, because creating the TLS identity can take a moment.
  const acl = new Acl(home, host)
  const aclState = acl.load(true)
  core.setAcl(acl)
  if (aclState.errors.length > 0) log(`acl.json: ${aclState.errors.join('; ')}${aclState.failClosed ? ' (all sending is blocked until it is fixed)' : ''}`)
  const aclStatus = () => ({ default: acl.status().default, rules: acl.status().rules.map(r => r.text), errors: acl.status().errors, fail_closed: acl.status().failClosed })
  let peers: PeerManager | null = null
  let markReady: () => void = () => {}
  const lanReady = new Promise<void>(resolve => (markReady = resolve))
  const waitForLan = () => Promise.race([lanReady, new Promise<void>(r => setTimeout(r, 5000))])
  const srv = new Server(core, token, log, {
    aclStatus,
    reloadAcl: () => {
      const st = acl.load(false)
      if (st.errors.length > 0) log(`acl.json: ${st.errors.join('; ')}`)
      return aclStatus()
    },
    aclCheck: (from: string, to: string) => {
      const f = parsePattern(from, host)
      const t = parsePattern(to, host)
      if (typeof f === 'string') throw new ApiError('BAD_REQUEST', `from: ${f}`)
      if (typeof t === 'string') throw new ApiError('BAD_REQUEST', `to: ${t}`)
      if (f.name === '*' || f.host === '*' || t.name === '*' || t.host === '*') throw new ApiError('BAD_REQUEST', 'acl_check needs concrete name@host addresses')
      const d = acl.check({ name: f.name, host: f.host }, { name: t.name, host: t.host })
      return { allowed: d.allowed, rule: d.rule, reason: d.reason }
    },
    peersStatus: async () => {
      await waitForLan()
      return peers ? peers.status() : { starting: true, peers: [] }
    },
    reloadPeers: async () => {
      await waitForLan()
      if (!peers) throw new ApiError('INTERNAL', 'the LAN layer did not start; see agentd.log')
      await peers.apply(loadPeersConfig(home, host))
      return peers.status()
    },
  })
  try {
    await srv.listen(pipePath())
  } catch (e) {
    store.close()
    if ((e as NodeJS.ErrnoException).code === 'EADDRINUSE') process.exit(0)
    throw e
  }
  const timer = setInterval(() => {
    try {
      core.sweep()
      peers?.sweep()
    } catch (err) {
      log(`sweep failed: ${String(err)}`)
    }
  }, cfg.sweepMs)
  timer.unref()
  // Registered before the slow part of start-up (TLS identity, peers), so an early "shutdown" request is never ignored.
  srv.once('shutdown', () => {
    clearInterval(timer)
    // Whatever happens below, the process is gone within 2s: a daemon that lingers would hold the pipe and
    // make the next client talk to an instance that is about to exit. SQLite commits are synchronous, so
    // nothing is lost by exiting early.
    setTimeout(() => process.exit(0), 2000).unref()
    setTimeout(async () => {
      const upTo = (p: Promise<unknown>, ms: number) => Promise.race([p, new Promise(r => setTimeout(r, ms))])
      await upTo(srv.close(), 500) // free the pipe first: a client that starts a new daemon must not find this one
      await upTo(peers?.stop() ?? Promise.resolve(), 500)
      try {
        store.close()
      } catch {
        // already closed
      }
      log('shutdown')
      process.exit(0)
    }, 50)
  })
  const tls = await ensureTls(home, host)
  peers = new PeerManager({ core, store, cfg, tls, selfHost: host, log })
  core.setRemote(peers)
  // LAN peering is optional: it only starts when peers.json lists at least one peer.
  await peers.apply(loadPeersConfig(home, host))
  markReady()
  return srv
})()

log(`agentd started pid=${process.pid} pipe=${pipePath()} host=${hostName()}`)
void server
