#!/usr/bin/env node
// Installs, updates or removes the AgentLink plugin in Claude Code. No dependencies, so it runs from a fresh clone (or from the
// raw file) without `npm install`. Meant for a person AND for an AI agent: it never prompts, it is safe to run twice,
// and it changes nothing until it is told the user agreed (--yes).
//
//   node scripts/install.mjs                 show the plan, change nothing (exit 3)
//   node scripts/install.mjs --yes           install (adds the marketplace, installs the plugin, verifies)
//   node scripts/install.mjs --dry-run       check the prerequisites and show the plan
//   node scripts/install.mjs --uninstall --yes [--remove-marketplace]
//   node scripts/install.mjs --update --yes         update, step 1 of 2: refresh the marketplace, update the plugin, end the idle
//                                                   watchers. Then every open Claude Code session must run /reload-plugins.
//   node scripts/install.mjs --finish-update --yes  update, step 2 of 2 (after the sessions were reloaded): stop the old daemon,
//                                                   start the new one and check that it is the installed version
//   options: --scope user|project|local   --source <owner/repo | folder>   --agentctl <file>   --json
//
// Exit codes: 0 done (or already done) | 1 a step failed | 2 prerequisites missing or bad usage | 3 consent required
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const PLUGIN_ID = 'agentlink@agentlink-marketplace'
const MARKETPLACE = 'agentlink-marketplace'
const GITHUB_SOURCE = 'schiva/ai-sendmessage'
const MIN_NODE = [22, 13]
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const { values: o } = parseArgs({
  options: {
    yes: { type: 'boolean', short: 'y' },
    'dry-run': { type: 'boolean' },
    uninstall: { type: 'boolean' },
    update: { type: 'boolean' },
    'finish-update': { type: 'boolean' },
    'remove-marketplace': { type: 'boolean' },
    scope: { type: 'string', default: 'user' },
    source: { type: 'string' },
    agentctl: { type: 'string' },
    json: { type: 'boolean' },
    'ignore-platform': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
})

if (o.help) {
  const lines = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1)
  const end = lines.findIndex(l => !l.startsWith('//'))
  console.log(lines.slice(0, end).map(l => l.slice(3)).join('\n'))
  process.exit(0)
}

const mode = o.uninstall ? 'uninstall' : o.update ? 'update' : o['finish-update'] ? 'finish-update' : 'install'
const report = { ok: false, exit: 1, mode, scope: o.scope, source: '', changed: false, steps: [], notes: [], pending: [], error: null }
const say = text => {
  if (!o.json) console.log(text)
}

function finish(exit, error = null) {
  report.exit = exit
  report.ok = exit === 0
  report.error = error
  if (error) say(`ERROR: ${error}`)
  if (o.json) console.log(JSON.stringify(report, null, 2))
  process.exit(exit)
}

// --- usage ------------------------------------------------------------------------------------------------------
if (!['user', 'project', 'local'].includes(o.scope)) finish(2, `--scope must be user, project or local (got "${o.scope}")`)
if ([o.uninstall, o.update, o['finish-update']].filter(Boolean).length > 1) finish(2, 'use only one of --uninstall, --update and --finish-update')

// --- prerequisites -------------------------------------------------------------------------------------------------
if (process.platform !== 'win32' && !o['ignore-platform']) {
  finish(2, 'AgentLink supports Windows 11 only for now (its local API uses Windows named pipes). Use --ignore-platform to install the plugin anyway; it will not work.')
}
const [major, minor] = process.versions.node.split('.').map(Number)
if (major < MIN_NODE[0] || (major === MIN_NODE[0] && minor < MIN_NODE[1])) {
  finish(2, `Node.js ${MIN_NODE.join('.')} or newer is required (the daemon uses the built-in node:sqlite); this is ${process.versions.node}. The plugin runs "node" from PATH.`)
}

function findClaude() {
  if (process.env.CLAUDE_BIN) return fs.existsSync(process.env.CLAUDE_BIN) ? process.env.CLAUDE_BIN : null
  // On Windows an extensionless "claude" next to claude.cmd is a shell shim that cannot be spawned: look for the real .exe.
  const candidates = process.platform === 'win32' ? ['claude.exe', 'node_modules/@anthropic-ai/claude-code/bin/claude.exe'] : ['claude']
  for (const dir of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    for (const rel of candidates) {
      const p = path.join(dir, rel)
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
    }
  }
  return null
}
const claude = findClaude()
if (!claude) finish(2, 'Claude Code was not found. Install it first (https://code.claude.com/docs), make sure "claude" is on PATH, or set CLAUDE_BIN to the path of claude.exe.')

