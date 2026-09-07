// A tiny in-page event bus so level components can report per-question
// results without every level having to thread multiplayer/teacher-dashboard
// plumbing through their props. Levels call reportAnswer() unconditionally;
// whoever cares (useRoom, when a classroom room is active) subscribes.

export interface AnswerEvent {
  levelId: string
  questionId: string
  difficulty: string
  correct: boolean
  usedHint: boolean
  atMs: number
}

type Listener = (evt: AnswerEvent) => void

const listeners = new Set<Listener>()

export function reportAnswer(evt: Omit<AnswerEvent, 'atMs'>) {
  const full: AnswerEvent = { ...evt, atMs: Date.now() }
  listeners.forEach(fn => fn(full))
}

export function onAnswer(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// A second, tinier bus just for "here's my current running score in the
// level I'm playing right now" — fired after every scoring event (correct,
// wrong, hint), not just when a level finishes. useRoom listens for this to
// keep the teacher's live leaderboard moving question-by-question instead of
// only jumping once per completed level (which, for a multi-minute level,
// looked completely static while a room full of students was actively
// playing).
type ScoreListener = (score: number) => void

const scoreListeners = new Set<ScoreListener>()

export function reportLevelScore(score: number) {
  scoreListeners.forEach(fn => fn(score))
}

export function onLevelScore(fn: ScoreListener): () => void {
  scoreListeners.add(fn)
  return () => scoreListeners.delete(fn)
}
