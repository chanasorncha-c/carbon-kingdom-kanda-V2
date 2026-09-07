import { useMemo } from 'react'
import type { AnswerEvent } from '../../services/gameplayBus'
import type { Player } from '../../types/player'
import { t } from '../../locales'
import type { LocaleKey } from '../../locales'

export interface LevelResult {
  id: string
  nameKey: LocaleKey
  score: number
  badges: string[]
}

interface LevelStat {
  id: string
  nameKey: LocaleKey
  answered: number
  correct: number
  wrong: number
  accuracy: number
  score: number
  badges: string[]
}

function buildLevelStats(levels: LevelResult[], log: AnswerEvent[]): LevelStat[] {
  return levels.map(lvl => {
    const events = log.filter(e => e.levelId === lvl.id)
    const answered = events.length
    const correct = events.filter(e => e.correct).length
    const wrong = answered - correct
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
    return { id: lvl.id, nameKey: lvl.nameKey, answered, correct, wrong, accuracy, score: lvl.score, badges: lvl.badges }
  })
}

function toCsv(playerName: string, stats: LevelStat[], totalScore: number): string {
  const header = ['Player', 'Level', 'Questions Answered', 'Correct', 'Wrong', 'Accuracy %', 'Score', 'Badges']
  const rows = stats.map(s => [
    playerName,
    t(s.nameKey),
    String(s.answered),
    String(s.correct),
    String(s.wrong),
    String(s.accuracy),
    String(s.score),
    s.badges.join('; ')
  ])
  rows.push([playerName, 'TOTAL', '', '', '', '', String(totalScore), ''])
  return [header, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface EndOfGameReportProps {
  player: Player
  levelResults: LevelResult[]
  log: AnswerEvent[]
  onBack: () => void
}

export function EndOfGameReport({ player, levelResults, log, onBack }: EndOfGameReportProps) {
  const stats = useMemo(() => buildLevelStats(levelResults, log), [levelResults, log])
  const totalScore = levelResults.reduce((sum, l) => sum + l.score, 0)
  const allBadges = [...new Set(levelResults.flatMap(l => l.badges))]
  const weakLevels = stats.filter(s => s.answered > 0 && s.accuracy < 70)

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="print-area space-y-4 rounded-blob bg-white/95 p-6 shadow-soft">
        <h2 className="font-display text-2xl text-lavender-ink">{t('report.title')}</h2>
        <p className="font-heading text-slate-700">{t('report.playerLabel')}: {player.name}</p>
        <p className="font-heading text-slate-700">{t('report.totalScore')}: {totalScore}</p>
        <p className="font-body text-sm text-slate-600">
          {t('report.badgesLabel')}: {allBadges.length ? allBadges.join(', ') : t('result.noBadges')}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-lavender/40 font-heading text-slate-600">
                <th className="py-2 pr-2">{t('report.col.level')}</th>
                <th className="px-2">{t('report.col.answered')}</th>
                <th className="px-2">{t('report.col.correct')}</th>
                <th className="px-2">{t('report.col.wrong')}</th>
                <th className="px-2">{t('report.col.accuracy')}</th>
                <th className="pl-2">{t('report.col.score')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.id} className="border-b border-lavender/20 font-body text-slate-700">
                  <td className="py-2 pr-2">{t(s.nameKey)}</td>
                  <td className="px-2">{s.answered}</td>
                  <td className="px-2 text-mint-ink">{s.correct}</td>
                  <td className="px-2 text-coral-ink">{s.wrong}</td>
                  <td className="px-2">{s.answered > 0 ? `${s.accuracy}%` : '—'}</td>
                  <td className="pl-2">{s.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {weakLevels.length > 0 && (
          <div className="rounded-blob bg-peach/30 p-3 text-left">
            <p className="font-heading text-sm text-peach-ink">{t('report.suggestTitle')}</p>
            <p className="font-body text-sm text-slate-700">
              {weakLevels.map(s => t(s.nameKey)).join(', ')} — {t('report.suggestBody')}
            </p>
          </div>
        )}
      </div>

      <div className="no-print flex flex-wrap items-center justify-center gap-3">
        <button
          className="min-h-[44px] rounded-full bg-lavender px-5 py-2 font-heading text-lavender-ink shadow-soft transition hover:scale-105"
          onClick={() => downloadCsv(`carbon-kingdom-report-${player.name}.csv`, toCsv(player.name, stats, totalScore))}
        >
          ⬇ {t('report.exportCsv')}
        </button>
        <button
          className="min-h-[44px] rounded-full bg-peach px-5 py-2 font-heading text-peach-ink shadow-soft transition hover:scale-105"
          onClick={() => window.print()}
        >
          🖨 {t('report.print')}
        </button>
        <button
          className="min-h-[44px] rounded-full bg-mint px-5 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105"
          onClick={onBack}
        >
          {t('common.backHome')}
        </button>
      </div>
    </div>
  )
}
