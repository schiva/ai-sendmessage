import test from 'node:test'
import assert from 'node:assert/strict'
import { formatSas, joinCommit, joinSas, normalizeHostName, parseDigits, sasEquals } from '../agentd/join-sas.ts'

// Fixed test vectors for cross-checking independent implementations of docs/JOIN-API.md section 2.
export const JOIN_SAS_VECTORS = [
  {
    name: 'vector-1 (devmain -> desktop-scmain)',
    fpH: '021329c7395f740b90da4feed0f6d4ec2122ed535163ece04dfbab669f49e943',
    hostJ: 'devmain',
    hostH: 'desktop-scmain',
    nonceJHex: '000102030405060708090a0b0c0d0e0f',
    nonceHHex: 'f0e0d0c0b0a090807060504030201000',
    expectedCommit: '16c147b14ddc3d117b4debbd4a4251a058ab163b22677eaa150bfd4a8c9803e5',
    expectedSas: '652574',
    expectedFormatted: '652 574',
  },
  {
    name: 'vector-2 (asus -> desktop-scmain, leading zero in SAS)',
    fpH: 'bf0e68bd2567a7e1d4b5d6cdb657575eb004e86ea58761ebe88ce69ce332e6b2',
    hostJ: 'asus',
    hostH: 'desktop-scmain',
    nonceJHex: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    nonceHHex: '55555555555555555555555555555555',
    expectedCommit: 'e1ec53afa0daddb6d9e313016f508422c2c7675a7a7b08c67023f537cefc3a00',
    expectedSas: '024773',
    expectedFormatted: '024 773',
  },
  {
    name: 'vector-3 (pc-a -> pc-b, all-zero/all-ff nonces)',
    fpH: '0000000000000000000000000000000000000000000000000000000000000000',
    hostJ: 'pc-a',
    hostH: 'pc-b',
    nonceJHex: '00000000000000000000000000000000',
    nonceHHex: 'ffffffffffffffffffffffffffffffff',
    expectedCommit: '074388410a17871a8a8f1e7369daa4d6b2168ef9146387fd04810aa7939af616',
    expectedSas: '309651',
    expectedFormatted: '309 651',
  },
] as const

test('joinCommit and joinSas match fixed test vectors', () => {
  for (const v of JOIN_SAS_VECTORS) {
    const nonceJ = Buffer.from(v.nonceJHex, 'hex')
    const nonceH = Buffer.from(v.nonceHHex, 'hex')
    assert.equal(joinCommit(v.hostJ, nonceJ), v.expectedCommit, `${v.name}: commit`)
    const sas = joinSas(v.fpH, v.hostJ, v.hostH, nonceJ, nonceH)
    assert.equal(sas, v.expectedSas, `${v.name}: sas`)
    assert.equal(sas.length, 6)
    assert.equal(formatSas(sas), v.expectedFormatted, `${v.name}: formatted`)
  }
})

test('length-prefixed encoding prevents boundary ambiguity across fields', () => {
  const fp = '11'.repeat(32)
  const nh = Buffer.alloc(16, 1)
  // Without length prefixes, ("ab" + "c") and ("a" + "bc") would hash identically.
  assert.notEqual(
    joinCommit('ab', Buffer.from('c', 'utf8')),
    joinCommit('a', Buffer.from('bc', 'utf8')),
  )
  assert.notEqual(
    joinSas(fp, 'host-ab', 'host', Buffer.alloc(16, 2), nh),
    joinSas(fp, 'host-', 'abhost', Buffer.alloc(16, 2), nh),
  )
})

test('joinSas changes when any single input changes', () => {
  const v = JOIN_SAS_VECTORS[0]
  const nj = Buffer.from(v.nonceJHex, 'hex')
  const nh = Buffer.from(v.nonceHHex, 'hex')
  const base = joinSas(v.fpH, v.hostJ, v.hostH, nj, nh)

  const flipFirstByte = (b: Buffer): Buffer => {
    const copy = Buffer.from(b)
    copy[0] ^= 0x01
    return copy
  }
  const fpFlipped = '03' + v.fpH.slice(2)

  assert.notEqual(joinSas(fpFlipped, v.hostJ, v.hostH, nj, nh), base, 'fpH changed')
  assert.notEqual(joinSas(v.fpH, 'devmain2', v.hostH, nj, nh), base, 'hostJ changed')
  assert.notEqual(joinSas(v.fpH, v.hostJ, 'desktop-scmain2', nj, nh), base, 'hostH changed')
  assert.notEqual(joinSas(v.fpH, v.hostH, v.hostJ, nj, nh), base, 'hostJ/hostH swapped')
  assert.notEqual(joinSas(v.fpH, v.hostJ, v.hostH, flipFirstByte(nj), nh), base, 'nonceJ changed')
  assert.notEqual(joinSas(v.fpH, v.hostJ, v.hostH, nj, flipFirstByte(nh)), base, 'nonceH changed')
  assert.notEqual(joinSas(v.fpH, v.hostJ, v.hostH, nh, nj), base, 'nonceJ/nonceH swapped')
})

