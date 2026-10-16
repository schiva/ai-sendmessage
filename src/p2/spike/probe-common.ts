// P2 spike: records what a Claude Code hook / MCP server process can learn about its session.
// Output is JSON Lines; secrets are redacted before anything is written.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const SECRET_RE = /TOKEN|KEY|SECRET|PASSWORD|AUTH/i
const INTERESTING_RE = /CLAUDE|MCP|SESSION|ANTHROPIC|AGENTLINK/i

export function interestingEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (!INTERESTING_RE.test(k) || v === undefined) continue
    out[k] = SECRET_RE.test(k) ? `<redacted len=${v.length}>` : v
  }
  return out
}

export interface ProcInfo {
  pid: number
  ppid: number
  name: string
  cmd: string
}

export function ancestorChain(): ProcInfo[] {
  try {
    const raw = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress',
      ],
      { encoding: 'utf8', timeout: 15000, maxBuffer: 32 * 1024 * 1024 },
    )
    const all = (JSON.parse(raw) as Array<{ ProcessId: number; ParentProcessId: number; Name: string; CommandLine: string | null }>).map(p => ({
      pid: p.ProcessId,
      ppid: p.ParentProcessId,
      name: p.Name,
      cmd: (p.CommandLine ?? '').replace(/(token|key)=\S+/gi, '$1=<redacted>').slice(0, 220),
    }))
    const byPid = new Map(all.map(p => [p.pid, p]))
    const chain: ProcInfo[] = []
    let cur = byPid.get(process.pid)
    for (let i = 0; cur && i < 12; i++) {
      chain.push(cur)
      cur = byPid.get(cur.ppid)
    }
    return chain
  } catch (e) {
    return [{ pid: process.pid, ppid: process.ppid, name: 'chain-unavailable', cmd: String(e) }]
  }
}

export function record(logFile: string, role: string, extra: Record<string, unknown>): void {
  const line = {
    ts: new Date().toISOString(),
    role,
    pid: process.pid,
    ppid: process.ppid,
    cwd: process.cwd(),
    env: interestingEnv(),
    chain: ancestorChain(),
    ...extra,
  }
  fs.appendFileSync(logFile, JSON.stringify(line) + '\n')
}
