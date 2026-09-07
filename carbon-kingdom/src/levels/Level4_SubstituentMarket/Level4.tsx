import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MoleculeCanvas } from '../../components/MoleculeCanvas/MoleculeCanvas'
import { Carbie } from '../../components/characters/Carbie'
import { Confetti } from '../../components/ui/Confetti'
import { CountdownBadge } from '../../components/ui/CountdownBadge'
import { useSynth } from '../../hooks/useSynth'
import { useScore } from '../../hooks/useScore'
import { useQuestionTimer } from '../../hooks/useQuestionTimer'
import { shuffle } from '../../utils/shuffle'
import raw from '../../data/level4.questions.json'
import type { Level4Question } from '../../types/question4'
import { t } from '../../locales'
import { reportAnswer } from '../../services/gameplayBus'
import sceneArt from '../../assets/scenes/market.webp'

const SCENE_STYLE: CSSProperties = {
  backgroundImage: `linear-gradient(180deg, rgba(20,14,6,.5), rgba(12,8,4,.75)), url(${sceneArt})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}

// The generated bank has 100 questions; a single playthrough only draws
// ROUND_SIZE of them (shuffled, no repeats within the round) so a round
// stays roughly as long as before while replays see fresh variety.
const ROUND_SIZE = 15

const ALL_QUESTIONS = raw as unknown as Level4Question[]
const CORRECT_LINES = [t('feedback4.correct.1'), t('feedback4.correct.2')]
const WRONG_LINES = [t('feedback4.wrong.1'), t('feedback4.wrong.2')]

function pick(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)]
}

interface Level4Props {
  onComplete?: (finalScore: number, badges: string[]) => void
}

export function Level4({ onComplete }: Level4Props) {
  const [order] = useState(() => shuffle(ALL_QUESTIONS).slice(0, ROUND_SIZE))
  const [index, setIndex] = useState(0)
  const [built, setBuilt] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [feedbackLine, setFeedbackLine] = useState<string>(t('level4.intro'))
  const [confettiKey, setConfettiKey] = useState(0)
  const [shakeKey, setShakeKey] = useState(0)
  const startRef = useRef<number>(Date.now())

  const { score, streak, badges, record, awardBadge, config } = useScore('level4')
  const { playCorrect, playWrong, playClick } = useSynth()

  const q = order[index]
  const isLast = index === order.length - 1
  const done = index >= order.length

  const progressLabel = useMemo(
    () => t('level1.progress', { current: Math.min(index + 1, order.length), total: order.length }),
    [index, order.length]
  )

  function handleTimeout() {
    if (status !== 'idle') return
    reportAnswer({ levelId: 'level4', questionId: q.id, difficulty: q.difficulty, correct: false, usedHint: false })
    setStatus('wrong')
    setFeedbackLine(t('feedback.timeout'))
    setShakeKey(k => k + 1)
    playWrong()
    record('wrong', config.timeoutSec * 1000)
  }

  const secondsLeft = useQuestionTimer(config.timeoutSec, status === 'idle' && !done, index, handleTimeout)

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-blob bg-white/90 p-8 text-center shadow-soft">
        <h2 className="font-display text-3xl text-mint-ink">{t('level4.complete.title')}</h2>
        <p className="mt-2 font-body text-slate-600">{t('level4.complete.body')}</p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="rounded-full bg-cream px-4 py-1 font-heading text-lg text-cream-ink shadow-soft">
            🏅 {t('level4.badge')}
          </span>
          <span className="font-heading text-2xl text-slate-700">
            {t('level1.score')}: {score}
          </span>
        </div>
        <button
          className="mt-6 min-h-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105"
          onClick={() => onComplete?.(score, badges)}
        >
          {t('common.continue')}
        </button>
      </div>
    )
  }

  const cardById = new Map(q.cards.map(c => [c.id, c]))
  const availableCards = q.cards.filter(c => !built.includes(c.id))

  function handleTapCard(id: string) {
    if (status !== 'idle') return
    playClick()
    setBuilt(prev => [...prev, id])
  }

  function handleUndo() {
    if (status !== 'idle') return
    setBuilt(prev => prev.slice(0, -1))
  }

  function handleClear() {
    if (status !== 'idle') return
    setBuilt([])
  }

  function handleSubmit() {
    if (status !== 'idle' || built.length === 0) return
    const correct = built.length === q.correctSequence.length && built.every((id, i) => id === q.correctSequence[i])
    const elapsed = Date.now() - startRef.current
    reportAnswer({ levelId: 'level4', questionId: q.id, difficulty: q.difficulty, correct, usedHint: false })
    if (correct) {
      setStatus('correct')
      setFeedbackLine(pick(CORRECT_LINES))
      setConfettiKey(k => k + 1)
      playCorrect()
      record('correct', elapsed)
      if (isLast) awardBadge(t('level4.badge'))
    } else {
      setStatus('wrong')
      setFeedbackLine(pick(WRONG_LINES))
      setShakeKey(k => k + 1)
      playWrong()
      record('wrong', elapsed)
    }
  }

  function handleNext() {
    setIndex(i => i + 1)
    setBuilt([])
    setStatus('idle')
    setFeedbackLine(t('level4.intro'))
    startRef.current = Date.now()
  }

  const correctLabelSeq = q.correctSequence.map(id => q.cards.find(c => c.id === id)?.label).join(' + ')

  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-blob px-4 py-6" style={SCENE_STYLE}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-void/50 px-3 py-1 font-heading text-sm text-parchment">
        <span>{t('level4.scene')} — {t('level4.name')}</span>
        <span>{progressLabel}</span>
        {status === 'idle' && <CountdownBadge secondsLeft={secondsLeft} timeoutSec={config.timeoutSec} />}
        <span>
          {t('level1.score')}: {score} {streak >= 3 && <span className="text-gold-bright">🔥x{streak}</span>}
        </span>
      </div>

      <Carbie line={status === 'idle' ? feedbackLine : undefined} />

      <div className="relative rounded-blob bg-white/80 p-4 shadow-soft">
        <Confetti fire={status === 'correct'} key={confettiKey} />
        <motion.div
          key={shakeKey}
          animate={status === 'wrong' ? { x: [0, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
        >
          <MoleculeCanvas atoms={q.structure.atoms} bonds={q.structure.bonds} status={status} />
        </motion.div>
        <p className="mt-2 text-center font-body text-sm text-slate-700">{q.prompt}</p>
      </div>

      <div className="rounded-blob bg-white/70 p-3 shadow-soft">
        <p className="mb-1 font-heading text-xs text-slate-700">{t('level4.yourAnswer')}</p>
        <div className="flex min-h-[44px] flex-wrap items-center gap-2">
          {built.length === 0 && <span className="font-body text-sm text-slate-600">—</span>}
          {built.map((id, i) => (
            <span key={`${id}-${i}`} className="rounded-full bg-cream px-3 py-1 font-heading text-sm text-cream-ink shadow-soft">
              {i + 1}. {cardById.get(id)?.label}
            </span>
          ))}
        </div>
      </div>

      {status === 'idle' && (
        <div>
          <p className="mx-auto mb-2 w-fit rounded-full bg-void/50 px-3 py-1 text-center font-heading text-xs text-parchment-dim">
            {t('level4.availableCards')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {availableCards.map(card => (
              <button
                key={card.id}
                className="min-h-[44px] rounded-blob bg-lavender/50 px-4 py-2 font-heading text-white shadow-soft transition hover:scale-105"
                onClick={() => handleTapCard(card.id)}
              >
                {card.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-blob p-4 shadow-soft ${status === 'correct' ? 'bg-mint/90' : 'bg-coral/75'}`}
          >
            <p className={`font-heading ${status === 'correct' ? 'text-slate-800' : 'text-[#fff]'}`}>{feedbackLine}</p>
            {status === 'wrong' && (
              <p className="mt-1 font-heading text-sm text-[#fff]">
                {t('level4.correctSequence')}: {correctLabelSeq || '—'}
              </p>
            )}
            <p className={`mt-1 font-body text-sm ${status === 'correct' ? 'text-slate-700' : 'text-[#fff]/90'}`}>{q.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {status === 'idle' ? (
          <>
            <button
              className="min-h-[44px] rounded-full bg-lavender px-5 py-2 font-heading text-lavender-ink shadow-soft transition hover:scale-105 disabled:opacity-40"
              onClick={handleUndo}
              disabled={built.length === 0}
            >
              ↩
            </button>
            <button
              className="min-h-[44px] rounded-full bg-lavender px-5 py-2 font-heading text-lavender-ink shadow-soft transition hover:scale-105 disabled:opacity-40"
              onClick={handleClear}
              disabled={built.length === 0}
            >
              {t('level4.clear')}
            </button>
            <button
              className="min-h-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105 disabled:opacity-40"
              onClick={handleSubmit}
              disabled={built.length === 0}
            >
              {t('level4.submit')}
            </button>
          </>
        ) : (
          <button
            className="min-h-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105"
            onClick={handleNext}
          >
            {t('level4.next')}
          </button>
        )}
      </div>
    </div>
  )
}
