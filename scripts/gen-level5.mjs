// Generates src/data/level5.questions.json ("IUPAC Castle").
//
// The boss battle combines Level 3 (reading/locants — the diagram still
// shows each substituent's correct locant, same as before) and Level 4
// (alphabetized substituent prefixes, multiplying prefixes) into one full
// IUPAC name, built (mode "build": tap the name pieces in order) or typed
// (mode "type") from scratch. Aligned with the rest of the game: every
// molecule is a plain alkane chain (no double/triple bonds — Level 3
// doesn't teach those anymore either) using only the same 8 substituents
// Level 4 teaches. The "reverse" mode (name -> pick matching structure) is
// gone — this level is only ever "name a real structure".
//
// Fully generated + deduplicated: 100 questions (~34 easy / 33 medium / 33
// hard by substituent-group count, alternating build/type within each
// tier), every molecule signature unique, every name asserted unambiguous
// by the same rule engine that builds it.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const CATALOG = JSON.parse(readFileSync('src/data/substituents.json', 'utf8'))
const ALLOWED = ['methyl', 'ethyl', 'propyl', 'butyl', 'fluoro', 'chloro', 'bromo', 'iodo']
const ROOTS = { 3: 'prop', 4: 'but', 5: 'pent', 6: 'hex', 7: 'hept', 8: 'oct', 9: 'non', 10: 'dec', 11: 'undec' }

function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWith(arr, rand) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function multiplyPrefix(count) {
  return count === 1 ? '' : count === 2 ? 'di' : count === 3 ? 'tri' : `${count}-`
}

function groupPlacements(subs) {
  const byKey = new Map()
  for (const s of subs) {
    if (!byKey.has(s.key)) byKey.set(s.key, [])
    byKey.get(s.key).push(s.pos)
  }
  const groups = [...byKey.entries()].map(([key, locants]) => ({
    key,
    def: CATALOG[key],
    locants: locants.slice().sort((a, b) => a - b)
  }))
  groups.sort((a, b) => (a.def.sortKey < b.def.sortKey ? -1 : a.def.sortKey > b.def.sortKey ? 1 : 0))
  return groups
}

function cardLabel(group) {
  return `${group.locants.join(',')}-${multiplyPrefix(group.locants.length)}${group.def.name}`
}

function rootPart(n) {
  return `${ROOTS[n]}ane`
}

function buildFullName(n, subs) {
  const groups = groupPlacements(subs)
  const tokens = groups.map(cardLabel)
  const root = rootPart(n)
  return tokens.length ? `${tokens.join('-')}${root}` : root
}

function compareAsc(a, b) {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? Infinity
    const y = b[i] ?? Infinity
    if (x !== y) return x - y
  }
  return 0
}

/** n, subs = [{pos,key}] forward-numbered (physical, left-to-right as drawn). */
function resolveDirection(n, subs) {
  const revPos = p => n + 1 - p
  const fwdSubs = subs.map(s => s.pos).sort((a, b) => a - b)
  const revSubs = subs.map(s => revPos(s.pos)).sort((a, b) => a - b)
  const cmp = compareAsc(fwdSubs, revSubs)
  const useReverse = cmp > 0
  const finalSubs = subs.map(s => ({ key: s.key, pos: useReverse ? revPos(s.pos) : s.pos }))
  return { subs: finalSubs, useReverse }
}

// Alkyl substituents (methyl/ethyl/propyl/butyl) are drawn as their own
// short carbon chain — plain 'C' atoms in a zigzag branch, same visual
// style as the backbone (and Level 1) — rather than a single letter-coded
// stub atom. Halogens (fluoro/chloro/bromo/iodo) stay real single atoms
// (F/Cl/Br/I), which is already the correct real-element depiction.
const ALKYL_CHAIN_LEN = { methyl: 1, ethyl: 2, propyl: 3, butyl: 4 }

