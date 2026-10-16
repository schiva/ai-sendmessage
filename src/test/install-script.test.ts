// scripts/install.mjs: the installer an AI agent (or a person) runs. It talks to the real `claude plugin` commands, but in a
// scratch CLAUDE_CONFIG_DIR with the local clone as the marketplace, so nothing of the user's configuration is touched and no
// network is needed. Skipped when Claude Code is not installed.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { claudeBin } from './claude-bin.ts'

const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const SCRIPT = path.join(REPO, 'scripts', 'install.mjs')
const ID = 'agentlink@agentlink-marketplace'

let claude: string | null = null
try {
  claude = claudeBin()
} catch {
  claude = null
}
const skip = process.platform !== 'win32' ? 'the installer targets Windows' : claude ? false : 'Claude Code is not installed'

const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-install-test-'))
const env: Record<string, string> = { ...(process.env as Record<string, string>), CLAUDE_CONFIG_DIR: cfg }
for (const k of ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID']) delete env[k]

function install(...args: string[]): { status: number | null; out: string; json: any } {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { env, encoding: 'utf8', timeout: 180_000 })
  const out = `${r.stdout}${r.stderr}`
  let json: any = null
  if (args.includes('--json')) {
    try {
      json = JSON.parse(r.stdout)
    } catch {
      json = null
    }
  }
  return { status: r.status, out, json }
}

function pluginList(): string {
  const r = spawnSync(claude as string, ['plugin', 'list'], { env, encoding: 'utf8', timeout: 60_000 })
  return `${r.stdout}${r.stderr}`
}

after(() => {
  fs.rmSync(cfg, { recursive: true, force: true })
})
before(() => {
  assert.ok(fs.existsSync(SCRIPT))
})

test('without --yes it only shows the plan, changes nothing and exits 3', { skip }, () => {
  const r = install()
  assert.equal(r.status, 3, r.out)
  assert.match(r.out, /register the marketplace "agentlink-marketplace"/)
  assert.match(r.out, new RegExp(`install ${ID} \\(scope user\\)`))
  assert.match(r.out, /NOT CHANGED/)
  assert.match(r.out, /ask the user first/)
  assert.ok(!pluginList().includes(ID), 'nothing was installed')
})

test('--dry-run changes nothing and exits 0', { skip }, () => {
  const r = install('--dry-run')
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /Dry run: nothing was changed/)
  assert.ok(!pluginList().includes(ID))
})

test('--yes adds the marketplace, installs the plugin and verifies it', { skip }, () => {
  const r = install('--yes', '--json')
  assert.equal(r.status, 0, r.out)
  assert.equal(r.json.ok, true)
  assert.equal(r.json.changed, true)
  assert.deepEqual(r.json.steps.map((s: { status: string }) => s.status), ['done', 'done'])
  assert.ok(r.json.notes.some((n: string) => /new Claude Code session/.test(n)))
  const list = pluginList()
  assert.ok(list.includes(ID))
  assert.match(list, /Status:\s*\S*\s*enabled/)
})

test('running it again is safe: nothing to do, nothing changed', { skip }, () => {
  const r = install('--yes', '--json')
  assert.equal(r.status, 0, r.out)
  assert.equal(r.json.changed, false)
  assert.deepEqual(r.json.steps, [])
  assert.ok(r.json.notes.some((n: string) => /already installed/.test(n)))
  assert.ok(r.json.notes.some((n: string) => /already registered/.test(n)))
})

test('--uninstall --yes removes the plugin and optionally the marketplace', { skip }, () => {
  const r = install('--uninstall', '--yes', '--remove-marketplace', '--json')
  assert.equal(r.status, 0, r.out)
  assert.equal(r.json.changed, true)
  assert.ok(!pluginList().includes(ID))
  const again = install('--uninstall', '--yes', '--json')
  assert.equal(again.status, 0)
  assert.equal(again.json.changed, false)
})

