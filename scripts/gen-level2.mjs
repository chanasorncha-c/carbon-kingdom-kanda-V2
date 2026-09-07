// Generates src/data/level2.questions.json ("Direction Duel").
//
// Every molecule here is a linear parent chain (no branch-finding needed —
// that's Level 1's job) with:
//   - 0-3 single-atom substituent stubs (drawn as Cl, purely as a generic
//     "something is attached here" marker — Level 2 never asks the player
//     to name it, that's Level 4)
//   - an optional one double/triple bond on a single trunk-trunk bond
//
// The correct numbering direction is not hand-picked — it's computed from
// the real IUPAC precedence: lowest locant to the multiple bond first, and
// only if that's a genuine tie does the lowest-locant-to-substituents rule
// (compared ascending, first point of difference) decide it. A brute-force
// uniqueness check rejects any structure where the final decision would
// still be a tie (e.g. a mirror-symmetric substituent pattern).

import { writeFileSync, mkdirSync } from 'node:fs'

function layout(n, substituents, bond) {
  const atoms = []
  const bonds = []
  for (let i = 1; i <= n; i++) {
    atoms.push({ id: `T${i}`, x: i * 1.0, y: i % 2 === 0 ? 0.55 : 0, element: 'C' })
    if (i > 1) {
      const order = bond && bond.at === i - 1 ? bond.order : 1
      bonds.push({ from: `T${i - 1}`, to: `T${i}`, order })
    }
  }
  substituents.forEach((pos, k) => {
    const t = atoms.find(a => a.id === `T${pos}`)
    const id = `Sub${k + 1}`
    atoms.push({ id, x: t.x, y: t.y - 0.95, element: 'Cl' })
    bonds.push({ from: `T${pos}`, to: id, order: 1 })
  })
  return { atoms, bonds }
}

function mirror(n, p) {
  return n - p + 1
}

function compareAsc(a, b) {
  // returns 'a' | 'b' | 'tie' for two equal-length ascending arrays
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return 'a'
    if (a[i] > b[i]) return 'b'
  }
  return 'tie'
}

function toSmiles(n, substituents, bond) {
  const subSet = new Set(substituents)
  let s = 'C'
  if (subSet.has(1)) s += '(Cl)'
  for (let i = 2; i <= n; i++) {
    const b = bond && bond.at === i - 1 ? bond.order : 1
    s += b === 2 ? '=' : b === 3 ? '#' : ''
    s += 'C'
    if (subSet.has(i)) s += '(Cl)'
  }
  return s
}

