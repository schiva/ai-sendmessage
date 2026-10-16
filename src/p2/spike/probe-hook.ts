// Usage (as a Claude Code hook command): node probe-hook.ts <logfile> <label>
import { record } from './probe-common.ts'

const [logFile, label] = process.argv.slice(2)

async function readStdin(timeoutMs: number): Promise<string> {
  return new Promise(resolve => {
    let buf = ''
    const t = setTimeout(() => resolve(buf), timeoutMs)
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', d => (buf += d))
    process.stdin.on('end', () => {
      clearTimeout(t)
      resolve(buf)
    })
    process.stdin.on('error', () => resolve(buf))
  })
}

const raw = await readStdin(2000)
let stdin: unknown = null
try {
  stdin = JSON.parse(raw)
} catch {
  stdin = { unparsed: raw.slice(0, 300) }
}
record(logFile, `hook:${label}`, { stdin })
