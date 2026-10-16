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
