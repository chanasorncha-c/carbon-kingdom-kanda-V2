import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MoleculeCanvas } from '../../components/MoleculeCanvas/MoleculeCanvas'
import { Carbie } from '../../components/characters/Carbie'
import { Chloro } from '../../components/characters/Chloro'
import { Confetti } from '../../components/ui/Confetti'
import { CountdownBadge } from '../../components/ui/CountdownBadge'
import { useSynth } from '../../hooks/useSynth'
import { useScore } from '../../hooks/useScore'
import { useQuestionTimer } from '../../hooks/useQuestionTimer'
import { shuffle } from '../../utils/shuffle'
import raw from '../../data/level1.questions.json'
import type { Level1Question } from '../../types/question'
import { t } from '../../locales'
import { reportAnswer } from '../../services/gameplayBus'
import sceneArt from '../../assets/scenes/forest.webp'

const SCENE_STYLE: CSSProperties = {
  backgroundImage: `linear-gradient(180deg, rgba(10,20,12,.55), rgba(6,12,8,.78)), url(${sceneArt})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}

// The pool has 25 questions; a single playthrough only draws ROUND_SIZE of
// them (shuffled, no repeats within the round) so a round stays a
// reasonable length while replays see a different subset.
const ROUND_SIZE = 15

const ALL_QUESTIONS = raw as unknown as Level1Question[]

const CORRECT_LINES = [t('feedback.correct.1'), t('feedback.correct.2'), t('feedback.correct.3')]
const WRONG_LINES = [t('feedback.wrong.1'), t('feedback.wrong.2'), t('feedback.wrong.3')]

function pick(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)]
}

function sameChain(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  return b.every(id => setA.has(id))
}

function isAdjacent(q: Level1Question, aId: string, bId: string) {
  return q.structure.bonds.some(bd => (bd.from === aId && bd.to === bId) || (bd.from === bId && bd.to === aId))
}

interface Level1Props {
  onComplete?: (finalScore: number, badges: string[]) => void
}

export function Level1({ onComplete }: Level1Props) {
  const [order] = useState(() => shuffle(ALL_QUESTIONS).slice(0, ROUND_SIZE))
  const [index, setIndex] = useState(0)
  const [path, setPath] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [feedbackLine, setFeedbackLine] = useState<string>(t('level1.intro'))
  const [confettiKey, setConfettiKey] = useState(0)
  const [shakeKey, setShakeKey] = useState(0)
  const startRef = useRef<number>(Date.now())

  const { score, streak, badges, record, awardBadge, config } = useScore('level1')
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
    reportAnswer({ levelId: 'level1', questionId: q.id, difficulty: q.difficulty, correct: false, usedHint: false })
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
        <h2 className="font-display text-3xl text-mint-ink">{t('level1.complete.title')}</h2>
        <p className="mt-2 font-body text-slate-600">{t('level1.complete.body')}</p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="rounded-full bg-cream px-4 py-1 font-heading text-lg text-cream-ink shadow-soft">
            🏅 {t('level1.badge')}
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

  function handleAtomClick(id: string) {
    if (status !== 'idle') return
    playClick()
    setPath(prev => {
      if (prev.length === 0) return [id]
      const last = prev[prev.length - 1]
      if (id === last) return prev
      // tap the previous atom again to undo one step
      if (prev.length >= 2 && prev[prev.length - 2] === id) return prev.slice(0, -1)
      if (prev.includes(id)) return prev // no revisiting mid-chain
      if (!isAdjacent(q, last, id)) return prev // must extend along a real bond
      return [...prev, id]
    })
  }

  function handleClear() {
    if (status !== 'idle') return
    setPath([])
  }

  function handleSubmit() {
    if (status !== 'idle' || path.length < 2) return
    const correct = sameChain(path, q.answer)
    const elapsed = Date.now() - startRef.current
    reportAnswer({ levelId: 'level1', questionId: q.id, difficulty: q.difficulty, correct, usedHint: false })
    if (correct) {
      setStatus('correct')
      setFeedbackLine(pick(CORRECT_LINES))
      setConfettiKey(k => k + 1)
      playCorrect()
      record('correct', elapsed)
      if (isLast) awardBadge(t('level1.badge'))
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
    setPath([])
    setStatus('idle')
    setFeedbackLine(t('level1.intro'))
    startRef.current = Date.now()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-blob px-4 py-6" style={SCENE_STYLE}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-void/50 px-3 py-1 font-heading text-sm text-parchment">
        <span>{t('level1.scene')} — {t('level1.name')}</span>
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
          <MoleculeCanvas
            atoms={q.structure.atoms}
            bonds={q.structure.bonds}
            selectedPath={path}
            revealPath={status === 'wrong' ? q.answer : undefined}
            onAtomClick={handleAtomClick}
            status={status}
          />
        </motion.div>
        <p className="mt-2 text-center font-body text-sm text-slate-700">{q.prompt}</p>
      </div>

      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-blob p-4 shadow-soft ${status === 'correct' ? 'bg-mint/90' : 'bg-coral/75'}`}
          >
            <p className={`font-heading ${status === 'correct' ? 'text-slate-800' : 'text-[#fff]'}`}>{feedbackLine}</p>
            <p className={`mt-1 font-body text-sm ${status === 'correct' ? 'text-slate-700' : 'text-[#fff]/90'}`}>{q.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {q.isHorizontalTrap && status === 'idle' && path.length === 0 && (
        <div className="opacity-70">
          <Chloro line={t('level1.chloroTaunt')} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {status === 'idle' ? (
          <>
            <button
              className="min-h-[44px] min-w-[44px] rounded-full bg-lavender px-5 py-2 font-heading text-lavender-ink shadow-soft transition hover:scale-105 disabled:opacity-40"
              onClick={handleClear}
              disabled={path.length === 0}
            >
              {t('level1.clear')}
            </button>
            <button
              className="min-h-[44px] min-w-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105 disabled:opacity-40"
              onClick={handleSubmit}
              disabled={path.length < 2}
            >
              {t('level1.submit')}
            </button>
          </>
        ) : (
          <button
            className="min-h-[44px] min-w-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105"
            onClick={handleNext}
          >
            {t('level1.next')}
          </button>
        )}
      </div>
    </div>
  )
}
