import { useEffect, useRef } from 'react'
import { onAnswer, type AnswerEvent } from '../services/gameplayBus'

/**
 * Keeps every answered question for the whole play session in memory (not
 * per-level, and independent of whether a multiplayer room is active) — the
 * end-of-game report reads this to build per-level accuracy and auto-suggest
 * which levels to review.
 */
export function useSessionLog() {
  const logRef = useRef<AnswerEvent[]>([])

  useEffect(() => onAnswer(evt => logRef.current.push(evt)), [])

  return logRef
}