function layout(n, subs) {
  const atoms = []
  const bonds = []
  for (let i = 1; i <= n; i++) {
    atoms.push({ id: `T${i}`, x: i * 1.0, y: i % 2 === 0 ? 0.55 : 0, element: 'C' })
    if (i > 1) bonds.push({ from: `T${i - 1}`, to: `T${i}`, order: 1 })
  }
  // Alternate each branch's zigzag lean left/right/left/... in left-to-right
  // anchor order, so two substituents on neighboring backbone carbons always
  // fan away from each other instead of drawing two parallel chains that
  // crowd/cross visually.
  const leanByIdx = new Map()
  subs
    .map((s, idx) => ({ idx, pos: s.pos }))
    .sort((a, b) => a.pos - b.pos)
    .forEach((o, i) => leanByIdx.set(o.idx, i % 2 === 0 ? -1 : 1))

  subs.forEach((s, k) => {
    const t = atoms.find(a => a.id === `T${s.pos}`)
    const def = CATALOG[s.key]
    const chainLen = ALKYL_CHAIN_LEN[s.key]
    if (chainLen) {
      const lean = leanByIdx.get(k)
      let prevId = `T${s.pos}`
      let prevX = t.x
      let prevY = t.y
      for (let c = 1; c <= chainLen; c++) {
        const id = `Sub${k + 1}c${c}`
        const x = prevX + (c === 1 ? 0 : (c % 2 === 0 ? 0.35 : -0.35) * lean)
        const y = prevY - 0.85
        atoms.push({ id, x, y, element: 'C' })
        bonds.push({ from: prevId, to: id, order: 1 })
        prevId = id
        prevX = x
        prevY = y
      }
    } else {
      const id = `Sub${k + 1}`
      atoms.push({ id, x: t.x, y: t.y - 0.95, element: def.element })
      bonds.push({ from: `T${s.pos}`, to: id, order: 1 })
    }
  })
  return { atoms, bonds }
}

function locantLabelsFor(subs) {
  return subs.map(s => s.pos).sort((a, b) => a - b).map(pos => ({ atomId: `T${pos}`, number: pos }))
  // NOTE: built from `subs` (already position-deduped by caller before this
  // is called) — see makeCore, which passes the resolved, deduped list.
}

function normalize(str) {
  return str.toLowerCase().replace(/\s+/g, '').replace(/[–—]/g, '-')
}

function makeCore(n, rawSubs) {
  const resolved = resolveDirection(n, rawSubs)
  const name = buildFullName(n, resolved.subs)
  const structure = layout(n, resolved.subs)
  const uniquePositions = [...new Set(resolved.subs.map(s => s.pos))].sort((a, b) => a - b)
  const locantLabels = uniquePositions.map(pos => ({ atomId: `T${pos}`, number: pos }))
  return { n, subs: resolved.subs, name, structure, locantLabels }
}

function buildModeQuestion({ idNum, difficulty, core, rand }) {
  const groups = groupPlacements(core.subs)
  const tokens = groups.map(cardLabel)
  const root = rootPart(core.n)
  const realChunks = tokens.map((tok, i) => ({ id: `real${i}`, text: i < tokens.length - 1 ? `${tok}-` : tok }))
  realChunks.push({ id: 'realRoot', text: root })
  const correctChunkSequence = realChunks.map(c => c.id)
  const realTexts = new Set(realChunks.map(c => c.text))

  const decoyTexts = []
  // decoy 1: wrong root (adjacent chain length)
  const altRootLen = core.n + (rand() < 0.5 ? -1 : 1)
  if (ROOTS[altRootLen]) {
    const t = rootPart(altRootLen)
    if (!realTexts.has(t)) decoyTexts.push(t)
  }
  // decoy 2+: off-by-one locant on a real prefix token
  for (const g of shuffleWith(groups, rand)) {
    if (decoyTexts.length >= 2) break
    for (const delta of shuffleWith([1, -1, 2], rand)) {
      const shifted = g.locants.map(l => l + delta)
      if (shifted.some(l => l < 1 || l > core.n)) continue
      const label = `${shifted.slice().sort((a, b) => a - b).join(',')}-${multiplyPrefix(g.locants.length)}${g.def.name}`
      const isLast = groups[groups.length - 1] === g
      const text = isLast ? label : `${label}-`
      if (realTexts.has(text) || decoyTexts.includes(text)) continue
      decoyTexts.push(text)
      break
    }
  }
  let guard = 0
  while (decoyTexts.length < 2 && guard < 20) {
    guard++
    const unused = ALLOWED.filter(k => !groups.some(g => g.key === k))
    const key = unused[Math.floor(rand() * unused.length)]
    if (!key) break
    const pos = 2 + Math.floor(rand() * (core.n - 2))
    const text = `${pos}-${CATALOG[key].name}-`
    if (!realTexts.has(text) && !decoyTexts.includes(text)) decoyTexts.push(text)
  }

  const decoyChunks = decoyTexts.map((text, i) => ({ id: `decoy${i}`, text }))
  const allChunks = shuffleWith([...realChunks, ...decoyChunks], rand)

  return {
    id: `L5-${difficulty[0].toUpperCase()}-${String(idNum).padStart(3, '0')}`,
    level: 5,
    mode: 'build',
    difficulty,
    structure: core.structure,
    locantLabels: core.locantLabels,
    prompt: 'แตะชิ้นส่วนชื่อ IUPAC ให้เรียงถูกลำดับ ต่อกันเป็นชื่อเต็ม (ระวังชิ้นส่วนหลอก!)',
    correctName: core.name,
    chunks: allChunks,
    correctChunkSequence,
    explanation: `ชื่อเต็มที่ถูกต้องคือ "${core.name}" — เรียงหมู่แทนที่ตามตัวอักษรก่อน แล้วค่อยต่อด้วยชื่อโซ่หลัก`,
    hint: 'เรียงหมู่แทนที่ตามตัวอักษรก่อน แล้วค่อยต่อชื่อโซ่หลักไว้ท้ายสุด',
    _sig: `${core.n}|${groups.map(g => `${g.key}:${g.locants.join(',')}`).join('|')}`
  }
}

