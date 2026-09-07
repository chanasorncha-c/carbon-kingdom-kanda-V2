import { useState } from 'react'
import { t } from '../../locales'

interface ModeSelectProps {
  onSolo: () => void
  onJoin: (code: string) => void
  joinError?: string | null
  joining?: boolean
}

export function ModeSelect({ onSolo, onJoin, joinError, joining }: ModeSelectProps) {
  const [showJoin, setShowJoin] = useState(false)
  const [code, setCode] = useState('')

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-blob bg-white/85 p-8 text-center shadow-soft">
      <h2 className="font-heading text-xl text-slate-700">{t('mode.title')}</h2>

      {!showJoin ? (
        <div className="flex w-full flex-col gap-3">
          <button
            className="min-h-[44px] rounded-full bg-mint px-6 py-3 font-heading text-mint-ink shadow-soft transition hover:scale-105"
            onClick={onSolo}
          >
            🧑‍🎓 {t('mode.solo')}
          </button>
          <button
            className="min-h-[44px] rounded-full bg-lavender px-6 py-3 font-heading text-lavender-ink shadow-soft transition hover:scale-105"
            onClick={() => setShowJoin(true)}
          >
            🏫 {t('mode.joinClass')}
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="font-body text-sm text-slate-700">{t('mode.joinHint')}</p>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
            className="min-h-[44px] w-40 rounded-full border-2 border-lavender/60 bg-white px-4 py-2 text-center font-mono text-2xl tracking-widest text-slate-800 outline-none focus:border-lavender"
          />
          {joinError && <p className="font-body text-sm text-coral-ink">{joinError}</p>}
          <div className="flex gap-3">
            <button
              className="min-h-[44px] rounded-full bg-slate-200 px-5 py-2 font-heading text-slate-600 shadow-soft transition hover:scale-105"
              onClick={() => setShowJoin(false)}
            >
              {t('common.back')}
            </button>
            <button
              className="min-h-[44px] rounded-full bg-mint px-6 py-2 font-heading text-mint-ink shadow-soft transition hover:scale-105 disabled:opacity-40"
              onClick={() => onJoin(code)}
              disabled={code.length !== 6 || joining}
            >
              {joining ? '...' : t('mode.joinButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