/** CLAUDE_BIN may also be a .js/.mjs script, run by node: this is how tests and wrappers stand in for Claude Code. */
const claudeIsScript = /\.(mjs|cjs|js)$/i.test(claude)

function run(args) {
  const r = claudeIsScript ? spawnSync(process.execPath, [claude, ...args], { encoding: 'utf8', timeout: 180_000, env: process.env }) : spawnSync(claude, args, { encoding: 'utf8', timeout: 180_000, env: process.env })
  return { status: r.status, stdout: r.stdout ?? '', out: `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? ` [${r.error.message}]` : ''}`.trim() }
}

const version = run(['--version'])
if (version.status !== 0) finish(2, `"claude --version" failed: ${version.out.slice(0, 200)}`)
const help = run(['plugin', '--help'])
if (help.status !== 0 || !/marketplace/.test(help.out)) finish(2, `This Claude Code (${version.out}) has no "claude plugin marketplace" command. Update Claude Code.`)
report.notes.push(`claude: ${version.out}`)
say(`Claude Code: ${version.out}`)

// --- current state -----------------------------------------------------------------------------------------------------
// Read as JSON (`claude plugin list --json`): the plain text is meant for people and its layout may change. Only a Claude Code that
// has no --json falls back to the text, and output that is not understood is an error: guessing "not installed" from output that was
// not understood would make an uninstall report success without removing anything.
const snippet = text => text.replace(/\s+/g, ' ').slice(0, 160)

function readList(kind, args, fromText) {
  const j = run([...args, '--json'])
  if (j.status === 0) {
    let parsed = null
    try {
      parsed = JSON.parse(j.stdout.trim())
    } catch {
      // handled below
    }
    if (Array.isArray(parsed)) return { items: parsed }
    return { error: `could not read the ${kind}: "claude ${args.join(' ')} --json" printed something that is not a list (${snippet(j.out)})` }
  }
  if (!/unknown option|unrecognized|unexpected argument|--json/i.test(j.out)) {
    return { error: `could not read the ${kind}: "claude ${args.join(' ')}" failed (${snippet(j.out)})` }
  }
  const t = run(args)
  if (t.status !== 0) return { error: `could not read the ${kind}: "claude ${args.join(' ')}" failed (${snippet(t.out)})` }
  const items = fromText(t.out)
  return items ? { items } : { error: `could not read the ${kind}: the output of "claude ${args.join(' ')}" is not in a form this script knows (${snippet(t.out)})` }
}

/** Text form of `claude plugin marketplace list`: understood when it names marketplaces with a Source line, or says there are none. */
function marketplacesFromText(out) {
  const items = [...out.matchAll(/^\s*(?:[❯>*-]\s*)?(\S[^\n]*?)\s*\n\s*Source:\s*([^\n]+)/gm)].map(m => ({ name: m[1].trim(), source: m[2].trim() }))
  return items.length > 0 || /no marketplaces|nothing|none|empty/i.test(out) ? items : null
}

/** Text form of `claude plugin list`: understood when it has plugin blocks (with Scope/Status lines), or says there are none. */
function pluginsFromText(out) {
  const blocks = out.split(/\n(?=\s*❯)/).filter(b => /❯/.test(b))
  const items = blocks.map(b => ({
    id: /❯\s*(\S+)/.exec(b)?.[1] ?? '',
    version: /Version:\s*(\S+)/.exec(b)?.[1] ?? null,
    scope: /Scope:\s*(\w+)/.exec(b)?.[1] ?? null,
    enabled: !/Status:\s*\S*\s*disabled/i.test(b),
    installPath: null,
  }))
  return items.length > 0 || /no plugins|nothing|none|empty/i.test(out) ? items : null
}

/** "github schiva/ai-sendmessage": the kind of source and where it is, from whichever of repo/path/url the entry has. */
const describeSource = m => {
  const where = [m.repo, m.path, m.url].find(x => typeof x === 'string')
  const kind = typeof m.source === 'string' ? m.source : ''
  return [kind, where].filter(Boolean).join(' ') || 'unknown source'
}

/**
 * A plugin whose marketplace is a folder (a clone used as the marketplace) is read live from that folder: "claude plugin list --json"
 * then still shows the version and cache of the day it was installed, next to readFromFolder and folderVersion. What runs is the folder,
 * so that is the version and the place of agentctl that count.
 */
const live = p => (typeof p.readFromFolder === 'string' && p.readFromFolder !== '' ? { ...p, version: p.folderVersion ?? p.version, installPath: p.readFromFolder, live: true } : p)

