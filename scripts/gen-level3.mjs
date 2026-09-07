// Generates src/data/level3.questions.json ("Numbering City").
//
// Level 3 is now purely about READING a locant numbering that's already
// been assigned correctly — no bond-picking, no branching, no double/triple
// bonds. Every molecule is a plain straight alkane chain T1..Tn with 1-3
// distinct substituents (drawn only from the 8-substituent set Level 4/5
// also use), and every backbone carbon is labeled with its correct IUPAC
// locant (computed by the real "lowest locant set to the substituents"
// rule, same as Level 2). The question just asks the player to read that
// diagram back correctly, in one of three multiple-choice shapes:
//   - "locant"    : given a substituent name, which number is it at?
//   - "substituent": given a number, which substituent is there?
//   - "locantset" : (2-3 substituents only) what's the full sorted locant set?
//
// Fully generated + deduplicated: 100 questions, ~34 easy (1 substituent) /
// 33 medium (2) / 33 hard (3), every molecule signature unique.

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

function compareAsc(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

/** Picks the numbering direction giving the substituents the lowest locant set (first point of difference). */
function resolveDirection(n, positions) {
  const rev = p => n + 1 - p
  const fwd = positions.slice().sort((a, b) => a - b)
  const revd = positions.map(rev).sort((a, b) => a - b)
  const cmp = compareAsc(fwd, revd)
  return cmp <= 0 ? 'fwd' : 'rev'
}

// Alkyl substituents (methyl/ethyl/propyl/butyl) are drawn as their own
// short carbon chain — plain 'C' atoms in a zigzag branch, same visual
// style as the backbone (and Level 1) — rather than a single letter-coded
// stub atom. Halogens (fluoro/chloro/bromo/iodo) stay real single atoms
// (F/Cl/Br/I), which is already the correct real-element depiction.
const ALKYL_CHAIN_LEN = { methyl: 1, ethyl: 2, propyl: 3, butyl: 4 }

function layout(n, subs) {
  // subs: [{ pos (canonical, final), key }]
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

function makeQuestion({ idNum, difficulty, n, subs, subtype, rand }) {
  // subs: [{ physicalPos (1..n, left-to-right as drawn), key }], distinct positions & keys
  const rawPositions = subs.map(s => s.physicalPos)
  const direction = resolveDirection(n, rawPositions)
  const toCanonical = p => (direction === 'fwd' ? p : n + 1 - p)
  const canonicalSubs = subs
    .map(s => ({ key: s.key, pos: toCanonical(s.physicalPos), physicalPos: s.physicalPos }))
    .sort((a, b) => a.pos - b.pos)

  const { atoms, bonds } = layout(
    n,
    subs.map(s => ({ pos: s.physicalPos, key: s.key }))
  )
  const locantLabels = Array.from({ length: n }, (_, i) => {
    const physicalPos = i + 1
    return { atomId: `T${physicalPos}`, number: toCanonical(physicalPos) }
  })

  const canonicalSet = canonicalSubs.map(s => s.pos).sort((a, b) => a - b)
  const winnerSide = direction === 'fwd' ? 'ซ้าย' : 'ขวา'
  const setDescription = canonicalSet.join(',')

  let prompt, choiceLabels, correctLabel, explanation

  if (subtype === 'locant') {
    const target = canonicalSubs[Math.floor(rand() * canonicalSubs.length)]
    const def = CATALOG[target.key]
    prompt = `หมู่ ${def.name} อยู่ที่ตำแหน่งเลขใด?`
    correctLabel = String(target.pos)
    const pool = new Set()
    for (const s of canonicalSubs) if (s.pos !== target.pos) pool.add(s.pos)
    const mirror = n + 1 - target.pos
    if (mirror !== target.pos) pool.add(mirror)
    if (target.pos - 1 >= 1) pool.add(target.pos - 1)
    if (target.pos + 1 <= n) pool.add(target.pos + 1)
    if (target.pos - 2 >= 1) pool.add(target.pos - 2)
    if (target.pos + 2 <= n) pool.add(target.pos + 2)
    pool.delete(target.pos)
    choiceLabels = [correctLabel, ...shuffleWith([...pool], rand).map(String)].slice(0, 4)
    while (choiceLabels.length < 4) {
      const extra = 1 + Math.floor(rand() * n)
      const s = String(extra)
      if (!choiceLabels.includes(s)) choiceLabels.push(s)
    }
    explanation = `เมื่อนับให้หมู่แทนที่ได้เลขตำแหน่งต่ำที่สุดรวมกัน (ชุดเลข ${setDescription}) ต้องนับจากด้าน${winnerSide} ทำให้หมู่ ${def.name} อยู่ที่ตำแหน่ง ${target.pos}`
  } else if (subtype === 'substituent') {
    const target = canonicalSubs[Math.floor(rand() * canonicalSubs.length)]
    const def = CATALOG[target.key]
    prompt = `ตำแหน่งเลข ${target.pos} คือหมู่ใด?`
    correctLabel = def.name
    const otherPresent = canonicalSubs.filter(s => s.key !== target.key).map(s => CATALOG[s.key].name)
    const unusedPool = ALLOWED.filter(k => k !== target.key && !canonicalSubs.some(s => s.key === k)).map(k => CATALOG[k].name)
    const pool = shuffleWith([...otherPresent, ...unusedPool], rand)
    choiceLabels = [correctLabel, ...pool].slice(0, 4)
    explanation = `เมื่อนับให้หมู่แทนที่ได้เลขตำแหน่งต่ำที่สุดรวมกัน (ชุดเลข ${setDescription}) ต้องนับจากด้าน${winnerSide} ทำให้ตำแหน่ง ${target.pos} คือหมู่ ${def.name}`
  } else {
    // locantset — only used when canonicalSubs.length >= 2
    prompt = 'ชุดเลขตำแหน่งของหมู่แทนที่ทั้งหมด (เรียงจากน้อยไปมาก) คือข้อใด?'
    correctLabel = setDescription
    const mirrorSet = canonicalSet.map(p => n + 1 - p).sort((a, b) => a - b).join(',')
    const bump = (arr, idx, delta) => {
      const copy = [...arr]
      copy[idx] = copy[idx] + delta
      return copy.sort((a, b) => a - b).join(',')
    }
    const pool = new Set()
    if (mirrorSet !== correctLabel) pool.add(mirrorSet)
    if (canonicalSet[0] - 1 >= 1) pool.add(bump(canonicalSet, 0, -1))
    if (canonicalSet[canonicalSet.length - 1] + 1 <= n) pool.add(bump(canonicalSet, canonicalSet.length - 1, 1))
    pool.add(bump(canonicalSet, 0, 1))
    pool.delete(correctLabel)
    choiceLabels = [correctLabel, ...shuffleWith([...pool], rand)].slice(0, 4)
    let guard = 0
    while (choiceLabels.length < 4 && guard < 50) {
      guard++
      const idx = Math.floor(rand() * canonicalSet.length)
      const delta = rand() < 0.5 ? -1 : 1
      const candidatePos = canonicalSet[idx] + delta
      if (candidatePos < 1 || candidatePos > n) continue
      const candidate = bump(canonicalSet, idx, delta)
      if (!choiceLabels.includes(candidate)) choiceLabels.push(candidate)
    }
    explanation = `เทียบเลขตำแหน่งของหมู่แทนที่ทั้งสองทิศทางที่ตำแหน่งแรกที่ต่างกัน ด้าน${winnerSide}ให้ค่าต่ำกว่า จึงได้ชุดเลขตำแหน่ง ${setDescription}`
  }

  const uniqueLabels = [...new Set(choiceLabels)]
  if (uniqueLabels.length < 4) {
    throw new Error(`idNum=${idNum} difficulty=${difficulty} subtype=${subtype}: could not build 4 distinct choices (got ${JSON.stringify(uniqueLabels)})`)
  }
  const finalLabels = shuffleWith(uniqueLabels.slice(0, 4), rand)
  const choices = finalLabels.map((label, i) => ({ id: `c${i}`, label }))
  const correctChoice = choices.find(c => c.label === correctLabel)
  if (!correctChoice) throw new Error(`idNum=${idNum}: correct label "${correctLabel}" missing from choices`)

  const hint = 'อ่านตัวเลขที่กำกับไว้บนคาร์บอนแต่ละตัวในโครงสร้างให้ละเอียด โครงสร้างนับเลขให้ถูกต้องไว้แล้ว'

  return {
    id: `L3-${difficulty[0].toUpperCase()}-${String(idNum).padStart(3, '0')}`,
    level: 3,
    difficulty,
    structure: { atoms, bonds },
    locantLabels,
    prompt,
    choices,
    correctChoiceId: correctChoice.id,
    explanation,
    hint,
    _sig: `${n}|${canonicalSubs.map(s => `${s.pos}:${s.key}`).join(',')}`
  }
}

// ---- candidate generation: enumerate molecules, dedup by signature -------

function* candidateStream(k, nRange, seedBase) {
  let seed = seedBase
  while (true) {
    seed++
    const rand = mulberry32(seed)
    const n = nRange[Math.floor(rand() * nRange.length)]
    const internal = []
    for (let p = 2; p <= n - 1; p++) internal.push(p)
    if (internal.length < k) continue
    const positions = shuffleWith(internal, rand).slice(0, k).sort((a, b) => a - b)
    const keys = shuffleWith(ALLOWED, rand).slice(0, k)
    const subs = positions.map((pos, i) => ({ physicalPos: pos, key: keys[i] }))
    yield { n, subs }
  }
}

function buildBucket(count, difficulty, k, nRange, seedBase, subtypeSeq, seen) {
  const gen = candidateStream(k, nRange, seedBase)
  const out = []
  let idNum = 0
  let guard = 0
  while (out.length < count && guard < 20000) {
    guard++
    const { n, subs } = gen.next().value
    const sig = `${n}|${subs
      .slice()
      .sort((a, b) => a.physicalPos - b.physicalPos)
      .map(s => `${s.key}`)
      .join(',')}|${subs
      .slice()
      .sort((a, b) => a.physicalPos - b.physicalPos)
      .map(s => s.physicalPos)
      .join(',')}`
    if (seen.has(sig)) continue
    seen.add(sig)
    idNum++
    const subtype = subtypeSeq(idNum, k)
    const rand = mulberry32(seedBase * 1000 + idNum)
    const q = makeQuestion({ idNum, difficulty, n, subs, subtype, rand })
    if (seen.has(`mol:${q._sig}`)) continue
    seen.add(`mol:${q._sig}`)
    out.push(q)
  }
  if (out.length < count) throw new Error(`Only generated ${out.length}/${count} for difficulty=${difficulty} k=${k}`)
  return out
}

const seen = new Set()

const easy = buildBucket(34, 'easy', 1, [5, 6, 7, 8, 9, 10], 1001, idNum => (idNum % 2 === 0 ? 'locant' : 'substituent'), seen)
const medium = buildBucket(
  33,
  'medium',
  2,
  [6, 7, 8, 9, 10],
  2001,
  idNum => ['locant', 'substituent', 'locantset'][idNum % 3],
  seen
)
const hard = buildBucket(
  33,
  'hard',
  3,
  [7, 8, 9, 10],
  3001,
  idNum => ['locantset', 'locant', 'substituent'][idNum % 3],
  seen
)

const questions = [...easy, ...medium, ...hard]

console.log(`Generated ${questions.length} Level 3 questions.`)
const byDiff = {}
for (const q of questions) byDiff[q.difficulty] = (byDiff[q.difficulty] ?? 0) + 1
console.log('Per difficulty:', byDiff)

const shipped = questions.map(({ _sig, ...rest }) => rest)
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/level3.questions.json', JSON.stringify(shipped, null, 2))
console.log('Wrote src/data/level3.questions.json')
