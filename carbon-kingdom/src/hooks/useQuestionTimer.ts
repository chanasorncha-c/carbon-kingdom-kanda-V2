import { useEffect, useRef, useState } from 'react'

/**
 * Per-question countdown clock. Ticks once a second while `active` is
 * true, and calls `onTimeout` exactly once when it reaches zero (unless
 * the caller has already flipped `active` to false by then — e.g. because
 * the question was answered in the same tick). Resets to a fresh
 * `timeoutSec` whenever `resetKey` changes, so every new question starts
 * with a full clock — pass the question index as `resetKey`.
 *
 * Returns the whole seconds remaining, for a visible "⏱ 5…4…3" readout —
 * the actual score decay uses the precise elapsed milliseconds measured
 * separately at answer time, not this rounded display value.
 */
export function useQuestionTimer(timeoutSec: number, active: boolean, resetKey: unknown, onTimeout: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSec)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSecondsLeft(timeoutSec)
  }, [resetKey, timeoutSec])

  useEffect(() => {
    if (!active) return
    if (secondsLeft <= 0) {
      onTimeoutRef.current()
      return
    }
    const id = window.setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [active, secondsLeft])

  return secondsLeft
}
