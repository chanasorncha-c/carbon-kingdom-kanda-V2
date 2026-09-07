import { t } from '../../locales'
import type { DirectionLocants, Direction } from '../../types/question2'

interface LocantTableProps {
  left: DirectionLocants
  right: DirectionLocants
  winner: Direction
}

function Column({
  label,
  data,
  isWinner
}: {
  label: string
  data: DirectionLocants
  isWinner: boolean
}) {
  return (
    <div
      className={`flex-1 rounded-blob p-3 text-center ${
        isWinner ? 'bg-mint/50 ring-2 ring-mint-ink' : 'bg-white/60'
      }`}
    >
      <p className="font-heading text-sm text-slate-700">{label}</p>
      {data.bond !== null && (
        <p className="mt-1 font-body text-sm text-slate-600">
          {t('level2.table.bond')}: <span className="font-bold">{data.bond}</span>
        </p>
      )}
      {data.substituents.length > 0 && (
        <p className="mt-1 font-body text-sm text-slate-600">
          {t('level2.table.substituents')}: <span className="font-bold">[{data.substituents.join(', ')}]</span>
        </p>
      )}
      {isWinner && <p className="mt-1 font-heading text-xs text-mint-ink">🏆 {t('level2.table.winner')}</p>}
    </div>
  )
}

export function LocantTable({ left, right, winner }: LocantTableProps) {
  return (
    <div className="rounded-blob bg-white/80 p-3 shadow-soft">
      <p className="mb-2 text-center font-heading text-sm text-slate-700">{t('level2.table.title')}</p>
      <div className="flex gap-3">
        <Column label={t('level2.table.left')} data={left} isWinner={winner === 'left'} />
        <Column label={t('level2.table.right')} data={right} isWinner={winner === 'right'} />
      </div>
    </div>
  )
}
