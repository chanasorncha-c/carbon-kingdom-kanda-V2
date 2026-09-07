import type { MoleculeStructure } from './molecule'
import type { Difficulty } from './question'

export interface LocantChoice {
  id: string
  label: string
}

/**
 * Level 3 "Numbering City": the chain is already numbered (every backbone
 * carbon carries its correct IUPAC locant, computed the same
 * lowest-locant-to-substituents way Level 2 teaches) — the player's whole
 * job is just to read that numbering correctly and answer a multiple-choice
 * question about it. No bond-clicking, no complex/branched structures.
 */
export interface Level3Question {
  id: string
  level: 3
  difficulty: Difficulty
  structure: MoleculeStructure
  /** Every backbone carbon T1..Tn, already labeled with its correct locant. */
  locantLabels: { atomId: string; number: number }[]
  prompt: string
  choices: LocantChoice[]
  correctChoiceId: string
  explanation: string
  hint: string
}
