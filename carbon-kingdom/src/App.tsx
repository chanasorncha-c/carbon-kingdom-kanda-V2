import { useEffect, useState } from 'react'
import { Level1 } from './levels/Level1_ChainHunt/Level1'
import { Level2 } from './levels/Level2_DirectionDuel/Level2'
import { Level3 } from './levels/Level3_BondDetective/Level3'
import { Level4 } from './levels/Level4_SubstituentMarket/Level4'
import { Level5 } from './levels/Level5_BossBattle/Level5'
import { PlayerSetup } from './components/PlayerSetup'
import { ModeSelect } from './components/multiplayer/ModeSelect'
import { RoomLobby } from './components/multiplayer/RoomLobby'
import { EndOfGameReport } from './components/report/EndOfGameReport'
import type { LevelResult } from './components/report/EndOfGameReport'
import { AvatarFace } from './components/ui/AvatarFace'
import { Carbie } from './components/characters/Carbie'
import { HydroChick } from './components/characters/HydroChick'
import { useRoom } from './hooks/useRoom'
import { useSessionLog } from './hooks/useSessionLog'
import { t } from './locales'
import type { LocaleKey } from './locales'
import type { Player } from './types/player'

interface LevelDef {
  id: string
  nameKey: LocaleKey
  color: 'mint' | 'lavender' | 'peach' | 'coral' | 'cream'
  Component: (props: { onComplete: (score: number, badges: string[]) => void }) => JSX.Element
}

const LEVELS: LevelDef[] = [
  { id: 'level1', nameKey: 'level1.name', color: 'mint', Component: Level1 },
  { id: 'level2', nameKey: 'level2.name', color: 'lavender', Component: Level2 },
  { id: 'level3', nameKey: 'level3.name', color: 'peach', Component: Level3 },
  { id: 'level4', nameKey: 'level4.name', color: 'coral', Component: Level4 },
  { id: 'level5', nameKey: 'level5.name', color: 'cream', Component: Level5 }
]

const COLOR_CLASSES: Record<LevelDef['color'], string> = {
  mint: 'bg-mint text-mint-ink',
  lavender: 'bg-lavender text-lavender-ink',
  peach: 'bg-peach text-peach-ink',
  coral: 'bg-coral text-coral-ink',
  cream: 'bg-cream text-cream-ink'
}

