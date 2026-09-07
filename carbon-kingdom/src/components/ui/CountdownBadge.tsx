interface CountdownBadgeProps {
  secondsLeft: number
  timeoutSec: number
}

/** A small ticking "⏱ Ns" pill — turns coral and pulses once time is running low, as a visible cue that the score is decaying. */
export function CountdownBadge({ secondsLeft, timeoutSec }: CountdownBadgeProps) {
  const low = secondsLeft <= Math.min(2, timeoutSec)
  return (
    <span
      className={`inline-flex min-w-[3.2em] items-center justify-center gap-1 rounded-full px-3 py-1 font-heading text-sm tabular-nums transition-colors ${
        low ? 'animate-pulse bg-coral text-coral-ink' : 'bg-gold/25 text-gold-bright'
      }`}
    >
      ⏱ {Math.max(secondsLeft, 0)}s
    </span>
  )
}