const marketplaceList = readList('marketplaces', ['plugin', 'marketplace', 'list'], marketplacesFromText)
const pluginList = marketplaceList.error ? null : readList('plugin list', ['plugin', 'list'], pluginsFromText)
const readError = marketplaceList.error ?? pluginList?.error
if (readError) finish(1, `${readError}. Nothing was changed.`)

const marketplace = marketplaceList.items.find(m => m.name === MARKETPLACE) ?? null
const hasMarketplace = marketplace !== null
const pluginEntries = pluginList.items.filter(p => p.id === PLUGIN_ID).map(live)
if (pluginEntries.length > 1) report.notes.push(`${PLUGIN_ID} is installed in more than one scope (${pluginEntries.map(p => p.scope).join(', ')})`)
const entry = pluginEntries.find(p => p.scope === o.scope) ?? pluginEntries[0] ?? null
const installed = entry !== null
const installedScope = entry?.scope ?? null
const disabled = entry !== null && entry.enabled === false

// The marketplace source: the clone this script lives in, when it is one; otherwise GitHub.
const localMarketplace = fs.existsSync(path.join(repoRoot, '.claude-plugin', 'marketplace.json'))
report.source = o.source ?? (localMarketplace ? repoRoot : GITHUB_SOURCE)

/** The agentctl of the installed plugin (or the one given with --agentctl): the new version's, so it knows every way to stop a watcher. */
function agentctlFile(installPath) {
  if (o.agentctl) return path.resolve(o.agentctl)
  return installPath ? path.join(installPath, 'dist', 'agentctl.mjs') : null
}

function agentctl(file, args, timeout = 90_000) {
  const r = spawnSync(process.execPath, ['--no-warnings', file, ...args], { encoding: 'utf8', timeout, env: process.env })
  return { status: r.status, stdout: (r.stdout ?? '').trim(), stderr: (r.stderr ?? '').trim(), out: `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? ` [${r.error.message}]` : ''}`.trim() }
}

const sleepSync = ms => void Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

// --- plan ---------------------------------------------------------------------------------------------------------------------
const steps = []
if (mode === 'install') {
  if (hasMarketplace) report.notes.push(`marketplace "${MARKETPLACE}" is already registered (${describeSource(marketplace)}); it is kept as it is`)
  else steps.push({ title: `register the marketplace "${MARKETPLACE}" from ${report.source}`, args: ['plugin', 'marketplace', 'add', report.source] })
  if (installed) {
    report.notes.push(`${PLUGIN_ID} is already installed (scope ${installedScope ?? 'unknown'})`)
    if (disabled) steps.push({ title: `enable ${PLUGIN_ID}`, args: ['plugin', 'enable', PLUGIN_ID] })
  } else steps.push({ title: `install ${PLUGIN_ID} (scope ${o.scope})`, args: ['plugin', 'install', PLUGIN_ID, '--scope', o.scope] })
} else if (mode === 'uninstall') {
  if (installed) steps.push({ title: `uninstall ${PLUGIN_ID} (scope ${installedScope ?? o.scope})`, args: ['plugin', 'uninstall', PLUGIN_ID, '--scope', installedScope ?? o.scope] })
  else report.notes.push(`${PLUGIN_ID} is not installed`)
  if (o['remove-marketplace'] && hasMarketplace) steps.push({ title: `remove the marketplace "${MARKETPLACE}"`, args: ['plugin', 'marketplace', 'remove', MARKETPLACE] })
} else if (mode === 'update') {
  if (!installed) finish(1, `${PLUGIN_ID} is not installed, so there is nothing to update. Install it first (run this script without --update).`)
  if (!hasMarketplace) finish(1, `the marketplace "${MARKETPLACE}" is not registered, so the plugin cannot be updated. Run this script without --update to register it.`)
  report.notes.push(`installed: ${PLUGIN_ID} ${entry.version ?? 'unknown version'} (scope ${installedScope ?? 'unknown'})`)
  steps.push({ title: `refresh the marketplace "${MARKETPLACE}"`, args: ['plugin', 'marketplace', 'update', MARKETPLACE] })
  if (entry.live) report.notes.push(`${PLUGIN_ID} is read straight from the folder ${entry.installPath} (version ${entry.version}): its files are current after a git pull, there is no cache to update`)
  else steps.push({ title: `update ${PLUGIN_ID} (scope ${installedScope ?? o.scope})`, args: ['plugin', 'update', PLUGIN_ID, ...(installedScope ? ['--scope', installedScope] : [])] })
  steps.push({ title: 'end the idle watchers (agentctl wake --stop of the new version), only if the version changed', args: null })
} else {
  if (!installed) finish(1, `${PLUGIN_ID} is not installed, so there is no new daemon to check.`)
  steps.push({ title: 'stop the running AgentLink daemon (agentctl stop)', args: null })
  steps.push({ title: `start the new one and check that it is version ${entry.version ?? '(installed)'} (agentctl ping)`, args: null })
}

