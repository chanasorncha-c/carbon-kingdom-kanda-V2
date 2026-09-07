import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { AtomNode, Bond } from '../../types/molecule'

export interface MoleculeCanvasProps {
  atoms: AtomNode[]
  bonds: Bond[]
  /** Ordered ids the player has traced so far — drawn as a glowing gold path. */
  selectedPath?: string[]
  /** Ids to draw as the (revealed) correct answer, e.g. after a wrong submit. */
  revealPath?: string[]
  /** Called when an atom is tapped/clicked. Interaction rules live in the level component. */
  onAtomClick?: (id: string) => void
  /** Visual outcome state driving color accents. */
  status?: 'idle' | 'correct' | 'wrong'
  /** Animated locant-number badges next to specific atoms (e.g. Level 2's numbering direction). */
  locantLabels?: { atomId: string; number: number }[]
  /** Called when a bond is tapped/clicked (Level 3's "Bond Detective"), key = "fromId-toId". */
  onBondClick?: (key: string) => void
  /** Bond keys the player has selected so far — drawn with a gold highlight. */
  selectedBondKeys?: string[]
  /** Bond keys to mark correct/incorrect after grading (green = correct, coral = missed/wrong). */
  correctBondKeys?: string[]
  wrongBondKeys?: string[]
  className?: string
  scale?: number
}

export function bondKey(from: string, to: string) {
  return `${from}-${to}`
}

const ELEMENT_FILL: Record<string, string> = {
  C: '#6B7FA3',
  H: '#FFFFFF',
  O: '#FF6F6F',
  N: '#7FB3FF',
  F: '#8CE0C0',
  Cl: '#8CE0A0',
  Br: '#C77B4E',
  I: '#B06BD6',
  // Level 4's single-stub-atom substituent markers (see src/data/substituents.json)
  Me: '#B9C2D0',
  Et: '#B9C2D0',
  Pr: '#B9C2D0',
  iPr: '#B9C2D0',
  Bu: '#B9C2D0',
  tBu: '#B9C2D0',
  NO2: '#FFAAA5',
  Ph: '#C7CEEA',
  OH: '#FF6F6F',
  NH2: '#7FB3FF',
  COOH: '#E07A5F',
  CHO: '#E07A5F'
}

// anything that isn't a plain carbon gets its element symbol printed as text
// (single-letter halogens included, so Cl/Br/etc. are always legible too)
function needsTextLabel(element: string) {
  return element !== 'C'
}

function bbox(atoms: AtomNode[]) {
  const xs = atoms.map(a => a.x)
  const ys = atoms.map(a => a.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  }
}

