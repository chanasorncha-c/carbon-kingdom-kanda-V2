/**
 * Per-level scoring rules.
 *
 *  - Answering correctly awards `base` points, minus `decayPerSec` for every
 *    second that passes before the answer is submitted (so the fastest
 *    possible answer scores closest to `base`, and the score keeps ticking
 *    down the longer the student takes). The decay bottoms out at 0 well
 *    before `timeoutSec` on every level (every base/decayPerSec is ≤14s,
 *    comfortably under both the 30s timeout on levels 1-4 and the 120s
 *    timeout on level 5) — that's intentional: the rest of the answer
 *    window is just extra thinking time, not extra scoring room.
 *  - Level 5 ("IUPAC Castle") gets a much longer 120s timeout instead of
 *    the 30s every other level uses — its questions ask the player to
 *    build or type a full IUPAC name (multiple substituent prefixes +
 *    root), which genuinely takes longer to work out than a single
 *    multiple-choice pick.
 *  - Letting the clock run out at `timeoutSec` — or picking a wrong answer
 *    at any point before that — earns 0 points for the question and
 *    subtracts `penalty` from the running total.
 *  - The existing combo/streak multiplier (x1.2 at a 3-streak, x1.5 at 5,
 *    x2 at 10 — see useScore.ts) still applies on top of the decayed score
 *    for a correct answer; it does not apply to the penalty.
 */

export interface LevelScoreConfig {
  base: number
  timeoutSec: number
  penalty: number
}

export const SCORE_DECAY_PER_SEC = 10

export const LEVEL_SCORE_CONFIG: Record<string, LevelScoreConfig> = {
  level1: { base: 100, timeoutSec: 30, penalty: 60 },
  level2: { base: 110, timeoutSec: 30, penalty: 50 },
  level3: { base: 120, timeoutSec: 30, penalty: 40 },
  level4: { base: 130, timeoutSec: 30, penalty: 30 },
  level5: { base: 140, timeoutSec: 120, penalty: 20 }
}
