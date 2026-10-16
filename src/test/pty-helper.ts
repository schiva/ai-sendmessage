// Drives an interactive program (the Claude Code TUI) through a Windows pseudo console.
import fs from 'node:fs'
import pty from 'node-pty'
import type { IPty } from 'node-pty'

const ANSI = /\x1b\[[0-9;?<>=]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][A-Z0-9]|\x1b[=>78]/g

export function strip(s: string): string {
  return s.replace(ANSI, '').replace(/\r/g, '')
}

/** Whitespace-insensitive form, because a TUI redraws text with cursor moves instead of spaces. */
export function compact(s: string): string {
  return strip(s).replace(/\s+/g, '')
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export class Terminal {
  readonly name: string
  private proc: IPty
  private buf = ''
  exited = false

  constructor(name: string, file: string, args: string[], opts: { cwd: string; env: Record<string, string>; cols?: number; rows?: number }) {
    this.name = name
    this.proc = pty.spawn(file, args, { name: 'xterm-256color', cols: opts.cols ?? 140, rows: opts.rows ?? 50, cwd: opts.cwd, env: opts.env })
    this.proc.onData(d => (this.buf += d))
    this.proc.onExit(() => (this.exited = true))
  }

  /** Everything printed so far, with escape sequences removed. */
  text(): string {
    return strip(this.buf)
  }

  /** Matching ignores all whitespace on both sides, so write RegExp patterns without spaces. */
  has(needle: string | RegExp): boolean {
    const hay = compact(this.buf)
    return typeof needle === 'string' ? hay.includes(needle.replace(/\s+/g, '')) : needle.test(hay)
  }

  /** Text printed after `mark` (an offset obtained from `mark()`), so earlier output cannot satisfy a wait. */
  mark(): number {
    return this.buf.length
  }

  hasSince(mark: number, needle: string | RegExp): boolean {
    const hay = compact(this.buf.slice(mark))
    return typeof needle === 'string' ? hay.includes(needle.replace(/\s+/g, '')) : needle.test(hay)
  }

  async waitFor(cond: () => boolean, ms: number, what: string): Promise<void> {
    const end = Date.now() + ms
    while (!cond()) {
      if (this.exited) throw new Error(`${this.name}: process exited while waiting for ${what}`)
      if (Date.now() > end) throw new Error(`${this.name}: timed out after ${ms}ms waiting for ${what}`)
      await sleep(200)
    }
  }

  async type(text: string): Promise<void> {
    this.proc.write(text)
    await sleep(400)
    this.proc.write('\r')
  }

  key(seq: string): void {
    this.proc.write(seq)
  }

  kill(): void {
    if (this.exited) return
    try {
      this.proc.kill()
    } catch {
      // already gone
    }
  }

  dump(file: string): void {
    fs.writeFileSync(file, this.text())
  }
}
