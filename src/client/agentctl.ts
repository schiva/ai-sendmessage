// agentctl: command line client for agentd (any agent that can run a shell can use it).
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { Client, ApiCallError } from './client.ts'
import { findSessionPid, sessionAliveCheck, waitForWake, wakeCommand, wakeOptionsFromEnv } from './wake.ts'

const USAGE = `agentctl - AgentLink command line client

Usage: agentctl [options] <command> [args]

Identity (for every command except ping, stop, peers, pair and acl):
  --as <name>        act as the agent <name> (registered under the key "cli:<name>")
  --agent <id>       act as an already registered agent id (or set AGENTLINK_AGENT)

Commands:
  register           register the agent and print its id and address
  unregister         mark the agent offline
  send <to> <text…>  send a message (to: name | name@host | name@host [ref])
  list [--local]     list other agents
  inbox              read new messages (marks them delivered); --peek keeps them new
  ack <id…>          acknowledge messages
  status <busy|idle> set the agent status
  idle-notify <to>   ask for one notice when <to> becomes idle
  watch              stream incoming messages until interrupted
  wake               wait, without reading anything, until a message is waiting, then print one line and exit.
                     Run it as a background command in a Claude Code session so a message wakes the idle session.
  ping               start agentd if needed and print its info
  acl [reload]       show the ACL (who may send to whom); reload re-reads acl.json
  acl check <from> <to>  ask whether name@host may send to name@host
  peers [reload]     show LAN links, the certificate fingerprint of this host, and re-read peers.json
  pair               connect two PCs: prints a one-time code (valid 10 minutes), then waits for the other PC
  pair <code>        on the other PC: join with that code; both PCs then know each other
  stop               shut agentd down

Options:
  --json             print raw JSON
  --kind <kind>      agent kind for register (default "cli")
  --cwd <dir>        working directory shown in list (default: current directory)
  --summary <text>   short label for send
  --reply-to <id>    id of the message you are answering
  --limit <n>        max messages for inbox (default 20)
  --wait <ms>        for inbox: wait up to <ms> for a new message
  --state <s>        inbox state filter: new | delivered | acked | any
  --peek             inbox without changing message state
  --address <ip>     for pair: the IP of this PC that the other PC should use (default: detected)
  --port <n>         for pair: LAN port (default 7420)
  --ttl <seconds>    for pair: how long the code is valid (default 600)
`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    as: { type: 'string' },
    agent: { type: 'string' },
    json: { type: 'boolean' },
    kind: { type: 'string' },
    cwd: { type: 'string' },
    summary: { type: 'string' },
    'reply-to': { type: 'string' },
    limit: { type: 'string' },
    wait: { type: 'string' },
    state: { type: 'string' },
    peek: { type: 'boolean' },
    local: { type: 'boolean' },
    address: { type: 'string' },
    port: { type: 'string' },
    ttl: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
})

const [command, ...rest] = positionals

function out(obj: unknown, human: string): void {
  console.log(values.json ? JSON.stringify(obj, null, 2) : human)
}

function fail(code: number, msg: string): never {
  console.error(msg)
  process.exit(code)
}

