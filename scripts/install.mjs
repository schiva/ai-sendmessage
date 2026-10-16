#!/usr/bin/env node
// Installs or removes the AgentLink plugin in Claude Code. No dependencies, so it runs from a fresh clone (or from the
// raw file) without `npm install`. Meant for a person AND for an AI agent: it never prompts, it is safe to run twice,
// and it changes nothing until it is told the user agreed (--yes).
//
//   node scripts/install.mjs                 show the plan, change nothing (exit 3)
//   node scripts/install.mjs --yes           install (adds the marketplace, installs the plugin, verifies)
//   node scripts/install.mjs --dry-run       check the prerequisites and show the plan
//   node scripts/install.mjs --uninstall --yes [--remove-marketplace]
//   options: --scope user|project|local   --source <owner/repo | folder>   --json
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
    'remove-marketplace': { type: 'boolean' },
    scope: { type: 'string', default: 'user' },
    source: { type: 'string' },
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

const report = { ok: false, exit: 1, mode: o.uninstall ? 'uninstall' : 'install', scope: o.scope, source: '', changed: false, steps: [], notes: [], error: null }
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

function run(args) {
  const r = spawnSync(claude, args, { encoding: 'utf8', timeout: 180_000, env: process.env })
  return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? ` [${r.error.message}]` : ''}`.trim() }
}

const version = run(['--version'])
if (version.status !== 0) finish(2, `"claude --version" failed: ${version.out.slice(0, 200)}`)
const help = run(['plugin', '--help'])
if (help.status !== 0 || !/marketplace/.test(help.out)) finish(2, `This Claude Code (${version.out}) has no "claude plugin marketplace" command. Update Claude Code.`)
report.notes.push(`claude: ${version.out}`)
say(`Claude Code: ${version.out}`)

// --- current state -----------------------------------------------------------------------------------------------------
const marketplaces = run(['plugin', 'marketplace', 'list'])
const marketplaceBlock = new RegExp(`${MARKETPLACE}[^\\n]*\\n\\s*Source:\\s*([^\\n]+)`).exec(marketplaces.out)
const hasMarketplace = marketplaceBlock !== null
const installedList = run(['plugin', 'list'])
const installedBlock = new RegExp(`${PLUGIN_ID}[\\s\\S]*?(?=\\n\\s*❯|$)`).exec(installedList.out)
const installed = installedBlock !== null
const installedScope = /Scope:\s*(\w+)/.exec(installedBlock?.[0] ?? '')?.[1] ?? null
const disabled = /Status:\s*\S*\s*disabled/i.test(installedBlock?.[0] ?? '')

// The marketplace source: the clone this script lives in, when it is one; otherwise GitHub.
const localMarketplace = fs.existsSync(path.join(repoRoot, '.claude-plugin', 'marketplace.json'))
report.source = o.source ?? (localMarketplace ? repoRoot : GITHUB_SOURCE)

// --- plan ---------------------------------------------------------------------------------------------------------------------
const steps = []
if (!o.uninstall) {
  if (hasMarketplace) report.notes.push(`marketplace "${MARKETPLACE}" is already registered (${marketplaceBlock[1].trim()}); it is kept as it is`)
  else steps.push({ title: `register the marketplace "${MARKETPLACE}" from ${report.source}`, args: ['plugin', 'marketplace', 'add', report.source] })
  if (installed) {
    report.notes.push(`${PLUGIN_ID} is already installed (scope ${installedScope ?? 'unknown'})`)
    if (disabled) steps.push({ title: `enable ${PLUGIN_ID}`, args: ['plugin', 'enable', PLUGIN_ID] })
  } else steps.push({ title: `install ${PLUGIN_ID} (scope ${o.scope})`, args: ['plugin', 'install', PLUGIN_ID, '--scope', o.scope] })
} else {
  if (installed) steps.push({ title: `uninstall ${PLUGIN_ID} (scope ${installedScope ?? o.scope})`, args: ['plugin', 'uninstall', PLUGIN_ID, '--scope', installedScope ?? o.scope] })
  else report.notes.push(`${PLUGIN_ID} is not installed`)
  if (o['remove-marketplace'] && hasMarketplace) steps.push({ title: `remove the marketplace "${MARKETPLACE}"`, args: ['plugin', 'marketplace', 'remove', MARKETPLACE] })
}

say(`\nPlan (${report.mode}):`)
for (const s of steps) say(`  - ${s.title}`)
if (steps.length === 0) say('  - nothing to do')
for (const n of report.notes.slice(1)) say(`  note: ${n}`)
report.steps = steps.map(s => ({ title: s.title, command: `claude ${s.args.join(' ')}`, status: 'planned' }))

if (steps.length === 0) {
  if (!o.uninstall) report.notes.push('Open a new Claude Code session (or run /reload-plugins in a running one) to use it.')
  finish(0)
}

say('\nWhat this changes: the Claude Code configuration of this user (plugin registry and plugin cache under ~/.claude, and the settings file of the chosen scope).')
if (!o.uninstall) say('Afterwards EVERY Claude Code session in that scope runs the AgentLink hooks and MCP server, and a background daemon starts on first use.')

if (o['dry-run']) {
  say('\nDry run: nothing was changed.')
  finish(0)
}
if (!o.yes) {
  say('\nNOT CHANGED. This edits the user\'s Claude Code configuration, so ask the user first, then rerun with --yes.')
  finish(3, 'consent required: rerun with --yes after the user agreed')
}

// --- execute -------------------------------------------------------------------------------------------------------------------
for (let i = 0; i < steps.length; i++) {
  const s = steps[i]
  say(`\n> claude ${s.args.join(' ')}`)
  const r = run(s.args)
  say(r.out)
  report.steps[i].status = r.status === 0 ? 'done' : 'failed'
  report.steps[i].output = r.out.slice(0, 2000)
  if (r.status !== 0) finish(1, `step failed: ${s.title}`)
  report.changed = true
}

// --- verify ---------------------------------------------------------------------------------------------------------------------------
const after = run(['plugin', 'list'])
if (!o.uninstall) {
  const ok = after.out.includes(PLUGIN_ID) && /Status:\s*\S*\s*enabled/i.test(after.out.slice(after.out.indexOf(PLUGIN_ID)))
  if (!ok) finish(1, `installed, but "claude plugin list" does not show ${PLUGIN_ID} as enabled:\n${after.out}`)
  say(`\nVerified: ${PLUGIN_ID} is installed and enabled.`)
  report.notes.push('Open a new Claude Code session (or run /reload-plugins in a running one) to use it.')
  report.notes.push('Optional: set AGENTLINK_NAME to name a session; see docs/LAN.md to connect other PCs.')
  say('Next: open a new Claude Code session (or run /reload-plugins in a running one). In it, the MCP tools send_message, list_agents, read_inbox and ack_messages are available.')
} else {
  if (after.out.includes(PLUGIN_ID)) finish(1, `uninstall finished but ${PLUGIN_ID} is still listed`)
  say(`\nVerified: ${PLUGIN_ID} is no longer installed.`)
  report.notes.push('A running AgentLink daemon is not stopped by this: run "agentctl stop" (see docs/PLUGIN.md) if one is running.')
  say('Note: a running AgentLink daemon keeps running until you stop it ("agentctl stop").')
}
finish(0)
