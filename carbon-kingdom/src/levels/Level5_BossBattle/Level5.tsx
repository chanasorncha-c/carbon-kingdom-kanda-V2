import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MoleculeCanvas } from '../../components/MoleculeCanvas/MoleculeCanvas'
import { KingIupac } from '../../components/characters/KingIupac'
import { Confetti } from '../../components/ui/Confetti'
import { CountdownBadge } from '../../components/ui/CountdownBadge'
import { useSynth } from '../../hooks/useSynth'
import { useScore } from '../../hooks/useScore'
import { useQuestionTimer } from '../../hooks/useQuestionTimer'
import { shuffle } from '../../utils/shuffle'
import raw from '../../data/level5.questions.json'
import type { Level5Question } from '../../types/question5'
import { t } from '../../locales'
import { reportAnswer } from '../../services/gameplayBus'
import sceneArt from '../../assets/scenes/castle.webp'

const SCENE_STYLE: CSSProperties = {
  backgroundImage: `linear-gradient(180deg, rgba(20,10,20,.55), rgba(10,6,14,.8)), url(${sceneArt})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}

// The generated bank has 100 questions; a single playthrough only draws
// ROUND_SIZE of them (shuffled, no repeats within the round) so a round
// stays roughly as long as before while replays see fresh variety.
const ROUND_SIZE = 15

const ALL_QUESTIONS = raw as unknown as Level5Question[]
const CORRECT_LINES = [t('feedback5.correct.1'), t('feedback5.correct.2')]
const WRONG_LINES = [t('feedback5.wrong.1'), t('feedback5.wrong.2')]

function pick(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)]
}

function normalize(str: string) {
  return str.toLowerCase().replace(/\s+/g, '').replace(/[–—]/g, '-')
}

interface Level5Props {
  onComplete?: (finalScore: number, badges: string[]) => void
}

export function Level5({ onComplete }: Level5Props) {
  const [order] = useState(() => shuffle(ALL_QUESTIONS).slice(0, ROUND_SIZE))
  const [index, setIndex] = useState(0)
  const [built, setBuilt] = useState<string[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [feedbackLine, setFeedbackLine] = useState<string>(t('level5.intro'))
  const [confettiKey, setConfettiKey] = useState(0)
  const [shakeKey, setShakeKey] = useState(0)
  const startRef = useRef<number>(Date.now())

  const { score, streak, badges, record, awardBadge, config } = useScore('level5')
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
    reportAnswer({ levelId: 'level5', questionId: q.id, difficulty: q.difficulty, correct: false, usedHint: false })
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
        <h2 className="font-display text-3xl text-mint-ink">{t('level5.complete.title')}</h2>
        <p className="mt-2 font-body text-slate-600">{t('level5.complete.body')}</p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="rounded-full bg-cream px-4 py-1 font-heading text-lg text-cream-ink shadow-soft">
            👑 {t('level5.badge')}
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

  const chunkById = new Map((q.chunks ?? []).map(c => [c.id, c]))
  const availableChunks = (q.chunks ?? []).filter(c => !built.includes(c.id))
  const builtNameSoFar = built.map(id => chunkById.get(id)?.text ?? '').join('')

  function resetQuestionState() {
    setBuilt([])
    setTypedAnswer('')
    setStatus('idle')
  }

  function grade(correct: boolean) {
    const elapsed = Date.now() - startRef.current
    reportAnswer({ levelId: 'level5', questionId: q.id, difficulty: q.difficulty, correct, usedHint: false })
    if (correct) {
      setStatus('correct')
      setFeedbackLine(pick(CORRECT_LINES))
      setConfettiKey(k => k + 1)
      playCorrect()
      record('correct', elapsed)
      if (isLast) awardBadge(t('level5.badge'))
    } else {
      setStatus('wrong')
      setFeedbackLine(pick(WRONG_LINES))
      setShakeKey(k => k + 1)
      playWrong()
      record('wrong', elapsed)
    }
  }

  function handleTapChunk(id: string) {
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

  function handleSubmitBuild() {
    if (status !== 'idle' || built.length === 0 || !q.correctChunkSequence) return
    const correct =
      built.length === q.correctChunkSequence.length && built.every((id, i) => id === q.correctChunkSequence![i])
    grade(correct)
  }

  function handleSubmitType() {
    if (status !== 'idle' || typedAnswer.trim() === '' || !q.acceptedAnswers) return
    const correct = q.acceptedAnswers.includes(normalize(typedAnswer))
    grade(correct)
  }

  function handleNext() {
    setIndex(i => i + 1)
    resetQuestionState()
    setFeedbackLine(t('level5.intro'))
    startRef.current = Date.now()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-blob px-4 py-6" style={SCENE_STYLE}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-void/50 px-3 py-1 font-heading text-sm text-parchment">
        <span>{t('level5.scene')} — {t('level5.name')}</span>
        <span>{progressLabel}</span>
        {status === 'idle' && <CountdownBadge secondsLeft={secondsLeft} timeoutSec={config.timeoutSec} />}
        <span>
          {t('level1.score')}: {score} {streak >= 3 && <span className="text-gold-bright">🔥x{streak}</span>}
        </span>
      </div>

      <KingIupac line={status === 'idle' ? feedbackLine : undefined} />

      <div className="relative rounded-blob bg-white/80 p-4 shadow-soft">
        <Confetti fire={status === 'correct'} key={confettiKey} />
        <motion.div
          key={shakeKey}
          animate={status === 'wrong' ? { x: [0, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
        >
          <MoleculeCanvas atoms={q.structure.atoms} bonds={q.structure.bonds} locantLabels={q.locantLabels} status={status} />
        </motion.div>
      </div>

      <p className="mx-auto w-fit rounded-full bg-void/50 px-3 py-1 text-center font-body text-sm text-parchment-dim">
        {q.mode === 'build' ? t('level5.build.prompt') : t('level5.type.prompt')}
      </p>

      {q.mode === 'build' && (
        <>
          <div className="rounded-blob bg-white/70 p-3 shadow-soft">
            <p className="mb-1 font-heading text-xs text-slate-700">{t('level5.build.yourName')}</p>
            <p className="min-h-[32px] font-mono text-lg text-slate-800">{builtNameSoFar || '—'}</p>
          </div>
          {status === 'idle' && (
            <div>
              <p className="mx-auto mb-2 w-fit rounded-full bg-void/50 px-3 py-1 text-center font-heading text-xs text-parchment-dim">
                {t('level5.build.pool')}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {availableChunks.map(chunk => (
                  <button
                    key={chunk.id}
                    className="min-h-[44px] rounded-blob bg-lavender/50 px-4 py-2 font-mono text-sm text-white shadow-soft transition hover:scale-105"
                    onClick={() => handleTapChunk(chunk.id)}
                  >
                    {chunk.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {q.mode === 'type' && status === 'idle' && (
        <div className="flex flex-col items-center gap-2">
          <input
            type="text"
            value={typedAnswer}
            onChange={e => setTypedAnswer(e.target.value)}
            placeholder={t('level5.type.placeholder')}
            className="min-h-[44px] w-full max-w-md rounded-full border-2 border-lavender bg-white px-4 py-2 text-center font-mono text-lg text-slate-800 shadow-soft focus:outline-none focus:ring-2 focus:ring-lavender"
            onKeyDown={e => e.key === 'Enter' && handleSubmitType()}
          />
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
                {t('level5.correctNameIs')}: {q.correctName}
              </p>
            )}
            <p className={`mt-1 font-body text-sm ${status === 'correct' ? 'text-slate-700' : 'text-[#fff]/90'}`}>{q.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {status === 'idle' ? (
          <>
            {q.mode === 'build' && (
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
                  {t('level5.clear')}
                </button>
              </>
            )}
            {q.mode === 'build' && (
              <button
                className="min-h-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105 disabled:opacity-40"
                onClick={handleSubmitBuild}
                disabled={built.length === 0}
              >
                {t('level5.submit')}
              </button>
            )}
            {q.mode === 'type' && (
              <button
                className="min-h-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105 disabled:opacity-40"
                onClick={handleSubmitType}
                disabled={typedAnswer.trim() === ''}
              >
                {t('level5.submit')}
              </button>
            )}
          </>
        ) : (
          <button
            className="min-h-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105"
            onClick={handleNext}
          >
            {t('level5.next')}
          </button>
        )}
      </div>
    </div>
  )
}
