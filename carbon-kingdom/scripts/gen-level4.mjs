// Generates src/data/level4.questions.json ("Name Factory").
//
// Numbering is treated as already given here (small locant badges are drawn
// permanently on the structure) — Level 3 already teaches how to read
// locants. Level 4 is purely about: recognizing each substituent, merging
// repeats into one multiplying-prefix card (di-/tri-), and ordering the
// cards alphabetically while rejecting decoy cards (wrong locant or wrong
// substituent).
//
// Substituent pool is intentionally small and fixed — only the 8 groups
// the game actually teaches: methyl, ethyl, propyl, butyl, fluoro, chloro,
// bromo, iodo. All 8 sort alphabetically by their plain name (no "tert-"/
// "iso-" quirks in this pool), so alphabetization is a clean, teachable
// rule here.
//
// Fully generated + deduplicated: 100 questions, ~34 easy (1 substituent
// type) / 33 medium (2 types) / 33 hard (3 types, or a repeated type mixed
// with others so locant order and alphabetical order genuinely diverge).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const CATALOG = JSON.parse(readFileSync('src/data/substituents.json', 'utf8'))
const ALLOWED = ['methyl', 'ethyl', 'propyl', 'butyl', 'fluoro', 'chloro', 'bromo', 'iodo']

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