test('usage errors and missing prerequisites exit 2 with a clear message', { skip }, () => {
  const badScope = install('--scope', 'nope')
  assert.equal(badScope.status, 2)
  assert.match(badScope.out, /--scope must be user, project or local/)

  const r = spawnSync(process.execPath, [SCRIPT, '--dry-run'], { env: { ...env, CLAUDE_BIN: path.join(cfg, 'no-such-claude.exe') }, encoding: 'utf8' })
  assert.equal(r.status, 2)
  assert.match(`${r.stdout}${r.stderr}`, /Claude Code was not found/)
})

test('--help prints only the header block', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /Exit codes: 0 done/)
  assert.ok(!/-- usage --/.test(r.stdout), 'section comments of the file are not part of the help')
})

// --- with a stand-in for Claude Code and for agentctl ------------------------------------------------------------------
// Real `claude plugin` runs above. The cases below need output a real Claude Code does not give on demand (a failing or
// unreadable list, a Claude Code without --json, two scopes) and an update that really changes the version, so CLAUDE_BIN is a
// script that keeps its state in a file and logs every command that would change something. agentctl is a stand-in too.
const fakeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlink-install-fake-'))
after(() => fs.rmSync(fakeDir, { recursive: true, force: true }))
const fakeClaude = path.join(fakeDir, 'fake-claude.mjs')
const fakeCtl = path.join(fakeDir, 'fake-agentctl.mjs')
const MUTATING = /^plugin (marketplace (add|remove|update)|install|uninstall|enable|update)\b/

fs.writeFileSync(
  fakeClaude,
  `import fs from 'node:fs'
const file = process.env.FAKE_STATE
const st = JSON.parse(fs.readFileSync(file, 'utf8'))
const save = () => fs.writeFileSync(file, JSON.stringify(st))
const args = process.argv.slice(2)
const json = args.includes('--json')
const rest = args.filter(a => a !== '--json')
const key = rest.join(' ')
const out = s => process.stdout.write(s + '\\n')
const scopeOf = () => rest[rest.indexOf('--scope') + 1]
if (args[0] === '--version') { out('9.9.9 (Fake Claude)'); process.exit(0) }
if (key === 'plugin --help') { out('Commands:\\n  marketplace  manage marketplaces'); process.exit(0) }
if (json && st.noJson && key.endsWith('list')) { console.error("error: unknown option '--json'"); process.exit(1) }
if (key === 'plugin list' || key === 'plugin marketplace list') {
  const isPlugins = key === 'plugin list'
  const items = isPlugins ? st.plugins : st.marketplaces
  if (st.listMode === 'fail') { console.error('Error: could not read the registry'); process.exit(1) }
  if (st.listMode === 'garbage') { out(json ? '<html>Service unavailable</html>' : 'lorem ipsum dolor sit amet'); process.exit(0) }
  if (json) out(JSON.stringify(items))
  else if (items.length === 0) out(isPlugins ? 'No plugins installed' : 'No marketplaces configured')
  else out(items.map(p => isPlugins ? '  ❯ ' + p.id + '\\n    Version: ' + p.version + '\\n    Scope: ' + p.scope + '\\n    Status: ' + (p.enabled ? '✔ enabled' : '✘ disabled') : '  ❯ ' + p.name + '\\n    Source: GitHub (' + p.repo + ')').join('\\n\\n'))
  process.exit(0)
}
st.calls.push(key)
if (key.startsWith('plugin marketplace add')) st.marketplaces.push({ name: 'agentlink-marketplace', source: 'github', repo: rest[3] })
else if (key.startsWith('plugin marketplace remove')) st.marketplaces = st.marketplaces.filter(m => m.name !== rest[3])
else if (key.startsWith('plugin marketplace update')) out('Successfully updated marketplace')
else if (key.startsWith('plugin install')) st.plugins.push({ id: rest[2], version: st.latest, scope: scopeOf(), enabled: true, installPath: st.root + '/' + st.latest })
else if (key.startsWith('plugin uninstall')) st.plugins = st.plugins.filter(p => !(p.id === rest[2] && p.scope === scopeOf()))
else if (key.startsWith('plugin enable')) st.plugins.forEach(p => { if (p.id === rest[2]) p.enabled = true })
else if (key.startsWith('plugin update')) {
  const p = st.plugins.find(p => p.id === rest[2])
  if (!p || p.version === st.latest) out('already at the latest version')
  else { p.version = st.latest; p.installPath = st.root + '/' + st.latest; out('updated to ' + st.latest) }
} else { console.error('unknown command: ' + key); process.exit(1) }
save()
`,
)
fs.writeFileSync(
  fakeCtl,
  `import fs from 'node:fs'
import path from 'node:path'
const file = process.env.FAKE_STATE
const st = JSON.parse(fs.readFileSync(file, 'utf8'))
const save = () => fs.writeFileSync(file, JSON.stringify(st))
const a = process.argv.slice(2)
const mine = path.basename(path.dirname(path.dirname(process.argv[1]))) // .../<version>/dist/agentctl.mjs
st.agentctlCalls.push({ from: mine, args: a.join(' ') })
if (a[0] === 'wake' && a[1] === '--stop') { console.log('ag_1: watcher (pid 1) stopped'); save(); process.exit(st.wakeStopExit ?? 0) }
if (a[0] === 'stop') {
  if (st.daemon === null) { console.error('connect ENOENT: no daemon'); save(); process.exit(1) }
  console.log('agentd stopping')
  if (!st.stubborn) st.daemon = null // a session that was not reloaded would start the old one again
  save(); process.exit(0)
}
if (a[0] === 'ping') {
  if (st.daemon === null) st.daemon = mine
  if (st.daemon !== mine) console.error('warning: the running AgentLink daemon is version ' + st.daemon + ' but this installation is ' + mine)
  console.log('agentd ' + st.daemon + ' host=fake pid=4242 lease=30000ms')
  save(); process.exit(0)
}
save(); process.exit(0)
`,
)