type Screen = 'setup' | 'modeSelect' | 'lobby' | 'home' | 'playing' | 'result' | 'report' | 'ended'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [player, setPlayer] = useState<Player | null>(null)
  const [activeLevelId, setActiveLevelId] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ score: number; badges: string[] } | null>(null)
  const [levelResults, setLevelResults] = useState<Record<string, { score: number; badges: string[] }>>({})
  const [joining, setJoining] = useState(false)

  const roomApi = useRoom()
  const sessionLog = useSessionLog()

  const activeLevel = LEVELS.find(l => l.id === activeLevelId)

  // once the teacher flips the room to "playing", every joined student moves
  // on from the lobby automatically
  useEffect(() => {
    if (screen === 'lobby' && roomApi.room?.status === 'playing') {
      setScreen('home')
    }
  }, [screen, roomApi.room?.status])

  // when the teacher ends the game, every joined student is bounced out
  // immediately — including mid-level — to a clear "game ended" screen,
  // rather than being left stranded in a room the teacher has closed.
  useEffect(() => {
    if (roomApi.code && roomApi.room?.status === 'ended' && screen !== 'ended' && screen !== 'report') {
      setScreen('ended')
    }
  }, [roomApi.code, roomApi.room?.status, screen])

  const levelResultList: LevelResult[] = LEVELS.map(l => ({
    id: l.id,
    nameKey: l.nameKey,
    score: levelResults[l.id]?.score ?? 0,
    badges: levelResults[l.id]?.badges ?? []
  }))

  return (
    <div className="min-h-screen font-body">
      <header className="no-print flex flex-wrap items-center justify-center gap-3 px-4 py-4 text-center">
        <h1 className="font-display text-2xl text-gold-bright drop-shadow-sm sm:text-4xl">👑 {t('app.title')}</h1>
        {player && (
          <span className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 shadow-soft">
            <AvatarFace color={player.avatarColor} size={28} />
            <span className="font-heading text-sm text-slate-700">{player.name}</span>
          </span>
        )}
      </header>

      <main className="pb-16">
        {screen === 'setup' && (
          <PlayerSetup
            onDone={p => {
              setPlayer(p)
              setScreen('modeSelect')
            }}
          />
        )}

        {screen === 'modeSelect' && player && (
          <ModeSelect
            joining={joining}
            joinError={roomApi.joinError}
            onSolo={() => setScreen('home')}
            onJoin={async code => {
              setJoining(true)
              const ok = await roomApi.joinRoom(code, player)
              setJoining(false)
              if (ok) setScreen('lobby')
            }}
          />
        )}

        {screen === 'lobby' && roomApi.room && (
          <RoomLobby
            room={roomApi.room}
            onLeave={async () => {
              await roomApi.leaveRoom()
              setScreen('modeSelect')
            }}
          />
        )}

        {screen === 'home' && player && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-6 rounded-blob bg-white/80 p-8 text-center shadow-soft">
            <div className="flex items-end gap-2">
              <Carbie />
              <HydroChick />
            </div>
            <p className="font-heading text-slate-700">{t('home.greeting', { name: player.name })}</p>
            {roomApi.room && (
              <p className="font-body text-xs text-slate-700">
                {t('lobby.roomCode')}: {roomApi.room.code}
              </p>
            )}
            <p className="font-body text-sm text-slate-700">{t('home.levelPicker')}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              {LEVELS.map((level, idx) => {
                // Progressive unlock only applies in multiplayer ("play with
                // others") rooms — a joined roomApi.code is what marks that.
                // Solo play keeps free level selection, same as before.
                const isMultiplayer = !!roomApi.code
                const completed = levelResults[level.id] !== undefined
                const unlocked = idx === 0 || levelResults[LEVELS[idx - 1].id] !== undefined
                const locked = isMultiplayer && !unlocked
                const replayBlocked = isMultiplayer && completed
                const disabled = locked || replayBlocked
                return (
                  <button
                    key={level.id}
                    disabled={disabled}
                    title={locked ? t('home.lockedHint') : undefined}
                    className={`min-h-[44px] rounded-full px-8 py-3 font-heading text-lg shadow-soft transition ${
                      disabled ? 'cursor-not-allowed opacity-50 grayscale' : 'hover:scale-105'
                    } ${COLOR_CLASSES[level.color]}`}
                    onClick={() => {
                      if (disabled) return
                      setActiveLevelId(level.id)
                      setScreen('playing')
                    }}
                  >
                    {t('home.playPrefix')}: {t(level.nameKey)}
                    {replayBlocked && <span className="ml-2">{t('home.completed')}</span>}
                    {locked && <span className="ml-2">{t('home.locked')}</span>}
                  </button>
                )
              })}
            </div>
            <button
              className="min-h-[44px] rounded-full bg-slate-200 px-6 py-2 font-heading text-sm text-slate-600 shadow-soft transition hover:scale-105"
              onClick={() => setScreen('report')}
            >
              📊 {t('home.viewReport')}
            </button>
          </div>
        )}

        {screen === 'playing' && activeLevel && (
          <activeLevel.Component
            onComplete={(score, badges) => {
              setLastResult({ score, badges })
              setLevelResults(prev => ({ ...prev, [activeLevel.id]: { score, badges } }))
              const levelIndex = LEVELS.findIndex(l => l.id === activeLevel.id)
              if (roomApi.code) void roomApi.reportLevelComplete(levelIndex, score, badges)
              setScreen('result')
            }}
          />
        )}

        {screen === 'result' && lastResult && (
          <div className="mx-auto max-w-lg space-y-4 rounded-blob bg-white/90 p-8 text-center shadow-soft">
            <h2 className="font-display text-2xl text-mint-ink">{t('result.title')}</h2>
            <p className="font-heading text-slate-700">
              {t('result.scoreLabel')}: {lastResult.score} · {t('result.badgesLabel')}:{' '}
              {lastResult.badges.join(', ') || t('result.noBadges')}
            </p>
            <button
              className="min-h-[44px] rounded-full bg-lavender px-6 py-2 font-heading text-lavender-ink shadow-soft transition hover:scale-105"
              onClick={() => setScreen('home')}
            >
              {t('common.backHome')}
            </button>
          </div>
        )}

        {screen === 'report' && player && (
          <EndOfGameReport
            player={player}
            levelResults={levelResultList}
            log={sessionLog.current}
            onBack={() => setScreen('home')}
          />
        )}

        {screen === 'ended' && player && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-6 rounded-blob bg-white/90 p-8 text-center shadow-soft">
            <h2 className="font-display text-2xl text-coral-ink">🔔 {t('ended.title')}</h2>
            <p className="font-body text-slate-600">{t('ended.body')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                className="min-h-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105"
                onClick={() => setScreen('report')}
              >
                📊 {t('home.viewReport')}
              </button>
              <button
                className="min-h-[44px] rounded-full bg-slate-200 px-6 py-2 font-heading text-slate-600 shadow-soft transition hover:scale-105"
                onClick={async () => {
                  await roomApi.leaveRoom()
                  setScreen('modeSelect')
                }}
              >
                {t('ended.backToMenu')}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
