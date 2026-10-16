// `agentctl acl init`: a starting acl.json that allows only what the hosts already known from peers.json need ("default": "deny").
// Without an acl.json everything is allowed, which is fine for two PCs and loose for more.
import fs from 'node:fs'
import path from 'node:path'

export interface AclStarter {
  default: 'deny'
  rules: Array<{ from: string; to: string; action: 'allow' }>
}

/** Agents of this PC may talk to each other, and with every agent of each listed peer host in both directions; everything else is denied. */
export function aclStarter(selfHost: string, peerHosts: string[]): AclStarter {
  const rules: AclStarter['rules'] = [{ from: `*@${selfHost}`, to: `*@${selfHost}`, action: 'allow' }]
  for (const host of [...new Set(peerHosts)].filter(h => h !== selfHost).sort()) {
    rules.push({ from: `*@${host}`, to: `*@${selfHost}`, action: 'allow' })
    rules.push({ from: `*@${selfHost}`, to: `*@${host}`, action: 'allow' })
  }
  return { default: 'deny', rules }
}

export function aclFile(home: string): string {
  return path.join(home, 'acl.json')
}

/**
 * Writes the starter as acl.json. An existing file is never replaced unless `force` is set, and then it is kept as acl.json.bak.
 * Throws an Error with code "EEXIST" when the file exists and `force` is not set.
 */
export function writeAclStarter(home: string, starter: AclStarter, force: boolean): { file: string; backup: string | null } {
  const file = aclFile(home)
  let backup: string | null = null
  if (fs.existsSync(file)) {
    if (!force) throw Object.assign(new Error(`${file} already exists`), { code: 'EEXIST' })
    backup = `${file}.bak`
    fs.copyFileSync(file, backup)
  }
  fs.mkdirSync(home, { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(starter, null, 2) + '\n')
  fs.renameSync(tmp, file)
  return { file, backup }
}