interface FakePlugin {
  id: string
  version: string
  scope: string
  enabled: boolean
  installPath: string | null
}
interface FakeState {
  plugins: FakePlugin[]
  marketplaces: Array<{ name: string; source: string; repo: string }>
  latest: string
  root: string
  calls: string[]
  agentctlCalls: Array<{ from: string; args: string }>
  daemon: string | null
  noJson?: boolean
  listMode?: 'fail' | 'garbage'
  stubborn?: boolean
  wakeStopExit?: number
}

/** A scratch "Claude Code" (and agentctl) world. In `plugins`, "@root" stands for the folder holding the installed versions. */
function fakeWorld(over: Partial<FakeState> = {}) {
  const dir = fs.mkdtempSync(path.join(fakeDir, 'world-'))
  const root = path.join(dir, 'cache').replace(/\\/g, '/')
  for (const v of ['0.3.0', '0.4.0']) {
    fs.mkdirSync(path.join(root, v, 'dist'), { recursive: true })
    fs.copyFileSync(fakeCtl, path.join(root, v, 'dist', 'agentctl.mjs'))
  }
  const state: FakeState = {
    plugins: [{ id: ID, version: '0.3.0', scope: 'user', enabled: true, installPath: '@root/0.3.0' }],
    marketplaces: [{ name: 'agentlink-marketplace', source: 'github', repo: 'schiva/ai-sendmessage' }],
    latest: '0.4.0',
    root,
    calls: [],
    agentctlCalls: [],
    daemon: '0.3.0',
    ...over,
  }
  state.plugins = state.plugins.map(p => ({ ...p, installPath: p.installPath?.replace('@root', root) ?? null }))
  const file = path.join(dir, 'state.json')
  fs.writeFileSync(file, JSON.stringify(state))
  const fenv = { ...(process.env as Record<string, string>), CLAUDE_BIN: fakeClaude, FAKE_STATE: file, AGENTLINK_UPDATE_SETTLE_MS: '20' }
  for (const k of ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID']) delete fenv[k]
  const read = (): FakeState => JSON.parse(fs.readFileSync(file, 'utf8'))
  return {
    state: read,
    changes: (): string[] => read().calls.filter(c => MUTATING.test(c)),
    run(...args: string[]): { status: number | null; out: string; json: any } {
      const r = spawnSync(process.execPath, [SCRIPT, ...args], { env: fenv, encoding: 'utf8', timeout: 60_000 })
      let json: any = null
      if (args.includes('--json')) {
        try {
          json = JSON.parse(r.stdout)
        } catch {
          json = null
        }
      }
      return { status: r.status, out: `${r.stdout}${r.stderr}`, json }
    },
  }
}
const skipFake = process.platform !== 'win32' ? 'the installer targets Windows' : false

// the state is read as JSON, and output that is not understood is an error ----------------------------------------------

test('fake: the state is read from the JSON lists; installed and registered means nothing to do', { skip: skipFake }, () => {
  const w = fakeWorld()
  const r = w.run('--yes', '--json')
  assert.equal(r.status, 0, r.out)
  assert.equal(r.json.changed, false)
  assert.deepEqual(r.json.steps, [])
  assert.ok(r.json.notes.some((n: string) => /already installed \(scope user\)/.test(n)))
  assert.ok(r.json.notes.some((n: string) => /already registered \(github schiva\/ai-sendmessage\)/.test(n)), r.json.notes.join('|'))
  assert.deepEqual(w.changes(), [])
})

test('fake: empty lists mean register and install', { skip: skipFake }, () => {
  const w = fakeWorld({ plugins: [], marketplaces: [] })
  const r = w.run('--dry-run', '--json')
  assert.equal(r.status, 0, r.out)
  assert.deepEqual(
    r.json.steps.map((s: { command: string }) => s.command.split(' ').slice(0, 4).join(' ')),
    ['claude plugin marketplace add', `claude plugin install ${ID} --scope`.split(' ').slice(0, 4).join(' ')],
  )
  assert.deepEqual(w.changes(), [])
})

test('fake: a Claude Code without --json is read from its text, which must be understood', { skip: skipFake }, () => {
  const known = fakeWorld({ noJson: true })
  const a = known.run('--yes', '--json')
  assert.equal(a.status, 0, a.out)
  assert.deepEqual(a.json.steps, [], 'the text of an installed plugin and a registered marketplace is understood')
  assert.deepEqual(known.changes(), [])

  const none = fakeWorld({ noJson: true, plugins: [], marketplaces: [] })
  const b = none.run('--dry-run', '--json')
  assert.equal(b.status, 0, b.out)
  assert.equal(b.json.steps.length, 2, '"No plugins installed" is understood as an empty list')
})

test('fake: a list that cannot be read stops everything: an uninstall must not report "not installed"', { skip: skipFake }, () => {
  const w = fakeWorld({ listMode: 'fail' })
  for (const args of [['--uninstall', '--yes'], ['--yes'], ['--update', '--yes'], ['--dry-run']]) {
    const r = w.run(...args, '--json')
    assert.equal(r.status, 1, `${args.join(' ')}: ${r.out}`)
    assert.match(r.json.error, /could not read the marketplaces/)
    assert.match(r.json.error, /Nothing was changed/)
  }
  assert.deepEqual(w.changes(), [], 'nothing was run that changes something')
})

test('fake: output that is not understood is an error too, in JSON and in text form', { skip: skipFake }, () => {
  for (const noJson of [false, true]) {
    const w = fakeWorld({ listMode: 'garbage', noJson })
    const r = w.run('--uninstall', '--yes', '--json')
    assert.equal(r.status, 1, `noJson=${noJson}: ${r.out}`)
    assert.match(r.json.error, /could not read the marketplaces/)
    assert.match(r.json.error, /not a list|not in a form this script knows/)
    assert.deepEqual(w.changes(), [])
  }
})

test('fake: installed in two scopes: only the requested scope is uninstalled, and the other one staying is not a failure', { skip: skipFake }, () => {
  const w = fakeWorld({
    plugins: [
      { id: ID, version: '0.3.0', scope: 'user', enabled: true, installPath: null },
      { id: ID, version: '0.3.0', scope: 'project', enabled: true, installPath: null },
    ],
  })
  const r = w.run('--uninstall', '--scope', 'project', '--yes', '--json')
  assert.equal(r.status, 0, r.out)
  assert.deepEqual(w.changes(), [`plugin uninstall ${ID} --scope project`])
  assert.deepEqual(w.state().plugins.map(p => p.scope), ['user'])
  assert.ok(r.json.notes.some((n: string) => /more than one scope \(user, project\)/.test(n)), r.json.notes.join('|'))
})

test('fake: a disabled plugin is enabled', { skip: skipFake }, () => {
  const w = fakeWorld({ plugins: [{ id: ID, version: '0.3.0', scope: 'user', enabled: false, installPath: null }] })
  const r = w.run('--yes', '--json')
  assert.equal(r.status, 0, r.out)
  assert.deepEqual(w.changes(), [`plugin enable ${ID}`])
})

// --update and --finish-update ---------------------------------------------------------------------------------------------

test('fake: --update without --yes shows the plan and changes nothing', { skip: skipFake }, () => {
  const w = fakeWorld()
  const r = w.run('--update')
  assert.equal(r.status, 3, r.out)
  assert.match(r.out, /refresh the marketplace "agentlink-marketplace"/)
  assert.match(r.out, new RegExp(`update ${ID} \\(scope user\\)`))
  assert.match(r.out, /agentctl wake --stop/)
  assert.match(r.out, /NOT CHANGED/)
  assert.deepEqual(w.changes(), [])
  assert.deepEqual(w.state().agentctlCalls, [])
  const dry = w.run('--update', '--dry-run')
  assert.equal(dry.status, 0)
  assert.deepEqual(w.changes(), [])
})

test('fake: --update --yes refreshes, updates, ends the watchers with the NEW agentctl and says what comes next', { skip: skipFake }, () => {
  const w = fakeWorld()
  const r = w.run('--update', '--yes', '--json')
  assert.equal(r.status, 0, r.out)
  assert.deepEqual(w.changes(), ['plugin marketplace update agentlink-marketplace', `plugin update ${ID} --scope user`])
  assert.equal(r.json.version_before, '0.3.0')
  assert.equal(r.json.version_after, '0.4.0')
  assert.equal(r.json.changed, true)
  assert.deepEqual(r.json.steps.map((s: { status: string }) => s.status), ['done', 'done', 'done'])
  assert.deepEqual(w.state().agentctlCalls, [{ from: '0.4.0', args: 'wake --stop' }], 'the watchers are ended by the agentctl of the version that was just installed, and nothing else is touched')
  assert.equal(w.state().daemon, '0.3.0', 'the daemon is left for step 2: sessions still run the old version')
  assert.equal(r.json.pending.length, 2)
  assert.match(r.json.pending[0], /\/reload-plugins in every open Claude Code session/)
  assert.match(r.json.pending[1], /--finish-update --yes/)
})

test('fake: --update when the version does not change ends no watchers and asks for no reload', { skip: skipFake }, () => {
  const w = fakeWorld({ latest: '0.3.0' })
  const r = w.run('--update', '--yes', '--json')
  assert.equal(r.status, 0, r.out)
  assert.equal(r.json.version_after, '0.3.0')
  assert.equal(r.json.steps[2].status, 'skipped')
  assert.deepEqual(r.json.pending, [])
  assert.ok(r.json.notes.some((n: string) => /nothing to reload/.test(n)))
  assert.deepEqual(w.state().agentctlCalls, [])
})

test('fake: if ending the watchers fails after the update, the failure is reported with what was already done', { skip: skipFake }, () => {
  const w = fakeWorld({ wakeStopExit: 1 })
  const r = w.run('--update', '--yes', '--json')
  assert.equal(r.status, 1, r.out)
  assert.match(r.json.error, /the plugin was updated, but "agentctl wake --stop" failed/)
  assert.equal(r.json.version_after, '0.4.0')
})

test('fake: --update needs an installed plugin and a registered marketplace', { skip: skipFake }, () => {
  const none = fakeWorld({ plugins: [] })
  const a = none.run('--update', '--yes', '--json')
  assert.equal(a.status, 1)
  assert.match(a.json.error, /not installed, so there is nothing to update/)
  const noMarket = fakeWorld({ marketplaces: [] })
  const b = noMarket.run('--update', '--yes', '--json')
  assert.equal(b.status, 1)
  assert.match(b.json.error, /marketplace "agentlink-marketplace" is not registered/)
  assert.deepEqual([...none.changes(), ...noMarket.changes()], [])
})

// After step 1 the installed plugin is 0.4.0 while the daemon of 0.3.0 still runs.
const afterStepOne = { plugins: [{ id: ID, version: '0.4.0', scope: 'user', enabled: true, installPath: '@root/0.4.0' }] }

test('fake: --finish-update stops the old daemon and checks that the new one is the installed version', { skip: skipFake }, () => {
  const w = fakeWorld({ ...afterStepOne, daemon: '0.3.0' })
  const r = w.run('--finish-update', '--yes', '--json')
  assert.equal(r.status, 0, r.out)
  assert.deepEqual(w.state().agentctlCalls.map(c => `${c.from}: ${c.args}`), ['0.4.0: stop', '0.4.0: ping'])
  assert.deepEqual(r.json.daemon, { version: '0.4.0', expected: '0.4.0' })
  assert.deepEqual(r.json.steps.map((x: { status: string }) => x.status), ['done', 'done'])
})

test('fake: --finish-update works when no daemon was running at all', { skip: skipFake }, () => {
  const w = fakeWorld({ ...afterStepOne, daemon: null })
  const r = w.run('--finish-update', '--yes', '--json')
  assert.equal(r.status, 0, `"agentctl stop" with no daemon is not an error here: ${r.out}`)
  assert.deepEqual(r.json.daemon, { version: '0.4.0', expected: '0.4.0' })
})

test('fake: --finish-update fails clearly when a session that was not reloaded keeps the old daemon coming back', { skip: skipFake }, () => {
  const w = fakeWorld({ ...afterStepOne, daemon: '0.3.0', stubborn: true })
  const r = w.run('--finish-update', '--yes', '--json')
  assert.equal(r.status, 1, r.out)
  assert.match(r.json.error, /the daemon is version 0\.3\.0 but the installed plugin is 0\.4\.0/)
  assert.match(r.json.error, /not reloaded/)
  assert.deepEqual(r.json.daemon, { version: '0.3.0', expected: '0.4.0' })
  assert.match(r.json.pending[0], /reload-plugins/)
  assert.equal(w.state().agentctlCalls.filter(c => c.args === 'ping').length, 4, 'it looked four times (the old daemon may still be shutting down) before it gave up')
})

test('fake: --finish-update without --yes only shows the plan', { skip: skipFake }, () => {
  const w = fakeWorld(afterStepOne)
  const r = w.run('--finish-update')
  assert.equal(r.status, 3, r.out)
  assert.match(r.out, /stop the running AgentLink daemon/)
  assert.match(r.out, /NOT CHANGED/)
  assert.deepEqual(w.state().agentctlCalls, [])
})

test('fake: --update, --finish-update and --uninstall exclude each other', { skip: skipFake }, () => {
  const w = fakeWorld()
  const r = w.run('--update', '--uninstall')
  assert.equal(r.status, 2)
  assert.match(r.out, /use only one of --uninstall, --update and --finish-update/)
})
