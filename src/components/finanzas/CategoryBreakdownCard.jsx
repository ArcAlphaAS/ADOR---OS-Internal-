import { currencyPEN } from '../../lib/clientStages'
import { EXPENSE_CATEGORIES } from '../../lib/finance'

// One color per category, reusing the design system's semantic + accent
// colors rather than inventing a new categorical palette for six values.
const CATEGORY_COLORS = {
  Salarios: '#1E5FAD',
  Operaciones: '#3A8DE8',
  Herramientas: '#B8860B',
  Marketing: '#D9A62B',
  Desplazamientos: '#888888',
  Otros: '#444444',
}

export default function CategoryBreakdownCard({ categoryTotals }) {
  const total = [...categoryTotals.values()].reduce((sum, v) => sum + v, 0)
  const active = EXPENSE_CATEGORIES.filter((c) => categoryTotals.has(c))

  return (
    <div className="ador-glass ador-grain rounded-[16px] px-6 py-5">
      <span
        className="font-medium text-[#444444]"
        style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        Gastos por Categoría — este mes
      </span>

      {total === 0 ? (
        <p className="mt-5 text-center text-[13px] font-light text-[#444444]">Sin gastos registrados</p>
      ) : (
        <>
          <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {active.map((category) => (
              <div
                key={category}
                style={{
                  width: `${(categoryTotals.get(category) / total) * 100}%`,
                  background: CATEGORY_COLORS[category],
                }}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
            {active.map((category) => {
              const amount = categoryTotals.get(category)
              const pct = Math.round((amount / total) * 100)
              return (
                <div key={category} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: CATEGORY_COLORS[category] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[#F5F5F5]">{category}</span>
                  <span className="flex-shrink-0 text-[11px] text-[#888888]">{pct}%</span>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="text-[12px] text-[#888888]">Total del mes</span>
            <span className="text-[13px] font-semibold text-[#F5F5F5]">{currencyPEN.format(total)}</span>
          </div>
        </>
      )}
    </div>
  )
}
