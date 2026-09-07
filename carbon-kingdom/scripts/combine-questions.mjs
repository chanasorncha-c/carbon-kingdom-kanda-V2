// Combines the 5 per-level generated question banks into one deliverable
// questions.json (per the original brief's "single questions.json with 75+
// verified questions" requirement). The GAME ITSELF still imports the
// per-level files directly (src/data/levelN.questions.json) — that's the
// cleaner runtime shape — this combined file is for review/handoff and for
// anyone who wants to browse/audit the whole question bank in one place.

import { readFileSync, writeFileSync } from 'node:fs'

const files = [1, 2, 3, 4, 5].map(n => `src/data/level${n}.questions.json`)
const all = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))

console.log(`Combined ${all.length} questions across ${files.length} levels.`)
const byLevel = {}
for (const q of all) byLevel[q.level] = (byLevel[q.level] ?? 0) + 1
console.log('Per level:', byLevel)

writeFileSync('questions.json', JSON.stringify(all, null, 2))
console.log('Wrote questions.json (project root)')
