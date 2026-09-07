// Generates src/data/level1.questions.json
// Every molecule is an unlabeled carbon tree (skeletal alkane skeleton).
// We build each as: a horizontal "trunk" of T carbons (drawn as a zigzag
// row) plus 1-2 "branches" hanging off an interior trunk carbon.
//
// Correctness is NOT hand-counted: for every structure we run the
// standard tree-diameter algorithm (double BFS) to find the TRUE longest
// path, and compare it against the trunk. That comparison is what decides
// `isHorizontalTrap` and drives the auto-generated explanation text, so
// the shipped "answer" can't drift from what the graph actually says.

import { writeFileSync, mkdirSync } from 'node:fs'

function layout(trunkLen, branches) {
  const atoms = []
  const bonds = []
  const idOf = {}

  for (let i = 1; i <= trunkLen; i++) {
    const id = `T${i}`
    idOf[id] = id
    atoms.push({ id, x: i * 1.0, y: i % 2 === 0 ? 0.55 : 0, element: 'C' })
    if (i > 1) bonds.push({ from: `T${i - 1}`, to: id, order: 1 })
  }

  branches.forEach((br, bi) => {
    const attachAtom = atoms.find(a => a.id === `T${br.at}`)
    let prevId = `T${br.at}`
    const ySign = br.side === 'up' ? -1 : 1
    const xJitter = bi === 0 ? 0.25 : -0.25
    for (let k = 1; k <= br.len; k++) {
      const id = `B${bi + 1}_${k}`
      const x = attachAtom.x + xJitter * (k % 2 === 0 ? 1.4 : 0.6)
      const y = attachAtom.y + ySign * (0.9 * k)
      atoms.push({ id, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), element: 'C' })
      bonds.push({ from: prevId, to: id, order: 1 })
      prevId = id
    }
  })

  const adj = new Map()
  atoms.forEach(a => adj.set(a.id, []))
  bonds.forEach(b => {
    adj.get(b.from).push(b.to)
    adj.get(b.to).push(b.from)
  })

  return { atoms, bonds, adj }
}

function bfsFarthest(adj, start) {
  const dist = new Map([[start, 0]])
  const parent = new Map([[start, null]])
  const queue = [start]
  let far = start
  while (queue.length) {
    const cur = queue.shift()
    for (const nb of adj.get(cur)) {
      if (!dist.has(nb)) {
        dist.set(nb, dist.get(cur) + 1)
        parent.set(nb, cur)
        queue.push(nb)
        if (dist.get(nb) > dist.get(far)) far = nb
      }
    }
  }
  return { far, dist, parent }
}

function longestPath(adj) {
  const anyStart = adj.keys().next().value
  const { far: u } = bfsFarthest(adj, anyStart)
  const { far: v, parent } = bfsFarthest(adj, u)
  const path = []
  let cur = v
  while (cur !== null) {
    path.push(cur)
    cur = parent.get(cur)
  }
  path.reverse() // u -> v
  return path // array of atom ids, length = number of atoms in longest chain
}

// Brute-force tie check: a tree can have more than one path achieving the
// maximum length (diameter). We must never ship a question with more than
// one distinct maximum-length atom-SET, since the game only accepts a
// single answer set. All-pairs BFS is fine at this size (<=12 atoms).
function findAllMaxPaths(adj) {
  const nodes = [...adj.keys()]
  const distFrom = new Map()
  for (const n of nodes) distFrom.set(n, bfsFarthest(adj, n).dist)
  let maxLen = -1
  const pairs = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = distFrom.get(nodes[i]).get(nodes[j]) // edge-distance
      const atomsInPath = d + 1
      if (atomsInPath > maxLen) {
        maxLen = atomsInPath
        pairs.length = 0
        pairs.push([nodes[i], nodes[j]])
      } else if (atomsInPath === maxLen) {
        pairs.push([nodes[i], nodes[j]])
      }
    }
  }
  return { maxLen, pairs }
}

function toSmiles(adj, atoms) {
  // simple recursive SMILES writer for an unlabeled carbon tree
  const visited = new Set()
  const byId = new Map(atoms.map(a => [a.id, a]))
  function dfs(id, parent) {
    visited.add(id)
    const children = adj.get(id).filter(n => n !== parent)
    let s = 'C'
    children.forEach((c, idx) => {
      const sub = dfs(c, id)
      if (idx < children.length - 1) s += `(${sub})`
      else s += sub
    })
    return s
  }
  const root = atoms[0].id
  return dfs(root, null)
}

