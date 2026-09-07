import type { MoleculeStructure } from './molecule'
import type { Difficulty } from './question'

export type Direction = 'left' | 'right'

export interface DirectionLocants {
  /** Locant of the multiple bond's lower-numbered carbon, from this direction (null if no multiple bond). */
  bond: number | null
  /** Ascending-sorted substituent locants from this direction. */
  substituents: number[]
}

export interface Level2Question {
  id: string
  level: 2
  difficulty: Difficulty
  structure: MoleculeStructure
  smiles: string
  prompt: string
  /** Precomputed locant sets for both numbering directions — drives the comparison table. */
  locants: { left: DirectionLocants; right: DirectionLocants }
  answer: Direction
  /** Which rule actually decided the winner. */
  decidingRule: 'bond' | 'substituent'
  /** True when the bond-only comparison and the substituent-only comparison would have picked opposite directions. */
  hasConflict: boolean
  explanation: string
  hint: string
}
