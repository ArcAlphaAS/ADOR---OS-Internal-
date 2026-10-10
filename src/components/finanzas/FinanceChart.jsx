import { useState } from 'react'
import { currencyPEN } from '../../lib/clientStages'
import { monthLabel } from '../../lib/finance'

const TOGGLES = [
  { id: 'ambos', label: 'Ambos' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos' },
]
const PLOT_H = 190

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '')}k` : String(Math.round(n)))

// Rounds the top of the scale to a friendly number so the gridlines read as
// 0 / half / full instead of an arbitrary maximum.
function niceMax(v) {
  if (v <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

function Stat({ label, value, color }) {
  return (
    <div>
      <p className="text-[11px] text-[#767676]">{label}</p>
      <p className="mt-0.5 text-[16px] font-semibold tabular-nums tracking-tight" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

// Cash flow of the last six months as plain HTML columns (no stretched SVG, so
// the rounded corners stay round): income in ivory, spending in gold, a scale
// on the left, and a tooltip with the month's income, spending and result.
export default function FinanceChart({ series }) {
  const [mode, setMode] = useState('ambos')
  const [hoverIndex, setHoverIndex] = useState(null)

  const hasData = series.some((p) => p.ingresos > 0 || p.gastos > 0)
  const showIngresos = mode === 'ambos' || mode === 'ingresos'
  const showGastos = mode === 'ambos' || mode === 'gastos'
  const visibleMax = Math.max(...series.map((p) => Math.max(showIngresos ? p.ingresos : 0, showGastos ? p.gastos : 0)))
  const top = niceMax(visibleMax)

  const totalIn = series.reduce((s, p) => s + p.ingresos, 0)
  const totalOut = series.reduce((s, p) => s + p.gastos, 0)
  const net = totalIn - totalOut

  const activeIndex = hoverIndex !== null ? hoverIndex : series.length - 1
  const active = series[activeIndex]

  return (
    <div className="ador-glass ador-grain rounded-[24px] px-7 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">Flujo de caja · 6 meses</h3>
        <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5">
          {TOGGLES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className="rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150"
              style={{ background: mode === t.id ? '#F5F5F5' : 'transparent', color: mode === t.id ? '#0A0A0A' : '#8A8A8A' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <div className="ador-skeleton h-[2px] w-2/3 rounded-full" />
          <p className="text-[13px] font-light text-[#767676]">Sin movimientos registrados aún</p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-7">
            <Stat label="Ingresos" value={currencyPEN.format(totalIn)} color="#F5F5F5" />
            <Stat label="Gastos" value={currencyPEN.format(totalOut)} color="#D9A62B" />
            <Stat label="Resultado" value={`${net >= 0 ? '+' : '−'}${currencyPEN.format(Math.abs(net))}`} color={net >= 0 ? '#4CAF50' : '#EF5350'} />
          </div>

          <div className="mt-6 flex">
            <div className="relative mr-3 w-9 flex-shrink-0 text-right text-[10.5px] tabular-nums text-[#767676]" style={{ height: PLOT_H }}>
              {[1, 0.5, 0].map((f) => (
                <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>
                  {f === 0 ? '0' : compact(top * f)}
                </span>
              ))}
            </div>

            <div className="relative flex-1" style={{ height: PLOT_H }}>
              {[0, 0.5, 1].map((f) => (
                <div key={f} className="absolute inset-x-0 border-t border-dashed border-white/[0.06]" style={{ top: `${(1 - f) * 100}%` }} />
              ))}

              <div className="absolute inset-0 flex">
                {series.map((p, i) => {
                  const isActive = i === activeIndex
                  const hIn = (p.ingresos / top) * 100
                  const hOut = (p.gastos / top) * 100
                  return (
                    <div
                      key={p.month}
                      onMouseEnter={() => setHoverIndex(i)}
                      onMouseLeave={() => setHoverIndex(null)}
                      className="relative flex flex-1 items-end justify-center gap-[5px] rounded-xl px-1 transition-colors duration-150"
                      style={{ background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent' }}
                    >
                      {showIngresos && (
                        <span
                          className="w-full max-w-[22px] rounded-t-[7px] transition-all duration-500"
                          style={{ height: `${hIn}%`, minHeight: p.ingresos > 0 ? 3 : 0, background: isActive ? 'linear-gradient(#F5F5F5, rgba(245,245,245,0.45))' : 'rgba(244,238,226,0.5)' }}
                        />
                      )}
                      {showGastos && (
                        <span
                          className="w-full max-w-[22px] rounded-t-[7px] transition-all duration-500"
                          style={{ height: `${hOut}%`, minHeight: p.gastos > 0 ? 3 : 0, background: isActive ? 'linear-gradient(#E8C15A, #B8860B)' : 'rgba(184,134,11,0.45)' }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="ml-12 mt-2 flex">
            {series.map((p, i) => (
              <span key={p.month} className="flex-1 text-center text-[11px]" style={{ color: i === activeIndex ? '#F5F5F5' : '#767676', fontWeight: i === series.length - 1 ? 600 : 400 }}>
                {monthLabel(p.month)}
              </span>
            ))}
          </div>

          {active && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-white/[0.04] px-4 py-3 text-[12.5px]">
              <span className="font-medium capitalize text-[#F5F5F5]">{monthLabel(active.month)}</span>
              {showIngresos && <span className="text-[#C9C9C9]">Ingresos <b className="font-semibold tabular-nums text-[#F5F5F5]">{currencyPEN.format(active.ingresos)}</b></span>}
              {showGastos && <span className="text-[#C9C9C9]">Gastos <b className="font-semibold tabular-nums text-[#D9A62B]">{currencyPEN.format(active.gastos)}</b></span>}
              {paired(showIngresos, showGastos) && (
                <span className="text-[#C9C9C9]">
                  Resultado{' '}
                  <b className="font-semibold tabular-nums" style={{ color: active.ingresos - active.gastos >= 0 ? '#4CAF50' : '#EF5350' }}>
                    {active.ingresos - active.gastos >= 0 ? '+' : '−'}
                    {currencyPEN.format(Math.abs(active.ingresos - active.gastos))}
                  </b>
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function paired(a, b) {
  return a && b
}