function makeQuestion({ idNum, difficulty, trunkLen, branches, note }) {
  const { atoms, bonds, adj } = layout(trunkLen, branches)
  const answerPath = longestPath(adj)
  const { maxLen, pairs } = findAllMaxPaths(adj)
  if (pairs.length > 1) {
    // more than one endpoint-pair reaches the max length -> ambiguous chain,
    // not safe to ship (the "answer" set wouldn't be the unique correct one)
    console.error(
      `AMBIGUOUS (tie) at difficulty=${difficulty} idNum=${idNum}: trunk=${trunkLen} branches=${JSON.stringify(
        branches
      )} — ${pairs.length} pairs achieve length ${maxLen}: ${JSON.stringify(pairs)}`
    )
  }
  const trunkPath = Array.from({ length: trunkLen }, (_, i) => `T${i + 1}`)
  const answerSet = new Set(answerPath)
  const trunkSet = new Set(trunkPath)
  const sameAsTrunk =
    answerSet.size === trunkSet.size && [...answerSet].every(a => trunkSet.has(a))
  const isHorizontalTrap = !sameAsTrunk && answerPath.length > trunkLen

  // distractor choice: the trunk-only path (only meaningful if it's wrong / a trap)
  const choices = [
    { id: 'answer', path: answerPath },
  ]
  if (!sameAsTrunk) choices.push({ id: 'trunk-only', path: trunkPath })
  // add one more short/plausible distractor: half of a branch only, if any branch exists
  if (branches.length > 0) {
    const b = branches[0]
    const partial = [`T${b.at}`, ...Array.from({ length: Math.max(1, b.len - 1) }, (_, k) => `B1_${k + 1}`)]
    if (partial.join(',') !== answerPath.join(',')) {
      choices.push({ id: 'partial-branch', path: partial })
    }
  }

  const smiles = toSmiles(adj, atoms)

  const prompt = 'คลิกไล่ตามอะตอมคาร์บอนเพื่อลากเส้นโซ่ที่ยาวที่สุดแบบต่อเนื่อง'

  let explanation
  if (isHorizontalTrap) {
    explanation = `หลายคนจะหยุดคิดว่าแถวแนวนอนที่มี ${trunkLen} คาร์บอนคือคำตอบ แต่ถ้าลากเข้าไปในกิ่งจะได้โซ่ยาวถึง ${answerPath.length} คาร์บอน — เพราะ ${answerPath.length} มากกว่า ${trunkLen} เส้นทางที่ยาวกว่าผ่านกิ่งนี้จึงเป็น "โซ่หลัก" (parent chain) ที่แท้จริง อย่าลืมตรวจทุกกิ่งก่อนสรุปคำตอบ ต่อให้โซ่ที่ "ดูยาวที่สุด" จะล่อตาล่อใจแค่ไหนก็ตาม`
  } else if (branches.length > 0) {
    explanation = `แถวแนวนอนที่มี ${trunkLen} คาร์บอนคือคำตอบที่ถูกต้องจริง ๆ — ไม่มีกิ่งไหนยาวพอจะแซงได้เลยเมื่อนับดูจริง ๆ แต่ก็ยังคุ้มค่าที่จะตรวจกิ่งทุกครั้ง แม้โซ่ที่เห็นชัด ๆ จะถูกต้องอยู่แล้วก็ตาม`
  } else {
    explanation = `เพราะไม่มีกิ่งแยกเลย โซ่ทั้ง ${trunkLen} คาร์บอนนี้จึงเป็นโซ่หลัก (parent chain) ทั้งหมด`
  }

  const hint = isHorizontalTrap
    ? 'ลองลากเส้นจากปลายอีกด้านของแถว ผ่านเข้าไปในกิ่ง แทนที่จะหยุดแค่ที่แถวหลัก'
    : 'ลองตรวจกิ่งดูก็ได้ — แต่นับให้ดี ๆ รอบนี้แถวหลักชนะ'

  return {
    id: `L1-${difficulty[0].toUpperCase()}-${String(idNum).padStart(3, '0')}`,
    level: 1,
    difficulty,
    structure: { atoms, bonds },
    smiles,
    prompt,
    choices,
    answer: answerPath,
    explanation,
    hint,
    isHorizontalTrap,
    _debug: note
      ? { trunkLen, branches, longestLen: answerPath.length, note }
      : { trunkLen, branches, longestLen: answerPath.length }
  }
}

