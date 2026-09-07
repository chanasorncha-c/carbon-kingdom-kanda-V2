import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface CharacterProps {
  svg: ReactNode
  name: string
  line?: string
  size?: number
  bounce?: boolean
}

/** Shared chrome for a chibi character: bounce-on-hover art + a speech bubble line. */
export function Character({ svg, name, line, size = 96, bounce = true }: CharacterProps) {
  return (
    <div className="flex items-end gap-3">
      <motion.div
        whileHover={bounce ? { y: -8, rotate: [-2, 2, -1, 0] } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 10 }}
        style={{ width: size, height: size }}
        role="img"
        aria-label={name}
      >
        {svg}
      </motion.div>
      {line && (
        <div className="relative max-w-xs rounded-blob bg-white/90 px-4 py-2 font-heading text-sm text-slate-700 shadow-soft">
          {line}
        </div>
      )}
    </div>
  )
}