function compareAsc(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

/** Picks whichever numbering direction (as generated, or the mirrored end)
 * gives the substituents as a whole the lowest locant set (first point of
 * difference — the real IUPAC "lowest locants" rule) and remaps every
 * placement's `pos` to that canonical numbering. Positions are only ever
 * generated on interior carbons (2..n-1), and n+1-pos stays inside that
 * same range, so this never pushes a substituent onto a terminal carbon. */
function resolvePositions(n, placements) {
  const rev = p => n + 1 - p
  const fwdSet = placements.map(p => p.pos).slice().sort((a, b) => a - b)
  const revSet = placements.map(p => rev(p.pos)).slice().sort((a, b) => a - b)
  const useRev = compareAsc(fwdSet, revSet) > 0
  return useRev ? placements.map(p => ({ ...p, pos: rev(p.pos) })) : placements
}

// Alkyl substituents (methyl/ethyl/propyl/butyl) are drawn as their own
// short carbon chain — plain 'C' atoms in a zigzag branch, same visual
// style as the backbone (and Level 1) — rather than a single letter-coded
// stub atom. Halogens (fluoro/chloro/bromo/iodo) stay real single atoms
// (F/Cl/Br/I), which is already the correct real-element depiction.
const ALKYL_CHAIN_LEN = { methyl: 1, ethyl: 2, propyl: 3, butyl: 4 }

function layout(n, placements) {
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
  placements
    .map((p, idx) => ({ idx, pos: p.pos }))
    .sort((a, b) => a.pos - b.pos)
    .forEach((o, i) => leanByIdx.set(o.idx, i % 2 === 0 ? -1 : 1))

  placements.forEach((p, k) => {
    const t = atoms.find(a => a.id === `T${p.pos}`)
    const def = CATALOG[p.key]
    const chainLen = ALKYL_CHAIN_LEN[p.key]
    if (chainLen) {
      const lean = leanByIdx.get(k)
      let prevId = `T${p.pos}`
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
      bonds.push({ from: `T${p.pos}`, to: id, order: 1 })
    }
  })
  return { atoms, bonds }
}

function groupPlacements(placements) {
  const byKey = new Map()
  for (const p of placements) {
    if (!byKey.has(p.key)) byKey.set(p.key, [])
    byKey.get(p.key).push(p.pos)
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

function makeQuestion({ idNum, difficulty, n, placements: rawPlacements, rand }) {
  // Canonicalize to the real IUPAC lowest-locant numbering direction before
  // anything (cards, decoys, diagram, dedup signature) is built from it.
  const placements = resolvePositions(n, rawPlacements)
  const groups = groupPlacements(placements)
  const correctCards = groups.map((g, i) => ({ id: `real${i}`, label: cardLabel(g), isCorrect: true }))
  const correctSequence = correctCards.map(c => c.id)
  const usedPositions = new Set(placements.map(p => p.pos))
  const usedLabels = new Set(correctCards.map(c => c.label))

  // Decoys: plausible-but-wrong cards — an off-by-locant version of a real
  // card, or a substituent that isn't actually in this molecule at all.
  const decoyLabels = []
  const decoyPool = shuffleWith(groups, rand)
  for (const g of decoyPool) {
    if (decoyLabels.length >= (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1 : 2)) break
    for (const delta of shuffleWith([-1, 1, -2, 2], rand)) {
      const shifted = g.locants.map(l => l + delta)
      if (shifted.some(l => l < 1 || l > n || usedPositions.has(l))) continue
      const label = `${shifted.slice().sort((a, b) => a - b).join(',')}-${multiplyPrefix(g.locants.length)}${g.def.name}`
      if (usedLabels.has(label) || decoyLabels.includes(label)) continue
      decoyLabels.push(label)
      break
    }
  }
  // top up with an unused substituent placed at a plausible-but-absent locant
  const unusedKeys = shuffleWith(
    ALLOWED.filter(k => !groups.some(g => g.key === k)),
    rand
  )
  for (const key of unusedKeys) {
    if (decoyLabels.length >= (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3)) break
    const candidatePositions = shuffleWith(
      Array.from({ length: n - 2 }, (_, i) => i + 2).filter(p => !usedPositions.has(p)),
      rand
    )
    const pos = candidatePositions[0]
    if (pos == null) continue
    const label = `${pos}-${CATALOG[key].name}`
    if (usedLabels.has(label) || decoyLabels.includes(label)) continue
    decoyLabels.push(label)
  }
  if (decoyLabels.length === 0) {
    // last resort: shift the first real card's locant by +1 even if it collides
    // with nothing meaningfully wrong — still numerically distinct and safe
    const g = groups[0]
    const shifted = g.locants.map(l => Math.min(n, l + 1))
    decoyLabels.push(`${shifted.sort((a, b) => a - b).join(',')}-${multiplyPrefix(g.locants.length)}${g.def.name}-x`)
  }

  const decoyCards = decoyLabels.map((label, i) => ({ id: `decoy${i}`, label, isCorrect: false }))
  const allCards = shuffleWith([...correctCards, ...decoyCards], rand)

  const seenLabels = new Set()
  for (const c of allCards) {
    if (seenLabels.has(c.label)) {
      throw new Error(`Duplicate card label "${c.label}" in idNum=${idNum} difficulty=${difficulty}`)
    }
    seenLabels.add(c.label)
  }

  const { atoms, bonds } = layout(n, placements)
  const locantLabels = placements.map(p => ({ atomId: `T${p.pos}`, number: p.pos }))

  const prompt = 'แตะการ์ดหมู่แทนที่ที่ถูกต้อง เรียงตามลำดับตัวอักษรให้ครบ (การ์ดหลอกอย่าแตะ!)'
  const correctAnswerString = groups.map(cardLabel).join('-')
  const explanation = `ลำดับที่ถูกต้องคือ: ${correctAnswerString} — เรียงตามตัวอักษรของชื่อหมู่แทนที่ (ถ้าหมู่ซ้ำตำแหน่งกันหลายจุดต้องรวมเป็นการ์ดเดียวด้วยคำนำหน้า di-/tri-)`
  const hint = 'เรียงการ์ดตามตัวอักษรตัวแรกของชื่อหมู่แทนที่ ไม่ใช่ตามเลขตำแหน่ง'

  return {
    id: `L4-${difficulty[0].toUpperCase()}-${String(idNum).padStart(3, '0')}`,
    level: 4,
    difficulty,
    structure: { atoms, bonds },
    locantLabels,
    prompt,
    cards: allCards,
    correctSequence,
    explanation,
    hint,
    _sig: `${n}|${groups.map(g => `${g.key}:${g.locants.join(',')}`).join('|')}`
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
    // decide, per group, how many positions it occupies (1, or 2 if repeats allowed)
    const counts = keys.map(() => (allowRepeat && rand() < 0.4 ? 2 : 1))
    const totalPositions = counts.reduce((a, b) => a + b, 0)
    if (internal.length < totalPositions) continue
    const positions = shuffleWith(internal, rand).slice(0, totalPositions)
    let cursor = 0
    const placements = []
    keys.forEach((key, i) => {
      for (let c = 0; c < counts[i]; c++) {
        placements.push({ pos: positions[cursor], key })
        cursor++
      }
    })
    yield { n, placements }
  }
}

function buildBucket(count, difficulty, numGroups, allowRepeat, nRange, seedBase, seen) {
  const gen = candidateStream(numGroups, allowRepeat, nRange, seedBase)
  const out = []
  let idNum = 0
  let guard = 0
  while (out.length < count && guard < 20000) {
    guard++
    const { n, placements } = gen.next().value
    const sig = `${n}|${placements
      .slice()
      .sort((a, b) => a.pos - b.pos)
      .map(p => `${p.pos}:${p.key}`)
      .join(',')}`
    if (seen.has(sig)) continue
    seen.add(sig)
    idNum++
    const rand = mulberry32(seedBase * 1000 + idNum)
    const q = makeQuestion({ idNum, difficulty, n, placements, rand })
    if (seen.has(`mol:${q._sig}`)) continue
    seen.add(`mol:${q._sig}`)
    out.push(q)
  }
  if (out.length < count) throw new Error(`Only generated ${out.length}/${count} for difficulty=${difficulty}`)
  return out
}

const seen = new Set()

const easy = buildBucket(34, 'easy', 1, false, [5, 6, 7, 8, 9], 4001, seen)
const medium = buildBucket(33, 'medium', 2, true, [6, 7, 8, 9, 10], 5001, seen)
const hard = buildBucket(33, 'hard', 3, true, [7, 8, 9, 10, 11], 6001, seen)

const questions = [...easy, ...medium, ...hard]

console.log(`Generated ${questions.length} Level 4 questions.`)
const byDiff = {}
for (const q of questions) byDiff[q.difficulty] = (byDiff[q.difficulty] ?? 0) + 1
console.log('Per difficulty:', byDiff)

const shipped = questions.map(({ _sig, ...rest }) => rest)
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/level4.questions.json', JSON.stringify(shipped, null, 2))
console.log('Wrote src/data/level4.questions.json')