test('joinSas accepts all standard SHA-256 fingerprint formats and rejects invalid ones with TypeError', () => {
  const v = JOIN_SAS_VECTORS[0]
  const nj = Buffer.from(v.nonceJHex, 'hex')
  const nh = Buffer.from(v.nonceHHex, 'hex')
  const upperColons = (v.fpH.match(/.{2}/g) ?? []).join(':').toUpperCase()
  const lowerColons = upperColons.toLowerCase()

  assert.equal(joinSas(`sha256:${upperColons}`, v.hostJ, v.hostH, nj, nh), v.expectedSas)
  assert.equal(joinSas(`SHA-256:${lowerColons}`, v.hostJ, v.hostH, nj, nh), v.expectedSas)
  assert.equal(joinSas(`sha256=${upperColons}`, v.hostJ, v.hostH, nj, nh), v.expectedSas)
  assert.equal(joinSas(upperColons, v.hostJ, v.hostH, nj, nh), v.expectedSas)
  assert.equal(joinSas(v.fpH.toUpperCase(), v.hostJ, v.hostH, nj, nh), v.expectedSas)

  for (const bad of [
    '',
    '021329',
    v.fpH.slice(0, 63),
    v.fpH + '0',
    v.fpH + '00',
    'zz' + v.fpH.slice(2),
    `sha256:${v.fpH}:extra`,
    `${v.fpH}-junk`,
  ]) {
    assert.throws(() => joinSas(bad, v.hostJ, v.hostH, nj, nh), TypeError, `expected TypeError for "${bad}"`)
  }
})

test('formatSas formats 6-digit strings and rejects invalid inputs with TypeError', () => {
  assert.equal(formatSas('482913'), '482 913')
  assert.equal(formatSas('000000'), '000 000')
  assert.equal(formatSas('024773'), '024 773')

  for (const bad of ['', '48291', '4829130', '482 913', '482-913', '482a13', '４８２９１３']) {
    assert.throws(() => formatSas(bad), TypeError, `expected TypeError for "${bad}"`)
  }
})

test('parseDigits strips spaces, hyphens and dots and rejects non-ASCII or wrong-length digits', () => {
  assert.equal(parseDigits('482913'), '482913')
  assert.equal(parseDigits('482 913'), '482913')
  assert.equal(parseDigits('  482   913\t\n'), '482913')
  assert.equal(parseDigits('482-913'), '482913')
  assert.equal(parseDigits('48.29.13'), '482913')
  assert.equal(parseDigits('4-8.2 9-1.3'), '482913')
  assert.equal(parseDigits('000 000'), '000000')

  // Wrong length
  assert.equal(parseDigits(''), null)
  assert.equal(parseDigits('   ---...  '), null)
  assert.equal(parseDigits('48291'), null)
  assert.equal(parseDigits('482 91'), null)
  assert.equal(parseDigits('4829130'), null)
  assert.equal(parseDigits('482 913 0'), null)

  // Non-ASCII digits (full-width, Korean) and other characters
  assert.equal(parseDigits('４８２９１３'), null)
  assert.equal(parseDigits('48291３'), null)
  assert.equal(parseDigits('사팔이구일삼'), null)
  assert.equal(parseDigits('482a13'), null)
  assert.equal(parseDigits('482_913'), null)
  assert.equal(parseDigits('482,913'), null)
})

test('normalizeHostName normalizes case and enforces length, character, trailing-dot and whitespace rules', () => {
  assert.equal(normalizeHostName('devmain'), 'devmain')
  assert.equal(normalizeHostName('Desktop-SCMain'), 'desktop-scmain')
  assert.equal(normalizeHostName('ASUS_01.local'), 'asus_01.local')
  assert.equal(normalizeHostName('a'), 'a')
  assert.equal(normalizeHostName('9'), '9')

  const len63 = 'a'.repeat(63)
  const len64 = 'a'.repeat(64)
  assert.equal(normalizeHostName(len63), len63)
  assert.equal(normalizeHostName(len64), null)

  // Trailing dot is forbidden even though '.' is allowed inside
  assert.equal(normalizeHostName('host.'), null)
  assert.equal(normalizeHostName('a.b.'), null)
  assert.equal(normalizeHostName('.'), null)

  // Leading non-alphanumeric is forbidden
  assert.equal(normalizeHostName('.host'), null)
  assert.equal(normalizeHostName('-host'), null)
  assert.equal(normalizeHostName('_host'), null)

  // Whitespace is never trimmed; rejected as-is
  assert.equal(normalizeHostName(' devmain'), null)
  assert.equal(normalizeHostName('devmain '), null)
  assert.equal(normalizeHostName('dev main'), null)
  assert.equal(normalizeHostName('\tdevmain\n'), null)
  assert.equal(normalizeHostName(''), null)
})

test('sasEquals performs constant-time comparison and handles mismatched lengths', () => {
  assert.equal(sasEquals('482913', '482913'), true)
  assert.equal(sasEquals('000000', '000000'), true)
  assert.equal(sasEquals('482913', '482914'), false)
  assert.equal(sasEquals('482913', '48291'), false)
  assert.equal(sasEquals('482913', '4829130'), false)
  assert.equal(sasEquals('482913', ''), false)
})
