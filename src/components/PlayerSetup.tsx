import { useState } from 'react'
import { motion } from 'framer-motion'
import { AvatarFace, AVATAR_COLORS } from './ui/AvatarFace'
import { t } from '../locales'
import type { Player } from '../types/player'

interface PlayerSetupProps {
  onDone: (player: Player) => void
}

export function PlayerSetup({ onDone }: PlayerSetupProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [touched, setTouched] = useState(false)

  const trimmed = name.trim()
  const valid = trimmed.length > 0 && trimmed.length <= 16

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    onDone({ name: trimmed, avatarColor: color })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-blob bg-white/85 p-8 text-center shadow-soft"
    >
      <AvatarFace color={color} size={84} />

      <div className="w-full text-left">
        <label htmlFor="nickname" className="mb-1 block font-heading text-sm text-slate-600">
          {t('setup.nicknameLabel')}
        </label>
        <input
          id="nickname"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={16}
          placeholder={t('setup.nicknamePlaceholder')}
          className="min-h-[44px] w-full rounded-full border-2 border-lavender/60 bg-white px-4 py-2 font-body text-slate-800 outline-none focus:border-lavender"
        />
        {touched && !valid && <p className="mt-1 text-sm text-coral-ink">{t('setup.nicknameError')}</p>}
      </div>

      <div className="w-full">
        <p className="mb-2 font-heading text-sm text-slate-600">{t('setup.avatarLabel')}</p>
        <div className="grid grid-cols-4 gap-3">
          {AVATAR_COLORS.map(c => (
            <motion.button
              key={c}
              type="button"
              whileHover={{ y: -4 }}
              onClick={() => setColor(c)}
              aria-label={t('setup.avatarLabel')}
              aria-pressed={c === color}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-1"
              style={{
                outline: c === color ? '3px solid #FFC93C' : '3px solid transparent',
                outlineOffset: 2
              }}
            >
              <AvatarFace color={c} size={48} />
            </motion.button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="min-h-[44px] w-full rounded-full bg-mint px-6 py-3 font-heading text-lg text-mint-ink shadow-soft transition hover:scale-105"
      >
        {t('setup.continue')}
      </button>
    </form>
  )
}