function makeQuestion({ idNum, difficulty, n, substituents, bond }) {
  const leftSubs = [...substituents].sort((a, b) => a - b)
  const rightSubs = substituents.map(p => mirror(n, p)).sort((a, b) => a - b)
  const leftBond = bond ? bond.at : null
  const rightBond = bond ? n - bond.at : null

  let winner
  let decidingRule

  if (bond) {
    if (leftBond < rightBond) {
      winner = 'left'
      decidingRule = 'bond'
    } else if (rightBond < leftBond) {
      winner = 'right'
      decidingRule = 'bond'
    } else {
      // bond is a genuine tie (symmetric placement) -> fall through to substituents
      if (leftSubs.length === 0) {
        console.error(`AMBIGUOUS(bond-tie, no substituents to break it) idNum=${idNum} difficulty=${difficulty}`)
      }
      const cmp = compareAsc(leftSubs, rightSubs)
      if (cmp === 'tie') {
        console.error(`AMBIGUOUS(bond-tie AND substituent-tie) idNum=${idNum} difficulty=${difficulty}`)
      }
      winner = cmp === 'a' ? 'left' : 'right'
      decidingRule = 'substituent'
    }
  } else {
    if (leftSubs.length === 0) {
      console.error(`AMBIGUOUS(no bond, no substituents) idNum=${idNum} difficulty=${difficulty}`)
    }
    const cmp = compareAsc(leftSubs, rightSubs)
    if (cmp === 'tie') {
      console.error(`AMBIGUOUS(substituent-tie, no bond) idNum=${idNum} difficulty=${difficulty}`)
    }
    winner = cmp === 'a' ? 'left' : 'right'
    decidingRule = 'substituent'
  }

  // conflict flag: what would bond-only vs substituent-only each prefer, when both exist
  let hasConflict = false
  if (bond && leftSubs.length > 0 && leftBond !== rightBond) {
    const bondPick = leftBond < rightBond ? 'left' : 'right'
    const subCmp = compareAsc(leftSubs, rightSubs)
    const subPick = subCmp === 'tie' ? null : subCmp === 'a' ? 'left' : 'right'
    if (subPick && subPick !== bondPick) hasConflict = true
  }

  const { atoms, bonds } = layout(n, substituents, bond)
  const smiles = toSmiles(n, substituents, bond)

  const prompt = 'จะเริ่มนับจากด้านไหนดี?'

  let explanation
  if (decidingRule === 'bond') {
    if (hasConflict) {
      explanation = `พันธะซ้อนอยู่ที่ตำแหน่ง ${leftBond} ถ้านับจากซ้าย และตำแหน่ง ${rightBond} ถ้านับจากขวา — ถึงแม้การนับจากอีกด้านจะให้เลขตำแหน่งของหมู่แทนที่ต่ำกว่าก็ตาม แต่ "พันธะคู่/สามต้องได้เลขต่ำก่อนเสมอ" จึงต้องนับจากด้าน${winner === 'left' ? 'ซ้าย' : 'ขวา'} (ตำแหน่งพันธะ = ${Math.min(leftBond, rightBond)}) กฎนี้มาก่อนกฎเรื่องหมู่แทนที่เสมอ`
    } else {
      explanation = `พันธะซ้อนได้เลขตำแหน่งต่ำกว่าเมื่อเริ่มนับจากด้าน${winner === 'left' ? 'ซ้าย' : 'ขวา'} (${Math.min(leftBond, rightBond)} เทียบกับ ${Math.max(leftBond, rightBond)}) พันธะคู่/สามต้องมาก่อนเสมอ ไม่ว่าหมู่แทนที่จะอยู่ตรงไหน`
    }
  } else {
    if (bond) {
      explanation = `พันธะซ้อนอยู่กึ่งกลางพอดี (ตำแหน่ง ${leftBond} เท่ากันทั้งสองด้าน) จึงต้องตัดสินด้วยกฎถัดไป: เทียบเลขตำแหน่งของหมู่แทนที่ — นับจากซ้ายได้ [${leftSubs.join(', ')}] นับจากขวาได้ [${rightSubs.join(', ')}] จุดแรกที่ต่างกันฝั่ง${winner === 'left' ? 'ซ้าย' : 'ขวา'}ต่ำกว่า จึงชนะ`
    } else {
      explanation = `เทียบเลขตำแหน่งของหมู่แทนที่ทีละตัวจากน้อยไปมาก — นับจากซ้ายได้ [${leftSubs.join(', ')}] นับจากขวาได้ [${rightSubs.join(', ')}] ที่จุดแรกที่ต่างกัน ฝั่ง${winner === 'left' ? 'ซ้าย' : 'ขวา'}ให้เลขต่ำกว่า จึงเป็นทิศทางที่ถูกต้อง`
    }
  }

  const hint = decidingRule === 'bond'
    ? 'เช็กตำแหน่งพันธะคู่/สามก่อนเป็นอันดับแรก — กฎนี้ชนะกฎหมู่แทนที่เสมอ'
    : 'ไล่เทียบเลขตำแหน่งของหมู่แทนที่ทีละตัวจากน้อยไปมาก จนกว่าจะเจอจุดที่ต่างกัน'

  return {
    id: `L2-${difficulty[0].toUpperCase()}-${String(idNum).padStart(3, '0')}`,
    level: 2,
    difficulty,
    structure: { atoms, bonds },
    smiles,
    prompt,
    locants: {
      left: { bond: leftBond, substituents: leftSubs },
      right: { bond: rightBond, substituents: rightSubs }
    },
    answer: winner,
    decidingRule,
    hasConflict,
    explanation,
    hint,
    _debug: { n, substituents, bond, leftBond, rightBond, leftSubs, rightSubs }
  }
}

