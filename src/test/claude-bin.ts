// Finds the Claude Code executable for the end-to-end scripts: CLAUDE_BIN, or the npm global install found through PATH.
import fs from 'node:fs'
import path from 'node:path'

export function claudeBin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN
  // npm puts a shim (claude.cmd) on PATH; the real executable lives next to it under node_modules.
  for (const dir of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    for (const rel of ['node_modules/@anthropic-ai/claude-code/bin/claude.exe', 'claude.exe']) {
      const p = path.join(dir, rel)
      if (fs.existsSync(p)) return p
    }
  }
  throw new Error('Claude Code executable not found: put it on PATH or set CLAUDE_BIN to the path of claude.exe')
}