say(`\nPlan (${report.mode}):`)
for (const s of steps) say(`  - ${s.title}`)
if (steps.length === 0) say('  - nothing to do')
for (const n of report.notes.slice(1)) say(`  note: ${n}`)
report.steps = steps.map(s => ({ title: s.title, command: s.args ? `claude ${s.args.join(' ')}` : null, status: 'planned' }))

if (steps.length === 0) {
  if (mode === 'install') report.notes.push('Open a new Claude Code session (or run /reload-plugins in a running one) to use it.')
  finish(0)
}

if (mode === 'finish-update') {
  say('\nWhat this changes: it stops the AgentLink daemon of this user; the next command starts the new one. Sessions that were not reloaded may have to be reloaded first.')
} else if (mode === 'update') {
  say('\nWhat this changes: the plugin cache under ~/.claude (a newer version of AgentLink is installed) and the idle watchers of this user are ended. Open Claude Code sessions keep running the old version until /reload-plugins.')
} else {
  say('\nWhat this changes: the Claude Code configuration of this user (plugin registry and plugin cache under ~/.claude, and the settings file of the chosen scope).')
  if (mode === 'install') say('Afterwards EVERY Claude Code session in that scope runs the AgentLink hooks and MCP server, and a background daemon starts on first use.')
}

if (o['dry-run']) {
  say('\nDry run: nothing was changed.')
  finish(0)
}
if (!o.yes) {
  say('\nNOT CHANGED. This edits the user\'s Claude Code configuration, so ask the user first, then rerun with --yes.')
  finish(3, 'consent required: rerun with --yes after the user agreed')
}

// --- execute: update, step 2 -------------------------------------------------------------------------------------------------
if (mode === 'finish-update') {
  const file = agentctlFile(entry.installPath)
  if (!file || !fs.existsSync(file)) finish(1, `cannot find the agentctl of the installed plugin (${file ?? 'no install path in "claude plugin list"'}); pass it with --agentctl <file>`)
  const want = entry.version
  say(`\n> agentctl stop`)
  const stopped = agentctl(file, ['stop'])
  say(stopped.out || '(no output: probably no daemon was running)')
  report.steps[0].status = 'done'
  report.steps[0].output = stopped.out.slice(0, 1000)

  let ping = { status: null, stdout: '', stderr: '', out: '' }
  let running = null
  const settleEnv = process.env.AGENTLINK_UPDATE_SETTLE_MS
  const settleMs = settleEnv !== undefined && Number.isFinite(Number(settleEnv)) && Number(settleEnv) >= 0 ? Number(settleEnv) : 1500
  for (let attempt = 0; attempt < 4; attempt++) {
    sleepSync(attempt === 0 ? settleMs : settleMs + 500) // the old daemon needs a moment to go away, and a ping that is too early may still reach it
    say(`\n> agentctl ping`)
    ping = agentctl(file, ['ping'])
    say(ping.out)
    running = /agentd (\S+) host=/.exec(ping.stdout)?.[1] ?? null
    if (ping.status === 0 && running === want) break
  }
  report.steps[1].output = ping.out.slice(0, 1000)
  if (ping.status !== 0 || running === null) {
    report.steps[1].status = 'failed'
    finish(1, `"agentctl ping" did not report a running daemon (${snippet(ping.out)})`)
  }
  report.daemon = { version: running, expected: want }
  if (running !== want) {
    report.steps[1].status = 'failed'
    report.pending.push('run /reload-plugins in every open Claude Code session (or close them), then run --finish-update again')
    finish(1, `the daemon is version ${running} but the installed plugin is ${want}: a session that was not reloaded (an old MCP server or idle watcher) starts the old daemon again. Reload or close the remaining sessions, then run this again.`)
  }
  report.steps[1].status = 'done'
  report.changed = true
  report.notes.push(`the daemon is version ${running}, the installed version`)
  if (/warning:/.test(ping.stderr)) report.notes.push(`agentctl warned: ${snippet(ping.stderr)}`)
  say(`\nVerified: the AgentLink daemon is version ${running}, the installed version.`)
  say('Next: each Claude Code session needs a new idle watcher; its SessionStart note (or the Stop hook) says how.')
  finish(0)
}

