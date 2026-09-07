import l1 from '../data/level1.questions.json'
import l2 from '../data/level2.questions.json'
import l3 from '../data/level3.questions.json'
import l4 from '../data/level4.questions.json'
import l5 from '../data/level5.questions.json'
import type { LocaleKey } from '../locales'

export interface QuestionMeta {
  id: string
  levelId: string
  levelNameKey: LocaleKey
  label: string
}

function indexOf(arr: any[], levelId: string, levelNameKey: LocaleKey, labelFn: (q: any) => string): QuestionMeta[] {
  return arr.map(q => ({ id: q.id, levelId, levelNameKey, label: labelFn(q) }))
}

const ALL: QuestionMeta[] = [
  ...indexOf(l1 as any[], 'level1', 'level1.name', q => q.explanation?.slice(0, 40) ?? q.id),
  ...indexOf(l2 as any[], 'level2', 'level2.name', q => q.explanation?.slice(0, 40) ?? q.id),
  ...indexOf(l3 as any[], 'level3', 'level3.name', q => q.explanation?.slice(0, 40) ?? q.id),
  ...indexOf(l4 as any[], 'level4', 'level4.name', q => q.explanation?.slice(0, 40) ?? q.id),
  ...indexOf(l5 as any[], 'level5', 'level5.name', q => q.correctName ?? q.id)
]

export const QUESTION_INDEX = new Map(ALL.map(q => [q.id, q]))
