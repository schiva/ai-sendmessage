// Append-only log files with a size cap. When the file has reached maxBytes it becomes <file>.1 (replacing an older .1) and a new file
// starts, so a log never takes more than about twice maxBytes on disk. Logging must never break the caller: every failure is swallowed.
import fs from 'node:fs'

export const DEFAULT_LOG_MAX_BYTES = 1024 * 1024

export function appendLog(file: string, line: string, maxBytes: number = DEFAULT_LOG_MAX_BYTES): void {
  try {
    try {
      if (fs.statSync(file).size >= maxBytes) fs.renameSync(file, `${file}.1`)
    } catch {
      // no file yet, or another process rotated it first: both are fine
    }
    fs.appendFileSync(file, line.endsWith('\n') ? line : `${line}\n`)
  } catch {
    // a log line is never worth an error
  }
}
