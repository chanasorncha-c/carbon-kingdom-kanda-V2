import { AvatarFace } from '../ui/AvatarFace'
import type { RoomState } from '../../types/multiplayer'
import { t } from '../../locales'

interface RoomLobbyProps {
  room: RoomState
  onLeave: () => void
}

export function RoomLobby({ room, onLeave }: RoomLobbyProps) {
  const players = Object.values(room.players ?? {}).sort((a, b) => a.connectedAt - b.connectedAt)

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-blob bg-white/85 p-8 text-center shadow-soft">
      <p className="font-heading text-sm text-slate-500">{t('lobby.roomCode')}</p>
      <p className="font-display text-4xl tracking-widest text-lavender-ink">{room.code}</p>
      <p className="font-body text-sm text-slate-500">
        {room.mode === 'team-battle' ? t('lobby.modeTeam') : t('lobby.modeRace')} · {t('lobby.waiting')}
      </p>

      <div className="flex w-full flex-wrap justify-center gap-2">
        {players.map(p => (
          <span key={p.id} className="flex items-center gap-1 rounded-full bg-cream/70 px-3 py-1 shadow-soft">
            <AvatarFace color={p.avatarColor} size={24} />
            <span className="font-heading text-sm text-slate-700">{p.name}</span>
            {p.team && (
              <span className={`ml-1 rounded-full px-2 text-xs font-heading ${p.team === 'A' ? 'bg-mint text-mint-ink' : 'bg-coral text-coral-ink'}`}>
                {p.team}
              </span>
            )}
          </span>
        ))}
        {players.length === 0 && <span className="font-body text-sm text-slate-400">—</span>}
      </div>

      <button
        className="min-h-[44px] rounded-full bg-slate-200 px-6 py-2 font-heading text-slate-600 shadow-soft transition hover:scale-105"
        onClick={onLeave}
      >
        {t('lobby.leave')}
      </button>
    </div>
  )
}
