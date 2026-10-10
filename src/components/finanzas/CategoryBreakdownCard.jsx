import { currencyPEN } from '../../lib/clientStages'
import { EXPENSE_CATEGORIES } from '../../lib/finance'

// One tone per category from the app's own palette (ivory → gold → greys), so
// the donut reads as part of the system instead of a rainbow.
const CATEGORY_COLORS = {
  Salarios: '#F4EEE2',
  Operaciones: '#C9B58A',
  Herramientas: '#E8C15A',
  Marketing: '#B8860B',
  Desplazamientos: '#8A8A8A',
  Otros: '#4A4A4A',
}

const R = 52
const C = 2 * Math.PI * R

export default function CategoryBreakdownCard({ categoryTotals }) {
  const total = [...categoryTotals.values()].reduce((sum, v) => sum + v, 0)
  const active = EXPENSE_CATEGORIES.filter((c) => categoryTotals.has(c)).sort((a, b) => categoryTotals.get(b) - categoryTotals.get(a))

  let offset = 0
  const segments = active.map((category) => {
    const frac = categoryTotals.get(category) / total
    const seg = { category, frac, dash: Math.max(0, frac * C - 2), offset }
    offset += frac * C
    return seg
  })

  return (
    <div className="ador-glass ador-grain rounded-[24px] px-7 py-6">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">Gastos por categoría · este mes</h3>

      {total === 0 ? (
        <p className="mt-5 text-center text-[13px] font-light text-[#767676]">Sin gastos registrados</p>
      ) : (
        <div className="mt-5 flex items-center gap-6">
          <div className="relative h-[132px] w-[132px] flex-shrink-0">
            <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
              <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
              {segments.map((s) => (
                <circle
                  key={s.category}
                  cx="66"
                  cy="66"
                  r={R}
                  fill="none"
                  stroke={CATEGORY_COLORS[s.category]}
                  strokeWidth="14"
                  strokeDasharray={`${s.dash} ${C}`}
                  strokeDashoffset={-s.offset}
                  strokeLinecap="butt"
                  style={{ transition: 'stroke-dasharray 600ms ease-out' }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10.5px] text-[#767676]">Total</span>
              <span className="text-[15px] font-semibold tabular-nums tracking-tight text-[#F5F5F5]">{currencyPEN.format(total)}</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-2">
            {segments.map((s) => (
              <li key={s.category} className="flex items-center gap-2.5">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[s.category] }} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#E8E8E8]">{s.category}</span>
                <span className="flex-shrink-0 text-[12px] tabular-nums text-[#B5B5B5]">{currencyPEN.format(categoryTotals.get(s.category))}</span>
                <span className="w-8 flex-shrink-0 text-right text-[11px] tabular-nums text-[#767676]">{Math.round(s.frac * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
