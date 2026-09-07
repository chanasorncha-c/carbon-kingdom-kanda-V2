import type { MoleculeStructure } from './molecule'
import type { Difficulty } from './question'

export interface SubstituentCard {
  id: string
  label: string
  isCorrect: boolean
}

export interface Level4Question {
  id: string
  level: 4
  difficulty: Difficulty
  structure: MoleculeStructure
  locantLabels: { atomId: string; number: number }[]
  prompt: string
  cards: SubstituentCard[]
  /** Card ids in the exact correct order (alphabetical by sortKey; decoys never appear here). */
  correctSequence: string[]
  explanation: string
  hint: string
}
