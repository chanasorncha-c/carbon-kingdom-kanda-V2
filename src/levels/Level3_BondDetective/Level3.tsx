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
import raw from '../../data/level3.questions.json'
import type { Level3Question } from '../../types/question3'
import { t } from '../../locales'
import { reportAnswer } from '../../services/gameplayBus'
import sceneArt from '../../assets/scenes/bondcave.webp'

const SCENE_STYLE: CSSProperties = {
  backgroundImage: `linear-gradient(180deg, rgba(4,10,8,.6), rgba(4,10,8,.8)), url(${sceneArt})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}

// The generated bank has 100 questions across all 3 levels; a single
// playthrough only draws ROUND_SIZE of them (shuffled, no repeats within
// the round) so a round stays roughly as long as before while replays see
// fresh variety.
const ROUND_SIZE = 15

const ALL_QUESTIONS = raw as unknown as Level3Question[]
const CORRECT_LINES = [t('feedback3.correct.1'), t('feedback3.correct.2')]
const WRONG_LINES = [t('feedback3.wrong.1'), t('feedback3.wrong.2')]

function pick(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)]
}

interface Level3Props {
  onComplete?: (finalScore: number, badges: string[]) => void
}

export function Level3({ onComplete }: Level3Props) {
  const [order] = useState(() => shuffle(ALL_QUESTIONS).slice(0, ROUND_SIZE))
  const [index, setIndex] = useState(0)
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [feedbackLine, setFeedbackLine] = useState<string>(t('level3.intro'))
  const [confettiKey, setConfettiKey] = useState(0)
  const [shakeKey, setShakeKey] = useState(0)
  const startRef = useRef<number>(Date.now())

  const { score, streak, badges, record, awardBadge, config } = useScore('level3')
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
    reportAnswer({ levelId: 'level3', questionId: q.id, difficulty: q.difficulty, correct: false, usedHint: false })
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
        <h2 className="font-display text-3xl text-mint-ink">{t('level3.complete.title')}</h2>
        <p className="mt-2 font-body text-slate-600">{t('level3.complete.body')}</p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="rounded-full bg-cream px-4 py-1 font-heading text-lg text-cream-ink shadow-soft">
            🏅 {t('level3.badge')}
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

  function handleChoose(choiceId: string) {
    if (status !== 'idle') return
    playClick()
    setChosenId(choiceId)
    const correct = choiceId === q.correctChoiceId
    const elapsed = Date.now() - startRef.current
    reportAnswer({ levelId: 'level3', questionId: q.id, difficulty: q.difficulty, correct, usedHint: false })
    if (correct) {
      setStatus('correct')
      setFeedbackLine(pick(CORRECT_LINES))
      setConfettiKey(k => k + 1)
      playCorrect()
      record('correct', elapsed)
      if (isLast) awardBadge(t('level3.badge'))
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
    setChosenId(null)
    setStatus('idle')
    setFeedbackLine(t('level3.intro'))
    startRef.current = Date.now()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-blob px-4 py-6" style={SCENE_STYLE}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-void/50 px-3 py-1 font-heading text-sm text-parchment">
        <span>{t('level3.scene')} — {t('level3.name')}</span>
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
        <p className="mt-2 text-center font-body text-sm text-slate-500">{q.prompt}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {q.choices.map(choice => {
          const isChosen = chosenId === choice.id
          const isCorrectChoice = choice.id === q.correctChoiceId
          let bg = 'bg-white/70'
          if (status !== 'idle' && isCorrectChoice) bg = 'bg-mint/85'
          else if (status === 'wrong' && isChosen) bg = 'bg-coral/75'
          return (
            <button
              key={choice.id}
              className={`min-h-[44px] rounded-blob px-4 py-3 font-heading text-slate-800 shadow-soft transition hover:scale-105 ${bg}`}
              onClick={() => handleChoose(choice.id)}
              disabled={status !== 'idle'}
            >
              {choice.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-blob p-4 shadow-soft ${status === 'correct' ? 'bg-mint/90' : 'bg-coral/85'}`}
          >
            <p className="font-heading text-slate-800">{feedbackLine}</p>
            <p className="mt-1 font-body text-sm text-slate-600">{q.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {status !== 'idle' && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            className="min-h-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105"
            onClick={handleNext}
          >
            {t('level3.next')}
          </button>
        </div>
      )}
    </div>
  )
}
