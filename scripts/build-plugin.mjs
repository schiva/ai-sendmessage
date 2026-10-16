// Bundles the adapters, the daemon and the CLI into plugin/agentlink/dist so the Claude Code plugin is self-contained:
// a plugin is copied into a cache on install and nothing runs `npm install` there, so no dependency may be left outside.
// The licenses of the third-party packages that end up inside the bundles are collected in dist/THIRD-PARTY-NOTICES.txt.
//   npm run build:plugin
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// AGENTLINK_BUILD_OUT lets a test build into a scratch folder and compare with the committed bundle.
const out = process.env.AGENTLINK_BUILD_OUT ?? path.join(root, 'plugin', 'agentlink', 'dist')

const entries = {
  'hook.mjs': 'src/adapters/claude/hook.ts',
  'mcp-server.mjs': 'src/adapters/mcp/server.ts',
  'agentd.mjs': 'src/agentd/main.ts',
  'agentctl.mjs': 'src/client/agentctl.ts',
}

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

const packageDirs = new Set()

for (const [file, entry] of Object.entries(entries)) {
  const result = await build({
    entryPoints: [path.join(root, entry)],
    outfile: path.join(out, file),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    // Optional native speed-ups of `ws`; it falls back to plain JavaScript when they are missing.
    external: ['bufferutil', 'utf-8-validate'],
    // Bundled CommonJS packages call require() for node built-ins.
    banner: { js: "import { createRequire as __agentlinkCreateRequire } from 'node:module'; const require = __agentlinkCreateRequire(import.meta.url);" },
    legalComments: 'none',
    metafile: true,
    logLevel: 'warning',
  })
  for (const input of Object.keys(result.metafile.inputs)) {
    const m = /^(.*?node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+)[\\/]/.exec(input)
    if (m) packageDirs.add(path.resolve(root, m[1]))
  }
  const kb = Math.round(fs.statSync(path.join(out, file)).size / 1024)
  console.log(`${file.padEnd(16)} ${String(kb).padStart(5)} KiB  <- ${entry}`)
}

// --- third-party notices ------------------------------------------------------------------------------------
const notices = []
for (const dir of [...packageDirs].sort()) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const licenseFile = fs.readdirSync(dir).find(f => /^(licen[sc]e|copying|notice)(\.|$)/i.test(f))
  const text = licenseFile ? fs.readFileSync(path.join(dir, licenseFile), 'utf8').trim() : `(no license file in the package; package.json declares: ${pkg.license ?? 'unknown'})`
  const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'see below')
  notices.push(`================================================================================\n${pkg.name}@${pkg.version}  (${license})\n${pkg.repository?.url ?? pkg.homepage ?? ''}\n================================================================================\n${text}\n`)
}
const header =
  'This plugin bundles the following third-party packages (see the dist/*.mjs files).\n' +
  'Their licenses are reproduced here as those licenses require.\n\n'
fs.writeFileSync(path.join(out, 'THIRD-PARTY-NOTICES.txt'), header + notices.join('\n'))
console.log(`THIRD-PARTY-NOTICES.txt  ${notices.length} packages`)
