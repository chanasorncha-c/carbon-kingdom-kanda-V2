import { useMemo } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#A8E6CF', '#FFD3B6', '#FFF5BA', '#C7CEEA', '#FFAAA5']

interface Piece {
  id: number
  x: number
  rotate: number
  color: string
  delay: number
  size: number
}

/** Small custom SVG-particle confetti burst — no external library. */
export function Confetti({ fire, count = 22 }: { fire: boolean; count?: number }) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 260,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.12,
        size: 6 + Math.random() * 6
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fire, count]
  )

  if (!fire) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible flex items-start justify-center">
      {pieces.map(p => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: 220 + Math.random() * 80, opacity: 0, rotate: p.rotate }}
          transition={{ duration: 0.9 + Math.random() * 0.3, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.id % 2 === 0 ? '9999px' : '3px',
            top: 0
          }}
        />
      ))}
    </div>
  )
}
