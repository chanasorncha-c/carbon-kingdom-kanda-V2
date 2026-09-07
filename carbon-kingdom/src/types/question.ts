import type { MoleculeStructure } from './molecule'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface AnswerChoice {
  id: string
  path: string[]
}

export interface Level1Question {
  id: string
  level: 1
  difficulty: Difficulty
  structure: MoleculeStructure
  smiles: string
  prompt: string
  choices: AnswerChoice[]
  /** Correct longest-chain path, as an ordered array of atom ids (either traversal direction is accepted). */
  answer: string[]
  explanation: string
  hint: string
  isHorizontalTrap: boolean
}
