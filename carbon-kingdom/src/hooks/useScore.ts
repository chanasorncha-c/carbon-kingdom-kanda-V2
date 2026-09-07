import { useCallback, useState } from 'react'
import { reportLevelScore } from '../services/gameplayBus'
import { LEVEL_SCORE_CONFIG, SCORE_DECAY_PER_SEC } from '../data/scoringConfig'

export interface ScoreState {
  score: number
  streak: number
  badges: string[]
}

export type AnswerOutcome = 'correct' | 'wrong'

/**
 * Per-level scoring rules (see src/data/scoringConfig.ts for the numbers):
 *  - correct: base points for this level, minus 10 for every second taken
 *    to answer, times the combo multiplier (below)
 *  - wrong (including letting the timer run out): 0 points for the
 *    question, and this level's flat penalty is subtracted — same penalty
 *    whether the student picked wrong outright or ran out of time
 *  - combo multiplier on the *correct* award: x1.2 at a 3-streak, x1.5 at
 *    5, x2 at 10 — resets to 1 on any wrong/timeout
 */
export function useScore(levelId: keyof typeof LEVEL_SCORE_CONFIG) {
  const [state, setState] = useState<ScoreState>({ score: 0, streak: 0, badges: [] })
  const config = LEVEL_SCORE_CONFIG[levelId]

  const comboMultiplier = (streak: number) => (streak >= 10 ? 2 : streak >= 5 ? 1.5 : streak >= 3 ? 1.2 : 1)

  const record = useCallback(
    (outcome: AnswerOutcome, elapsedMs: number) => {
      setState(prev => {
        let next: ScoreState
        if (outcome === 'wrong') {
          next = { ...prev, score: prev.score - config.penalty, streak: 0 }
        } else {
          const nextStreak = prev.streak + 1
          const elapsedSec = elapsedMs / 1000
          const decayed = Math.max(config.base - SCORE_DECAY_PER_SEC * elapsedSec, 0)
          const raw = decayed * comboMultiplier(nextStreak)
          next = { ...prev, score: prev.score + Math.round(raw), streak: nextStreak }
        }
        // Broadcast the running score immediately (not just when the level
        // ends) so a connected classroom room can mirror it to the teacher's
        // live leaderboard in real time — see useRoom's onLevelScore subscription.
        reportLevelScore(next.score)
        return next
      })
    },
    [config]
  )

  const awardBadge = useCallback((badge: string) => {
    setState(prev => (prev.badges.includes(badge) ? prev : { ...prev, badges: [...prev.badges, badge] }))
  }, [])

  const reset = useCallback(() => setState({ score: 0, streak: 0, badges: [] }), [])

  return { ...state, record, awardBadge, reset, comboMultiplier, config }
}
