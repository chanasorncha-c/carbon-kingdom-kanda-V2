import type { MoleculeStructure } from './molecule'
import type { Difficulty } from './question'

export type BossMode = 'build' | 'type'

export interface NameChunk {
  id: string
  /** Text to display on the tappable card, already correctly hyphenated/fused for its position. */
  text: string
}

export interface Level5Question {
  id: string
  level: 5
  mode: BossMode
  difficulty: Difficulty
  structure: MoleculeStructure
  locantLabels: { atomId: string; number: number }[]
  prompt: string
  correctName: string
  /** mode "build": cards to tap in order (already includes decoy chunks mixed in). */
  chunks?: NameChunk[]
  correctChunkSequence?: string[]
  /** mode "type": any of these normalized strings is accepted. */
  acceptedAnswers?: string[]
  explanation: string
  hint: string
}
