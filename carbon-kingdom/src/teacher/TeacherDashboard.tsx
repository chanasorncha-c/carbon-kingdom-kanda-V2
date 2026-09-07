import { useEffect, useMemo, useState } from 'react'
import { useTeacherRoom } from '../hooks/useTeacherRoom'
import { useAllRooms } from '../hooks/useAllRooms'
import { AvatarFace } from '../components/ui/AvatarFace'
import { QUESTION_INDEX } from './questionIndex'
import { t } from '../locales'
import type { RoomMode, RoomPlayerState } from '../types/multiplayer'

const LEVEL_COUNT = 5
type LeaderboardScope = 'room' | 'all'

interface TeacherDashboardProps {
  /** Room code from the URL (#teacher/<CODE>) when this window is dedicated to one existing room. */
  initialRoomCode?: string | null
}

export function TeacherDashboard({ initialRoomCode = null }: TeacherDashboardProps) {
  const { room, code, error, creating, createRoomInNewWindow, setStatus, resetScores } = useTeacherRoom(initialRoomCode)
  const [mode, setMode] = useState<RoomMode>('class-race')
  const [scope, setScope] = useState<LeaderboardScope>('room')
  const [confirmingReset, setConfirmingReset] = useState(false)

  const allRooms = useAllRooms(scope === 'all')

  const players = useMemo(() => (room?.players ? Object.values(room.players) : []), [room])
  const leaderboard = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players])
  const needsHelp = players.filter(p => p.consecutiveWrong >= 3)

  const combinedLeaderboard = useMemo(() => {
    const rows: (RoomPlayerState & { roomCode: string })[] = []
    for (const r of allRooms) {
      for (const p of Object.values(r.players ?? {})) rows.push({ ...p, roomCode: r.code })
    }
    return rows.sort((a, b) => b.score - a.score)
  }, [allRooms])

  const topMisses = useMemo(() => {
    if (!room?.missedCounts) return []
    return Object.entries(room.missedCounts)
      .map(([questionId, count]) => ({ questionId, count, meta: QUESTION_INDEX.get(questionId) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [room])

  // a pending "are you sure?" reset auto-cancels itself after a few seconds,
  // and never carries over from a room the teacher has since left
  useEffect(() => {
    if (!confirmingReset) return
    const timer = window.setTimeout(() => setConfirmingReset(false), 4000)
    return () => window.clearTimeout(timer)
  }, [confirmingReset])
  useEffect(() => setConfirmingReset(false), [code])

  const handleResetClick = () => {
    if (confirmingReset) {
      setConfirmingReset(false)
      void resetScores()
    } else {
      setConfirmingReset(true)
    }
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-6">
      <h1 className="mb-4 text-center font-display text-3xl text-lavender-ink">👑 {t('teacher.title')}</h1>

      {!code && (
        <div className="mx-auto max-w-sm space-y-4 rounded-blob bg-white/90 p-6 text-center shadow-soft">
          <p className="font-heading text-slate-700">{t('teacher.selectMode')}</p>
          <div className="flex justify-center gap-3">
            <button
              className={`min-h-[44px] rounded-full px-5 py-2 font-heading shadow-soft transition hover:scale-105 ${mode === 'class-race' ? 'bg-mint text-mint-ink' : 'bg-slate-100 text-slate-500'}`}
              onClick={() => setMode('class-race')}
            >
              🏁 {t('teacher.classRace')}
            </button>
            <button
              className={`min-h-[44px] rounded-full px-5 py-2 font-heading shadow-soft transition hover:scale-105 ${mode === 'team-battle' ? 'bg-coral text-coral-ink' : 'bg-slate-100 text-slate-500'}`}
              onClick={() => setMode('team-battle')}
            >
              ⚔️ {t('teacher.teamBattle')}
            </button>
          </div>
          <button
            className="min-h-[44px] w-full rounded-full bg-lavender px-6 py-3 font-heading text-lavender-ink shadow-soft transition hover:scale-105 disabled:opacity-50"
            onClick={() => createRoomInNewWindow(mode)}
            disabled={creating}
          >
            {creating ? '...' : t('teacher.createRoom')}
          </button>
          {error && (
            <div className="rounded-blob bg-coral/20 p-3 text-left">
              <p className="font-heading text-sm text-coral-ink">สร้างห้องไม่สำเร็จ</p>
              <p className="mt-1 break-words font-body text-xs text-slate-600">{error}</p>
              <p className="mt-2 font-body text-xs text-slate-500">
                ส่วนใหญ่เกิดจาก Realtime Database Rules ยังไม่เปิดให้อ่าน/เขียน หรือ databaseURL ผิด — ดู SETUP.md
              </p>
            </div>
          )}
        </div>
      )}

      {code && (
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col items-center gap-2 rounded-blob bg-white/90 p-6 text-center shadow-soft">
            <p className="font-heading text-sm text-slate-500">{t('teacher.roomCodeLabel')}</p>
            <p className="font-display text-5xl tracking-widest text-lavender-ink">{code}</p>
            {room ? (
              <p className="font-body text-sm text-slate-500">
                {room.mode === 'team-battle' ? t('lobby.modeTeam') : t('lobby.modeRace')} ·{' '}
                {room.status === 'lobby' ? t('teacher.status.lobby') : room.status === 'playing' ? t('teacher.status.playing') : t('teacher.status.ended')}
              </p>
            ) : (
              <p className="font-body text-sm text-slate-400">กำลังเชื่อมต่อห้อง...</p>
            )}
            {error && (
              <div className="w-full rounded-blob bg-coral/20 p-3 text-left">
                <p className="font-heading text-sm text-coral-ink">มีปัญหาการเชื่อมต่อ</p>
                <p className="mt-1 break-words font-body text-xs text-slate-600">{error}</p>
              </div>
            )}
            <div className="mt-2 flex gap-3">
              {room && room.status !== 'playing' && (
                <button
                  className="min-h-[44px] rounded-full bg-mint px-5 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105"
                  onClick={() => setStatus('playing')}
                >
                  ▶ {t('teacher.start')}
                </button>
              )}
              {room && room.status === 'playing' && (
                <button
                  className="min-h-[44px] rounded-full bg-coral px-5 py-2 font-heading text-coral-ink shadow-soft transition hover:scale-105"
                  onClick={() => setStatus('ended')}
                >
                  ⏹ {t('teacher.end')}
                </button>
              )}
              <button
                className="min-h-[44px] rounded-full bg-slate-200 px-5 py-2 font-heading text-slate-600 shadow-soft transition hover:scale-105 disabled:opacity-50"
                onClick={() => createRoomInNewWindow(mode)}
                disabled={creating}
              >
                {creating ? '...' : t('teacher.newRoom')}
              </button>
              <button
                className={`min-h-[44px] rounded-full px-5 py-2 font-heading shadow-soft transition hover:scale-105 ${
                  confirmingReset ? 'bg-coral text-coral-ink' : 'bg-slate-200 text-slate-600'
                }`}
                onClick={handleResetClick}
              >
                {confirmingReset ? `⚠️ ${t('teacher.resetScoresConfirm')}` : `🧹 ${t('teacher.resetScores')}`}
              </button>
            </div>
          </div>

          {needsHelp.length > 0 && (
            <div className="rounded-blob bg-coral/30 p-4 shadow-soft">
              <p className="font-heading text-coral-ink">🚨 {t('teacher.alertTitle')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {needsHelp.map(p => (
                  <span key={p.id} className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 shadow-soft">
                    <AvatarFace color={p.avatarColor} size={22} />
                    <span className="font-heading text-sm text-slate-700">{p.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-blob bg-white/90 p-4 shadow-soft">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-lg text-slate-700">🏆 {t('teacher.leaderboard')}</h2>
              <div className="flex gap-1 rounded-full bg-slate-100 p-1">
                <button
                  className={`rounded-full px-3 py-1 text-xs font-heading transition ${
                    scope === 'room' ? 'bg-mint text-mint-ink shadow-soft' : 'text-slate-500'
                  }`}
                  onClick={() => setScope('room')}
                >
                  {t('teacher.viewScope.room')}
                </button>
                <button
                  className={`rounded-full px-3 py-1 text-xs font-heading transition ${
                    scope === 'all' ? 'bg-mint text-mint-ink shadow-soft' : 'text-slate-500'
                  }`}
                  onClick={() => setScope('all')}
                >
                  {t('teacher.viewScope.all')}
                </button>
              </div>
            </div>
            {scope === 'room' ? (
              leaderboard.length === 0 ? (
                <p className="font-body text-sm text-slate-400">{t('teacher.noPlayers')}</p>
              ) : (
                <div className="space-y-1">
                  {leaderboard.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-full bg-cream/50 px-3 py-1.5">
                      <span className="w-6 text-center font-heading text-sm text-slate-500">{i + 1}</span>
                      <AvatarFace color={p.avatarColor} size={24} />
                      <span className="flex-1 font-heading text-sm text-slate-700">{p.name}</span>
                      {p.team && (
                        <span className={`rounded-full px-2 text-xs font-heading ${p.team === 'A' ? 'bg-mint text-mint-ink' : 'bg-coral text-coral-ink'}`}>
                          {p.team === 'A' ? t('teacher.teamA') : t('teacher.teamB')}
                        </span>
                      )}
                      <span className="font-heading text-sm text-slate-700">{p.score} pts</span>
                    </div>
                  ))}
                </div>
              )
            ) : combinedLeaderboard.length === 0 ? (
              <p className="font-body text-sm text-slate-400">{t('teacher.noPlayers')}</p>
            ) : (
              <div className="space-y-1">
                {combinedLeaderboard.map((p, i) => (
                  <div key={`${p.roomCode}-${p.id}`} className="flex items-center gap-2 rounded-full bg-cream/50 px-3 py-1.5">
                    <span className="w-6 text-center font-heading text-sm text-slate-500">{i + 1}</span>
                    <AvatarFace color={p.avatarColor} size={24} />
                    <span className="flex-1 truncate font-heading text-sm text-slate-700">{p.name}</span>
                    <span className="whitespace-nowrap rounded-full bg-slate-200 px-2 text-[11px] font-heading text-slate-500">
                      {t('teacher.roomTag', { code: p.roomCode })}
                    </span>
                    {p.team && (
                      <span className={`rounded-full px-2 text-xs font-heading ${p.team === 'A' ? 'bg-mint text-mint-ink' : 'bg-coral text-coral-ink'}`}>
                        {p.team === 'A' ? t('teacher.teamA') : t('teacher.teamB')}
                      </span>
                    )}
                    <span className="font-heading text-sm text-slate-700">{p.score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-blob bg-white/90 p-4 shadow-soft">
            <h2 className="mb-2 font-heading text-lg text-slate-700">📈 {t('teacher.progressGrid')}</h2>
            {players.length === 0 ? (
              <p className="font-body text-sm text-slate-400">{t('teacher.noPlayers')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left font-heading text-slate-500">
                      <th className="py-1 pr-2">Student</th>
                      {Array.from({ length: LEVEL_COUNT }).map((_, i) => (
                        <th key={i} className="px-1 text-center">L{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(p => (
                      <tr key={p.id}>
                        <td className="py-1 pr-2 font-heading text-slate-700">{p.name}</td>
                        {Array.from({ length: LEVEL_COUNT }).map((_, i) => (
                          <td key={i} className="px-1 text-center">
                            <span
                              className={`inline-block h-4 w-4 rounded-full ${
                                p.currentLevelIndex > i ? 'bg-mint' : p.currentLevelIndex === i ? 'bg-peach' : 'bg-slate-200'
                              }`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-blob bg-white/90 p-4 shadow-soft">
            <h2 className="mb-2 font-heading text-lg text-slate-700">🔥 {t('teacher.heatmap')}</h2>
            {topMisses.length === 0 ? (
              <p className="font-body text-sm text-slate-400">{t('teacher.noMisses')}</p>
            ) : (
              <div className="space-y-1">
                {topMisses.map(m => (
                  <div key={m.questionId} className="flex items-center gap-2 rounded-lg bg-coral/10 px-3 py-1.5">
                    <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-heading text-coral-ink">{m.count}×</span>
                    <span className="font-body text-xs text-slate-500">
                      {m.meta ? t(m.meta.levelNameKey) : ''} — {m.questionId}
                    </span>
                    <span className="flex-1 truncate font-body text-xs text-slate-600">{m.meta?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