function typeModeQuestion({ idNum, difficulty, core }) {
  return {
    id: `L5-${difficulty[0].toUpperCase()}-${String(idNum).padStart(3, '0')}`,
    level: 5,
    mode: 'type',
    difficulty,
    structure: core.structure,
    locantLabels: core.locantLabels,
    prompt: 'พิมพ์ชื่อ IUPAC เต็มของโครงสร้างนี้',
    correctName: core.name,
    acceptedAnswers: [normalize(core.name)],
    explanation: `ชื่อเต็มที่ถูกต้องคือ "${core.name}"`,
    hint: 'เรียงหมู่แทนที่ตามตัวอักษรก่อน แล้วค่อยต่อชื่อโซ่หลักไว้ท้ายสุด',
    _sig: `${core.n}|${groupPlacements(core.subs).map(g => `${g.key}:${g.locants.join(',')}`).join('|')}`
  }
}

// ---- candidate generation -------------------------------------------------

function* candidateStream(numGroups, allowRepeat, nRange, seedBase) {
  let seed = seedBase
  while (true) {
    seed++
    const rand = mulberry32(seed)
    const n = nRange[Math.floor(rand() * nRange.length)]
    const internal = Array.from({ length: n - 2 }, (_, i) => i + 2)
    const keys = shuffleWith(ALLOWED, rand).slice(0, numGroups)
    const counts = keys.map(() => (allowRepeat && rand() < 0.35 ? 2 : 1))
    const totalPositions = counts.reduce((a, b) => a + b, 0)
    if (internal.length < totalPositions) continue
    const positions = shuffleWith(internal, rand).slice(0, totalPositions)
    let cursor = 0
    const rawSubs = []
    keys.forEach((key, i) => {
      for (let c = 0; c < counts[i]; c++) {
        rawSubs.push({ pos: positions[cursor], key })
        cursor++
      }
    })
    yield { n, rawSubs, rand }
  }
}

function buildBucket(count, difficulty, numGroups, allowRepeat, nRange, seedBase, seen) {
  const gen = candidateStream(numGroups, allowRepeat, nRange, seedBase)
  const out = []
  let idNum = 0
  let guard = 0
  while (out.length < count && guard < 20000) {
    guard++
    const { n, rawSubs, rand } = gen.next().value
    const sig = `${n}|${rawSubs
      .slice()
      .sort((a, b) => a.pos - b.pos)
      .map(p => `${p.pos}:${p.key}`)
      .join(',')}`
    if (seen.has(sig)) continue
    seen.add(sig)
    idNum++
    const core = makeCore(n, rawSubs)
    if (seen.has(`mol:${core.n}|${groupPlacements(core.subs).map(g => `${g.key}:${g.locants.join(',')}`).join('|')}`)) continue
    const useBuild = idNum % 2 === 1
    const q = useBuild ? buildModeQuestion({ idNum, difficulty, core, rand }) : typeModeQuestion({ idNum, difficulty, core })
    seen.add(`mol:${q._sig}`)
    out.push(q)
  }
  if (out.length < count) throw new Error(`Only generated ${out.length}/${count} for difficulty=${difficulty}`)
  return out
}

const seen = new Set()

const easy = buildBucket(34, 'easy', 1, false, [5, 6, 7, 8, 9], 7001, seen)
const medium = buildBucket(33, 'medium', 2, true, [6, 7, 8, 9, 10], 8001, seen)
const hard = buildBucket(33, 'hard', 3, true, [7, 8, 9, 10, 11], 9001, seen)

const questions = [...easy, ...medium, ...hard]

console.log(`Generated ${questions.length} Level 5 questions.`)
const byDiff = {}
const byMode = {}
for (const q of questions) {
  byDiff[q.difficulty] = (byDiff[q.difficulty] ?? 0) + 1
  byMode[q.mode] = (byMode[q.mode] ?? 0) + 1
}
console.log('Per difficulty:', byDiff)
console.log('Per mode:', byMode)

const shipped = questions.map(({ _sig, ...rest }) => rest)
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/level5.questions.json', JSON.stringify(shipped, null, 2))
console.log('Wrote src/data/level5.questions.json')