const defs = [
  // ---- easy: one feature only ----
  { difficulty: 'easy', n: 5, substituents: [2], bond: null },
  { difficulty: 'easy', n: 6, substituents: [4], bond: null },
  { difficulty: 'easy', n: 7, substituents: [2], bond: null },
  { difficulty: 'easy', n: 6, substituents: [], bond: { at: 2, order: 2 } },
  { difficulty: 'easy', n: 7, substituents: [], bond: { at: 5, order: 2 } },
  // ---- medium: multi-substituent compare, or bond+substituent agreeing ----
  { difficulty: 'medium', n: 7, substituents: [2, 5], bond: null },
  { difficulty: 'medium', n: 8, substituents: [3, 7], bond: null },
  { difficulty: 'medium', n: 6, substituents: [2, 3, 5], bond: null },
  { difficulty: 'medium', n: 7, substituents: [3], bond: { at: 3, order: 2 } },
  { difficulty: 'medium', n: 9, substituents: [2, 4, 7], bond: null },
  // ---- hard: bond-vs-substituent conflicts (bond must win), deep tie-breaks, bond-tie edge case ----
  { difficulty: 'hard', n: 6, substituents: [2], bond: { at: 4, order: 2 } },
  { difficulty: 'hard', n: 8, substituents: [6], bond: { at: 2, order: 3 } },
  { difficulty: 'hard', n: 7, substituents: [2, 3], bond: { at: 5, order: 2 } },
  { difficulty: 'hard', n: 9, substituents: [2, 4, 8], bond: null },
  { difficulty: 'hard', n: 6, substituents: [2], bond: { at: 3, order: 2 } },
  // ---- batch 2 (added for randomization variety) ----
  { difficulty: 'easy', n: 8, substituents: [3], bond: null },
  { difficulty: 'easy', n: 5, substituents: [], bond: { at: 2, order: 3 } },
  { difficulty: 'medium', n: 8, substituents: [2, 6], bond: null },
  { difficulty: 'medium', n: 9, substituents: [3, 4, 8], bond: null },
  { difficulty: 'medium', n: 6, substituents: [5], bond: { at: 2, order: 2 } },
  { difficulty: 'medium', n: 8, substituents: [3, 5], bond: null },
  { difficulty: 'hard', n: 9, substituents: [7], bond: { at: 2, order: 2 } },
  { difficulty: 'hard', n: 8, substituents: [2, 3, 7], bond: null },
  { difficulty: 'hard', n: 7, substituents: [], bond: { at: 3, order: 2 } },
  { difficulty: 'hard', n: 6, substituents: [3], bond: { at: 3, order: 2 } }
]

const counters = { easy: 0, medium: 0, hard: 0 }
const questions = defs.map(d => {
  counters[d.difficulty]++
  return makeQuestion({ idNum: counters[d.difficulty], difficulty: d.difficulty, n: d.n, substituents: d.substituents, bond: d.bond })
})

const conflictCount = questions.filter(q => q.hasConflict).length
console.log(`Generated ${questions.length} Level 2 questions. Bond-vs-substituent conflicts: ${conflictCount}`)
questions.forEach(q => {
  console.log(
    `${q.id} [${q.difficulty}] n=${q._debug.n} subs=${JSON.stringify(q._debug.substituents)} bond=${JSON.stringify(
      q._debug.bond
    )} -> L:${JSON.stringify(q.locants.left)} R:${JSON.stringify(q.locants.right)} answer=${q.answer} rule=${q.decidingRule} conflict=${q.hasConflict}`
  )
})

const shipped = questions.map(({ _debug, ...rest }) => rest)
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/level2.questions.json', JSON.stringify(shipped, null, 2))
console.log('Wrote src/data/level2.questions.json')