async function main(): Promise<void> {
  if (!command || values.help) {
    console.log(USAGE)
    return
  }
  const client = await Client.connect({ autostart: command !== 'stop' })

  if (command === 'ping') {
    out(client.hello, `agentd ${client.hello.server_version} host=${client.hello.host} pid=${client.hello.pid} lease=${client.hello.lease_ms}ms`)
    client.close()
    return
  }
  if (command === 'acl') {
    if (rest[0] === 'check') {
      if (!rest[1] || !rest[2]) fail(2, 'usage: agentctl acl check <from name@host> <to name@host>')
      const r = (await client.request('acl_check', { from: rest[1], to: rest[2] })) as { allowed: boolean; reason: string }
      out(r, `${r.allowed ? 'ALLOWED' : 'DENIED'}: ${rest[1]} -> ${rest[2]} (${r.reason})`)
      client.close()
      process.exit(r.allowed ? 0 : 1)
    }
    const r = (await client.request(rest[0] === 'reload' ? 'reload_acl' : 'acl')) as { default: string; rules: string[]; errors: string[]; fail_closed: boolean }
    const lines = [
      `default: ${r.default}${r.fail_closed ? '  (FAIL CLOSED: acl.json is unusable, all sending is blocked)' : ''}`,
      ...(r.rules.length === 0 ? ['rules:   (none)'] : r.rules.map((x, i) => `rule ${i + 1}: ${x}`)),
      ...r.errors.map(e => `error:   ${e}`),
    ]
    out(r, lines.join('\n'))
    client.close()
    return
  }
  if (command === 'peers') {
    const r = (await client.request(rest[0] === 'reload' ? 'reload_peers' : 'peers')) as {
      host?: string
      fingerprint?: string
      listening?: { host: string; port: number } | null
      listen_error?: string | null
      config_errors?: string[]
      peers?: Array<{ host: string; link: string; since: number | null; queued: number; error: string | null }>
      starting?: boolean
    }
    const lines = [
      `host:        ${r.host ?? client.hello.host}`,
      `fingerprint: ${r.fingerprint ?? '(starting)'}`,
      `listening:   ${r.listening ? `${r.listening.host}:${r.listening.port}` : 'no'}${r.listen_error ? ` (error: ${r.listen_error})` : ''}`,
      ...(r.config_errors ?? []).map(e => `config error: ${e}`),
      ...((r.peers ?? []).length === 0 ? ['peers:       (none configured; add peers.json to the AgentLink data folder)'] : (r.peers ?? []).map(p => `peer ${p.host.padEnd(16)} ${p.link.padEnd(5)} queued=${p.queued}${p.error ? `  last error: ${p.error}` : ''}`)),
    ]
    out(r, lines.join('\n'))
    client.close()
    return
  }
  if (command === 'pair') {
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
    const linkUp = async (host: string) => {
      const s = (await client.request('peers')) as { peers?: Array<{ host: string; link: string }> }
      return s.peers?.find(p => p.host === host)?.link === 'up'
    }
    if (rest[0]) {
      const r = (await client.request('pair_join', { code: rest.join('') })) as { host: string; address: string; port: number; self: string }
      console.log(`Paired with ${r.host} (${r.address}:${r.port}). Waiting for the link...`)
      let up = false
      for (let i = 0; i < 20 && !up; i++) {
        up = await linkUp(r.host)
        if (!up) await sleep(1000)
      }
      console.log(up ? `Connected to ${r.host}. Agents there are now visible as name@${r.host}.` : `Paired, but the link to ${r.host} is not up yet. Check "agentctl peers" in a moment.`)
      client.close()
      return
    }
    const r = (await client.request('pair_start', {
      address: values.address,
      port: values.port ? Number(values.port) : undefined,
      ttl_s: values.ttl ? Number(values.ttl) : undefined,
    })) as { code: string; address: string; port: number; expires_s: number; host: string }
    console.log(`On the other PC run:\n\n  agentctl pair ${r.code}\n`)
    console.log(`This PC is "${r.host}" at ${r.address}:${r.port}. The code works once and expires in ${Math.round(r.expires_s / 60)} min.`)
    if (process.platform === 'win32') {
      const fw = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "(Get-NetFirewallRule -DisplayName 'AgentLink*' -ErrorAction SilentlyContinue | Measure-Object).Count"], { encoding: 'utf8', timeout: 10_000 })
      if (fw.status === 0 && fw.stdout.trim() === '0') {
        console.log(`\nNo firewall rule for AgentLink found. If the other PC cannot connect, run this once in an administrator PowerShell:\n\n  New-NetFirewallRule -DisplayName "AgentLink" -Direction Inbound -Protocol TCP -LocalPort ${r.port} -RemoteAddress LocalSubnet -Action Allow`)
      }
    }
    console.log('\nWaiting for the other PC (Ctrl+C to cancel)...')
    process.on('SIGINT', () => {
      client.request('pair_cancel').catch(() => {}).finally(() => process.exit(130))
    })
    for (;;) {
      await sleep(1000)
      const s = (await client.request('pair_status')) as { state: string; host: string | null; detail: string | null }
      if (s.state === 'waiting') continue
      if (s.state === 'paired' && s.host) {
        let up = false
        for (let i = 0; i < 20 && !up; i++) {
          up = await linkUp(s.host)
          if (!up) await sleep(1000)
        }
        console.log(up ? `Paired with ${s.host} and connected.` : `Paired with ${s.host}. The link comes up as soon as that PC connects (see "agentctl peers").`)
        client.close()
        return
      }
      fail(1, `Pairing ${s.state}${s.detail ? `: ${s.detail}` : ''}. Run "agentctl pair" again.`)
    }
  }
  if (command === 'stop') {
    await client.request('shutdown')
    out({ stopped: true }, 'agentd stopping')
    client.close()
    return
  }

  let agent = values.agent ?? process.env.AGENTLINK_AGENT
  if (!agent && values.as) {
    const r = (await client.request('register', {
      name: values.as,
      kind: values.kind ?? 'cli',
      cwd: values.cwd ?? process.cwd(),
      key: `cli:${values.as}`,
    })) as { agent: string; address: string }
    agent = r.agent
    if (command === 'register') {
      out(r, `${r.agent}  ${r.address}`)
      client.close()
      return
    }
  }
  if (!agent) fail(2, 'no identity: pass --as <name> or --agent <id> (or set AGENTLINK_AGENT)')

  switch (command) {
    case 'unregister': {
      await client.request('unregister', { agent })
      out({}, 'unregistered')
      break
    }
    case 'send': {
      const [to, ...words] = rest
      if (!to || words.length === 0) fail(2, 'usage: agentctl send <to> <text…>')
      const r = (await client.request('send', {
        agent,
        to,
        message: words.join(' '),
        summary: values.summary,
        reply_to: values['reply-to'],
      })) as { id: string; status: string; to: string }
      out(r, `${r.status}: ${r.id} -> ${r.to}`)
      break
    }
    case 'list': {
      const r = (await client.request('list', { agent, scope: values.local ? 'local' : 'all' })) as {
        self: string
        agents: Array<{ address: string; ref: string; kind: string; status: string; unread: number; cwd: string | null }>
        hosts?: Array<{ host: string; link: string; queued: number; error: string | null }>
      }
      const hostLines = (r.hosts ?? []).map(h => `host ${h.host}: link ${h.link}${h.queued ? `, ${h.queued} queued` : ''}${h.error ? ` (${h.error})` : ''}`)
      const lines = [`self: ${r.self}`, ...hostLines, ...r.agents.map(a => `${a.status.padEnd(7)} ${a.address} [${a.ref}]  kind=${a.kind} unread=${a.unread}${a.cwd ? ` cwd=${a.cwd}` : ''}`)]
      out(r, lines.join('\n'))
      break
    }
    case 'inbox': {
      const r = (await client.request('inbox', {
        agent,
        mode: values.peek ? 'peek' : 'take',
        limit: values.limit ? Number(values.limit) : undefined,
        wait_ms: values.wait ? Number(values.wait) : undefined,
        state: values.state,
      })) as { messages: Array<{ id: string; from: string; kind: string; state: string; message: string }>; remaining: number }
      if (r.messages.length === 0) out(r, '(no messages)')
      else out(r, r.messages.map(m => `[${m.id}] from ${m.from} (${m.kind}, ${m.state})\n${m.message}`).join('\n\n'))
      break
    }
    case 'ack': {
      if (rest.length === 0) fail(2, 'usage: agentctl ack <id…>')
      const r = (await client.request('ack', { agent, ids: rest })) as { acked: number }
      out(r, `acked ${r.acked}`)
      break
    }
    case 'status': {
      const s = rest[0]
      if (s !== 'busy' && s !== 'idle') fail(2, 'usage: agentctl status <busy|idle>')
      const r = (await client.request('heartbeat', { agent, status: s })) as { unread: number }
      out(r, `status ${s}, unread ${r.unread}`)
      break
    }
    case 'idle-notify': {
      if (!rest[0]) fail(2, 'usage: agentctl idle-notify <to>')
      const r = (await client.request('notify_when_idle', { agent, target: rest[0] })) as { immediate: boolean }
      out(r, r.immediate ? 'target is already idle; notice queued' : 'subscribed')
      break
    }
    case 'wake': {
      let first: Client | null = client
      const r = await waitForWake(async () => {
        const c = first ?? (await Client.connect())
        first = null
        return c
      }, { ...wakeOptionsFromEnv(agent), isSessionAlive: sessionAliveCheck(findSessionPid()) })
      if (r.reason === 'session-gone') return // the session was killed: there is nobody to tell
      if (r.reason === 'message') {
        const n = r.count
        console.log(
          `AgentLink: ${n} new message${n === 1 ? '' : 's'} arrived while this session was idle. Call read_inbox to read ${n === 1 ? 'it' : 'them'}, ` +
            `then start the watcher again in the background: ${wakeCommand(fileURLToPath(import.meta.url), agent)}`,
        )
      } else {
        console.log(`AgentLink: the watcher stopped after its time limit. Start it again if you still want to be woken: ${wakeCommand(fileURLToPath(import.meta.url), agent)}`)
      }
      return
    }
    case 'watch': {
      await client.request('subscribe', { agent, events: ['message', 'idle'] })
      client.on('event', (name: string, data: { from: string; message: string }) => {
        console.log(values.json ? JSON.stringify({ event: name, data }) : `[${name}] from ${data.from}: ${data.message}`)
      })
      await new Promise<void>(resolve => client.once('close', () => resolve()))
      return
    }
    default:
      fail(2, `unknown command "${command}"\n\n${USAGE}`)
  }
  client.close()
}

main().catch(e => {
  if (e instanceof ApiCallError) fail(1, `${e.code}: ${e.message}`)
  fail(1, e instanceof Error ? e.message : String(e))
})
