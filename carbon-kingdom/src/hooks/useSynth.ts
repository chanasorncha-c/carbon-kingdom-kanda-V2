import { useCallback, useRef } from 'react'

/**
 * Tiny Web Audio synth for game feedback sounds — no audio files, so there's
 * nothing to load/fail-to-load and it works the instant the game starts.
 * Designed to sound cute and toy-like (short, bouncy, a little "cartoon")
 * rather than like harsh UI beeps — this is a kids' chemistry game.
 *
 *  - playClick  = a tiny bubble "pop" (quick downward pitch blip)
 *  - playCorrect = a bright 4-note ascending "ta-da!" arpeggio with a
 *    shimmering high sparkle note on top
 *  - playWrong  = a gentle cartoon "womp womp" — a soft downward pitch
 *    slide, not a harsh buzzer, so it reads as "not quite!" rather than
 *    a punishment
 */
export function useSynth() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new AC()
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  /** A single note: steady pitch (or a slide to `freqEnd`), quick attack, gentle decay. */
  const tone = useCallback(
    (
      ctx: AudioContext,
      freq: number,
      startAt: number,
      duration: number,
      type: OscillatorType,
      peakGain: number,
      freqEnd?: number
    ) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, startAt)
      if (freqEnd != null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), startAt + duration)
      }
      gain.gain.setValueAtTime(0, startAt)
      gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startAt)
      osc.stop(startAt + duration + 0.02)
    },
    []
  )

  const playCorrect = useCallback(() => {
    const ctx = getCtx()
    const now = ctx.currentTime
    // Bouncy little "ta-da!" — a rising major arpeggio (C6-E6-G6-C7) played
    // as quick, slightly overlapping bell-like blips, plus a soft high
    // sparkle grace note right at the top for extra sweetness.
    const notes = [1046.5, 1318.5, 1568.0, 2093.0]
    const step = 0.075
    notes.forEach((freq, i) => {
      tone(ctx, freq, now + i * step, 0.16, 'triangle', 0.16)
    })
    tone(ctx, 3136.0, now + notes.length * step + 0.02, 0.14, 'sine', 0.07)
  }, [getCtx, tone])

  const playWrong = useCallback(() => {
    const ctx = getCtx()
    const now = ctx.currentTime
    // Cute cartoon "womp womp" — two soft downward-sliding toots instead of
    // a harsh buzzer, so a wrong answer feels gently funny, not punishing.
    tone(ctx, 349.2, now, 0.16, 'triangle', 0.14, 233.1)
    tone(ctx, 293.7, now + 0.15, 0.22, 'triangle', 0.13, 174.6)
  }, [getCtx, tone])

  const playClick = useCallback(() => {
    const ctx = getCtx()
    const now = ctx.currentTime
    // Tiny bubble "pop" — a quick downward blip rather than a flat beep.
    tone(ctx, 900, now, 0.055, 'sine', 0.09, 550)
  }, [getCtx, tone])

  return { playCorrect, playWrong, playClick }
}
