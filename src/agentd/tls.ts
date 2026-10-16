// Self-signed TLS identity of this host. Peers pin its SHA-256 fingerprint (S-02).
import fs from 'node:fs'
import path from 'node:path'
import { X509Certificate } from 'node:crypto'
import selfsigned from 'selfsigned'

export interface TlsMaterial {
  key: string
  cert: string
  fingerprint: string
}

/** "sha256:AB:CD:..", "AB:CD:..", or plain hex in any case -> lowercase hex without separators. */
export function normalizeFingerprint(fp: string): string {
  return fp.replace(/^sha-?256[:=]?/i, '').replace(/[^0-9a-fA-F]/g, '').toLowerCase()
}

export function fingerprintOf(certPem: string): string {
  return normalizeFingerprint(new X509Certificate(certPem).fingerprint256)
}

export function displayFingerprint(fp: string): string {
  return 'sha256:' + (normalizeFingerprint(fp).match(/.{2}/g) ?? []).join(':').toUpperCase()
}

export async function ensureTls(home: string, host: string): Promise<TlsMaterial> {
  const dir = path.join(home, 'tls')
  const keyFile = path.join(dir, 'key.pem')
  const certFile = path.join(dir, 'cert.pem')
  try {
    const key = fs.readFileSync(keyFile, 'utf8')
    const cert = fs.readFileSync(certFile, 'utf8')
    return { key, cert, fingerprint: fingerprintOf(cert) }
  } catch {
    // generate below
  }
  fs.mkdirSync(dir, { recursive: true })
  const pems = await selfsigned.generate([{ name: 'commonName', value: `agentlink-${host}` }], {
    keySize: 2048,
    days: 3650,
    algorithm: 'sha256',
  })
  // Two daemons starting together may both generate; the first writer wins and the other adopts it.
  try {
    fs.writeFileSync(keyFile, pems.private, { flag: 'wx' })
    fs.writeFileSync(certFile, pems.cert, { flag: 'wx' })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
  }
  for (let i = 0; i < 20; i++) {
    try {
      const key = fs.readFileSync(keyFile, 'utf8')
      const cert = fs.readFileSync(certFile, 'utf8')
      if (key && cert) return { key, cert, fingerprint: fingerprintOf(cert) }
    } catch {
      // the other writer is not done yet
    }
    await new Promise(r => setTimeout(r, 50))
  }
  throw new Error(`cannot read the TLS identity in ${dir}`)
}
