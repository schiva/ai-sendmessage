// Small state files (hook and watcher markers) are read by other processes while they are being written. A plain writeFileSync
// truncates first, so a reader can see an empty or half-written file and take it for "no state" (for example "no watcher is
// running"). Two measures together:
//  - writeFileAtomic writes a temporary file and renames it over the target, so readers see the old content or the new one. On
//    Windows the rename fails with EPERM while another process has the target open, and measurements showed it can keep failing
//    for a while, so after a few tries it writes in place instead: a state file must never be lost.
//  - readFileStable reads again, briefly, when the content is empty or not valid JSON, which covers the in-place case.
import fs from 'node:fs'
import { randomBytes } from 'node:crypto'

const sleepSync = (ms: number): void => void Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

export function writeFileAtomic(file: string, data: string): void {
  const tmp = `${file}.${process.pid}.${randomBytes(3).toString('hex')}.tmp`
  try {
    fs.writeFileSync(tmp, data)
    for (let attempt = 0; ; attempt++) {
      try {
        fs.renameSync(tmp, file)
        return
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code
        if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') throw e
        if (attempt >= 8) break
        sleepSync(3)
      }
    }
    fs.writeFileSync(file, data) // the target stayed busy: write in place rather than lose the update
  } finally {
    try {
      fs.rmSync(tmp, { force: true })
    } catch {
      // nothing else to do
    }
  }
}

/**
 * The parsed JSON of a state file, or null when it does not exist or stays unreadable. A file that is empty or half written is
 * read again for a short while, because it is most likely being rewritten at this moment.
 */
export function readJsonStable(file: string, attempts = 6): unknown {
  for (let i = 0; i < attempts; i++) {
    let text: string
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
      sleepSync(5)
      continue
    }
    try {
      return JSON.parse(text)
    } catch {
      sleepSync(5)
    }
  }
  return null
}
