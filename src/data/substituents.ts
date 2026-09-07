import catalog from './substituents.json'

/**
 * Substituent catalog for Level 4. Names stay in standard IUPAC English —
 * that's the actual nomenclature being built (matches real Thai chemistry
 * classrooms, where the compound name itself is always written in Latin
 * IUPAC terms even though instruction happens in Thai); only the
 * surrounding prompts/feedback are Thai.
 *
 * `sortKey` is what alphabetization actually uses — NOT `display` — per
 * IUPAC P-14.5.2: italicized prefixes like "tert-" are ignored when
 * alphabetizing (tert-butyl -> "butyl"), but "iso" is NOT ignored since
 * it isn't a detachable italicized prefix (isopropyl stays "isopropyl").
 *
 * Single source of truth is substituents.json, shared with
 * scripts/gen-level4.mjs so the game and the generator can never drift.
 */
export interface SubstituentDef {
  name: string
  display: string
  sortKey: string
  element: string
  color: string
  canBeSuffix?: boolean
}

export const SUBSTITUENTS = catalog as Record<string, SubstituentDef>

export function multiplyPrefix(count: number) {
  return count === 1 ? '' : count === 2 ? 'di' : count === 3 ? 'tri' : count === 4 ? 'tetra' : `${count}-`
}
