import type { MoleculeStructure } from '../../types/molecule'
import type { Direction } from '../../types/question2'

/**
 * Derives which trunk atom gets which printed locant number for a given
 * numbering direction, straight from the structure graph — so the on-canvas
 * badges can never drift from the `locants` numbers computed by the data
 * generator (scripts/gen-level2.mjs uses the same left/right convention).
 */
export function computeLocantLabels(structure: MoleculeStructure, direction: Direction) {
  const trunkIds = structure.atoms
    .map(a => a.id)
    .filter(id => /^T\d+$/.test(id))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
  const n = trunkIds.length
  const indexOf = new Map(trunkIds.map((id, i) => [id, i + 1])) // 1-indexed trunk position

  const numberFor = (trunkIndex: number) => (direction === 'left' ? trunkIndex : n - trunkIndex + 1)

  const labels: { atomId: string; number: number }[] = []

  // multiple bond: label whichever end gets the lower number in this direction
  const multiBond = structure.bonds.find(b => b.order > 1 && indexOf.has(b.from) && indexOf.has(b.to))
  if (multiBond) {
    const i1 = indexOf.get(multiBond.from)!
    const i2 = indexOf.get(multiBond.to)!
    const lower = numberFor(i1) < numberFor(i2) ? multiBond.from : multiBond.to
    labels.push({ atomId: lower, number: numberFor(indexOf.get(lower)!) })
  }

  // substituents: label the trunk carbon they're attached to
  for (const b of structure.bonds) {
    const subEnd = b.from.startsWith('Sub') ? b.from : b.to.startsWith('Sub') ? b.to : null
    const trunkEnd = b.from.startsWith('Sub') ? b.to : b.to.startsWith('Sub') ? b.from : null
    if (subEnd && trunkEnd && indexOf.has(trunkEnd)) {
      labels.push({ atomId: trunkEnd, number: numberFor(indexOf.get(trunkEnd)!) })
    }
  }

  return labels
}