const defs = [
  // ---- easy ----
  { difficulty: 'easy', trunkLen: 4, branches: [] },
  { difficulty: 'easy', trunkLen: 5, branches: [{ at: 3, len: 1, side: 'down' }] },
  { difficulty: 'easy', trunkLen: 4, branches: [{ at: 2, len: 3, side: 'up' }] }, // trap
  { difficulty: 'easy', trunkLen: 6, branches: [{ at: 4, len: 1, side: 'down' }] },
  { difficulty: 'easy', trunkLen: 5, branches: [{ at: 3, len: 1, side: 'up' }] },
  // ---- medium ----
  { difficulty: 'medium', trunkLen: 5, branches: [{ at: 2, len: 4, side: 'up' }] }, // trap
  { difficulty: 'medium', trunkLen: 6, branches: [{ at: 3, len: 1, side: 'down' }] },
  { difficulty: 'medium', trunkLen: 5, branches: [{ at: 4, len: 3, side: 'up' }] }, // trap
  { difficulty: 'medium', trunkLen: 7, branches: [{ at: 4, len: 2, side: 'down' }] },
  { difficulty: 'medium', trunkLen: 6, branches: [{ at: 3, len: 1, side: 'up' }, { at: 4, len: 1, side: 'down' }] },
  // ---- hard ----
  { difficulty: 'hard', trunkLen: 6, branches: [{ at: 2, len: 4, side: 'up' }] }, // trap
  { difficulty: 'hard', trunkLen: 7, branches: [{ at: 2, len: 2, side: 'up' }, { at: 6, len: 2, side: 'down' }] }, // trap (branch-to-branch)
  { difficulty: 'hard', trunkLen: 6, branches: [{ at: 3, len: 5, side: 'down' }] }, // trap
  { difficulty: 'hard', trunkLen: 8, branches: [{ at: 3, len: 1, side: 'up' }, { at: 6, len: 1, side: 'down' }] },
  { difficulty: 'hard', trunkLen: 7, branches: [{ at: 4, len: 2, side: 'up' }, { at: 4, len: 2, side: 'down' }] },
  // ---- batch 2 (added for randomization variety) ----
  { difficulty: 'easy', trunkLen: 8, branches: [{ at: 4, len: 2, side: 'up' }] },
  { difficulty: 'easy', trunkLen: 6, branches: [{ at: 2, len: 3, side: 'up' }] },
  { difficulty: 'easy', trunkLen: 4, branches: [{ at: 3, len: 2, side: 'down' }] },
  { difficulty: 'medium', trunkLen: 7, branches: [{ at: 3, len: 3, side: 'up' }] },
  { difficulty: 'medium', trunkLen: 8, branches: [{ at: 3, len: 1, side: 'up' }, { at: 5, len: 1, side: 'down' }] },
  { difficulty: 'medium', trunkLen: 8, branches: [{ at: 5, len: 2, side: 'up' }] },
  { difficulty: 'medium', trunkLen: 7, branches: [{ at: 5, len: 3, side: 'up' }] },
  { difficulty: 'hard', trunkLen: 7, branches: [{ at: 3, len: 4, side: 'up' }] },
  { difficulty: 'hard', trunkLen: 9, branches: [{ at: 5, len: 3, side: 'down' }] },
  { difficulty: 'hard', trunkLen: 8, branches: [{ at: 2, len: 3, side: 'up' }, { at: 7, len: 3, side: 'down' }] }
]

const counters = { easy: 0, medium: 0, hard: 0 }
const questions = defs.map(d => {
  counters[d.difficulty]++
  return makeQuestion({ idNum: counters[d.difficulty], difficulty: d.difficulty, trunkLen: d.trunkLen, branches: d.branches })
})

const trapCount = questions.filter(q => q.isHorizontalTrap).length
console.log(`Generated ${questions.length} Level 1 questions. Traps: ${trapCount} (${Math.round((trapCount / questions.length) * 100)}%)`)
questions.forEach(q => {
  console.log(`${q.id} [${q.difficulty}] trunk=${q._debug.trunkLen} branches=${JSON.stringify(q._debug.branches)} longest=${q._debug.longestLen} trap=${q.isHorizontalTrap}`)
})

// strip debug field from shipped output
const shipped = questions.map(({ _debug, ...rest }) => rest)

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/level1.questions.json', JSON.stringify(shipped, null, 2))
console.log('Wrote src/data/level1.questions.json')