// --- execute: install, uninstall and update step 1 -------------------------------------------------------------------------------
const before = entry
for (let i = 0; i < steps.length; i++) {
  const s = steps[i]
  if (s.args === null) continue // the watcher step of an update, below
  say(`\n> claude ${s.args.join(' ')}`)
  const r = run(s.args)
  say(r.out)
  report.steps[i].status = r.status === 0 ? 'done' : 'failed'
  report.steps[i].output = r.out.slice(0, 2000)
  if (r.status !== 0) finish(1, `step failed: ${s.title}`)
  report.changed = true
}

// --- verify ---------------------------------------------------------------------------------------------------------------------
const after = readList('plugin list', ['plugin', 'list'], pluginsFromText)
if (after.error) finish(1, `${after.error}, so the result could not be verified`)
// Only the scope that was worked on counts: after uninstalling one scope the plugin may legitimately stay installed in another.
const scopeWorkedOn = installedScope ?? o.scope
const afterEntry = after.items.map(live).find(p => p.id === PLUGIN_ID && (p.scope === scopeWorkedOn || p.scope === null)) ?? null

if (mode === 'install') {
  if (!afterEntry || afterEntry.enabled === false) finish(1, `installed, but "claude plugin list" does not show ${PLUGIN_ID} as enabled`)
  say(`\nVerified: ${PLUGIN_ID} is installed and enabled.`)
  report.notes.push('Open a new Claude Code session (or run /reload-plugins in a running one) to use it.')
  report.notes.push('Optional: set AGENTLINK_NAME to name a session; see docs/LAN.md to connect other PCs.')
  say('Next: open a new Claude Code session (or run /reload-plugins in a running one). In it, the MCP tools send_message, list_agents, read_inbox and ack_messages are available.')
} else if (mode === 'uninstall') {
  if (afterEntry) finish(1, `uninstall finished but ${PLUGIN_ID} is still listed`)
  say(`\nVerified: ${PLUGIN_ID} is no longer installed.`)
  report.notes.push('A running AgentLink daemon is not stopped by this: run "agentctl stop" (see docs/PLUGIN.md) if one is running.')
  say('Note: a running AgentLink daemon keeps running until you stop it ("agentctl stop").')
} else {
  // update, step 1
  report.version_before = before.version ?? null
  report.version_after = afterEntry?.version ?? null
  // A plugin read from its folder has no new version to wait for: the folder is current, the running daemon and sessions may not be.
  const changedVersion = afterEntry !== null && (afterEntry.live === true || afterEntry.version !== before.version)
  const watcherStep = report.steps.length - 1
  if (!changedVersion) {
    report.steps[watcherStep].status = 'skipped'
    report.notes.push(`the version did not change (${before.version ?? 'unknown'}): nothing to reload`)
    report.notes.push('If the repository has newer commits but "claude plugin update" says "already at the latest version", they did not change the version number: see INSTALL.md (update).')
    say(`\nThe installed version did not change (${before.version ?? 'unknown'}): already the latest. Nothing else to do.`)
    finish(0)
  }
  if (afterEntry.live) say(`\nThis plugin is read straight from ${afterEntry.installPath}: its files are version ${afterEntry.version}. Sessions and the daemon that were started earlier may still run an older one.`)
  else say(`\nUpdated: ${before.version ?? 'unknown'} -> ${afterEntry.version}.`)
  const file = agentctlFile(afterEntry.installPath)
  if (!file || !fs.existsSync(file)) {
    report.steps[watcherStep].status = 'failed'
    finish(1, `the plugin was updated, but the agentctl of the new version was not found (${file ?? 'no install path in "claude plugin list"'}), so the idle watchers were not ended: run "agentctl wake --stop" yourself, or pass --agentctl <file>`)
  }
  say(`\n> agentctl wake --stop`)
  const stop = agentctl(file, ['wake', '--stop'])
  say(stop.out)
  report.steps[watcherStep].output = stop.out.slice(0, 1000)
  report.steps[watcherStep].status = stop.status === 0 ? 'done' : 'failed'
  if (stop.status !== 0) finish(1, `the plugin was updated, but "agentctl wake --stop" failed (${snippet(stop.out)}): end the idle watchers yourself, then continue`)
  report.pending.push('run /reload-plugins in every open Claude Code session (or close and reopen them)')
  report.pending.push('then run: node scripts/install.mjs --finish-update --yes')
  say('\nNext, in this order:')
  say('  1. In EVERY open Claude Code session run /reload-plugins (or close and reopen it). Until then the session still runs the old version.')
  say('  2. Then run: node scripts/install.mjs --finish-update --yes   (stops the old daemon and checks that the new one is the installed version)')
}
finish(0)