export function MoleculeCanvas({
  atoms,
  bonds,
  selectedPath = [],
  revealPath,
  onAtomClick,
  status = 'idle',
  locantLabels,
  onBondClick,
  selectedBondKeys,
  correctBondKeys,
  wrongBondKeys,
  className,
  scale = 70
}: MoleculeCanvasProps) {
  const selectedBondSet = new Set(selectedBondKeys ?? [])
  const correctBondSet = new Set(correctBondKeys ?? [])
  const wrongBondSet = new Set(wrongBondKeys ?? [])
  const byId = useMemo(() => new Map(atoms.map(a => [a.id, a])), [atoms])
  const { minX, maxX, minY, maxY } = useMemo(() => bbox(atoms), [atoms])

  const pad = 1.1
  const w = (maxX - minX + pad * 2) * scale
  const h = (maxY - minY + pad * 2) * scale
  const px = (x: number) => (x - minX + pad) * scale
  const py = (y: number) => (y - minY + pad) * scale

  const selectedSet = new Set(selectedPath)
  const revealSet = new Set(revealPath ?? [])

  const pathLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (let i = 0; i < selectedPath.length - 1; i++) {
      const a = byId.get(selectedPath[i])
      const b = byId.get(selectedPath[i + 1])
      if (a && b) lines.push({ x1: px(a.x), y1: py(a.y), x2: px(b.x), y2: py(b.y) })
    }
    return lines
  }, [selectedPath, byId])

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      role="group"
      aria-label="Molecule structure"
      className={className}
      style={{ maxWidth: 640, touchAction: 'manipulation' }}
    >
      {/* base bonds */}
      {bonds.map((b, i) => {
        const a1 = byId.get(b.from)
        const a2 = byId.get(b.to)
        if (!a1 || !a2) return null
        const x1 = px(a1.x)
        const y1 = py(a1.y)
        const x2 = px(a2.x)
        const y2 = py(a2.y)
        const key = bondKey(b.from, b.to)
        const isSelected = selectedBondSet.has(key)
        const isCorrectBond = correctBondSet.has(key)
        const isWrongBond = wrongBondSet.has(key)
        const highlightColor = isWrongBond ? '#FFAAA5' : isCorrectBond ? '#4FBE8E' : isSelected ? '#FFD34D' : null

        const strokeColor = '#B9C2D0'
        let bondLines: JSX.Element
        if (b.order === 1) {
          bondLines = (
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth={6} strokeLinecap="round" />
          )
        } else {
          const dx = x2 - x1
          const dy = y2 - y1
          const len = Math.hypot(dx, dy) || 1
          const ox = (-dy / len) * 5
          const oy = (dx / len) * 5
          const offsets = b.order === 2 ? [-1, 1] : [-1.6, 0, 1.6]
          bondLines = (
            <>
              {offsets.map((m, j) => (
                <line
                  key={j}
                  x1={x1 + ox * m}
                  y1={y1 + oy * m}
                  x2={x2 + ox * m}
                  y2={y2 + oy * m}
                  stroke={strokeColor}
                  strokeWidth={5}
                  strokeLinecap="round"
                />
              ))}
            </>
          )
        }

        return (
          <g key={i}>
            {highlightColor && (
              <motion.line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={highlightColor}
                strokeWidth={14}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
              />
            )}
            {bondLines}
            {onBondClick && (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth={24}
                style={{ cursor: 'pointer' }}
                onClick={() => onBondClick(key)}
              />
            )}
          </g>
        )
      })}

      {/* revealed correct path (shown after a wrong attempt, in mint) */}
      {revealPath &&
        revealPath.slice(0, -1).map((id, i) => {
          const a = byId.get(id)
          const b = byId.get(revealPath[i + 1])
          if (!a || !b) return null
          return (
            <line
              key={`reveal-${i}`}
              x1={px(a.x)}
              y1={py(a.y)}
              x2={px(b.x)}
              y2={py(b.y)}
              stroke="#4FBE8E"
              strokeWidth={10}
              strokeLinecap="round"
              strokeOpacity={0.55}
            />
          )
        })}

      {/* traced (selected) path glow */}
      {pathLines.map((l, i) => (
        <motion.line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={status === 'wrong' ? '#FFAAA5' : '#FFD34D'}
          strokeWidth={12}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.85 }}
          transition={{ duration: 0.15 }}
        />
      ))}

      {/* atoms */}
      {atoms.map(atom => {
        const isSelected = selectedSet.has(atom.id)
        const isRevealed = revealSet.has(atom.id) && !isSelected
        const r = atom.element === 'C' ? 20 : Math.max(14, 8 + atom.element.length * 4)
        const cx = px(atom.x)
        const cy = py(atom.y)
        const fill = ELEMENT_FILL[atom.element] ?? '#6B7FA3'
        return (
          <g
            key={atom.id}
            transform={`translate(${cx} ${cy})`}
            onClick={() => onAtomClick?.(atom.id)}
            style={{ cursor: onAtomClick ? 'pointer' : 'default' }}
            className="no-select"
          >
            {/* generous invisible hit target, keeps tap targets >=44px on phones */}
            <circle r={26} fill="transparent" />
            <motion.circle
              r={r}
              fill={fill}
              stroke={isSelected ? '#FFC93C' : isRevealed ? '#4FBE8E' : '#8492AC'}
              strokeWidth={isSelected || isRevealed ? 4 : 2}
              animate={isSelected ? { scale: [1, 1.15, 1.05] } : { scale: 1 }}
              transition={{ duration: 0.25 }}
              style={{ filter: isSelected ? 'drop-shadow(0 0 6px #FFD34D)' : undefined }}
            />
            {atom.element === 'C' ? (
              <>
                <circle cx={-6} cy={-4} r={2.2} fill="#1F2937" />
                <circle cx={6} cy={-4} r={2.2} fill="#1F2937" />
                <circle cx={-8} cy={4} r={3} fill="#FFAAA5" opacity={0.6} />
                <circle cx={8} cy={4} r={3} fill="#FFAAA5" opacity={0.6} />
                <path d="M -5 6 Q 0 10 5 6" stroke="#1F2937" strokeWidth={1.5} fill="none" strokeLinecap="round" />
              </>
            ) : (
              needsTextLabel(atom.element) && (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={atom.element.length > 2 ? 8.5 : 11}
                  fontWeight={700}
                  fill="#2A2A2A"
                >
                  {atom.element}
                </text>
              )
            )}
          </g>
        )
      })}

      {/* animated locant-number badges (Level 2 numbering direction, and reused by later levels) */}
      {locantLabels?.map(({ atomId, number }) => {
        const atom = byId.get(atomId)
        if (!atom) return null
        // NOTE: position via a plain (non-motion) <g transform=...> wrapper —
        // framer-motion takes ownership of the `transform` attribute on a
        // motion element as soon as you animate scale/x/y on it, which would
        // silently drop this static translate and leave the badge at the
        // canvas origin. Keep static placement and animation on separate
        // elements.
        return (
          <g key={`locant-${atomId}`} transform={`translate(${px(atom.x) + 16} ${py(atom.y) - 16})`}>
            <motion.g
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <circle r={11} fill="#FFC93C" stroke="#B8860B" strokeWidth={1.5} />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={700}
                fill="#4A3600"
              >
                {number}
              </text>
            </motion.g>
          </g>
        )
      })}
    </svg>
  )
}
