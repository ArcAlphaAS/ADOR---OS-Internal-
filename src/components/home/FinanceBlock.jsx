import { currencyPEN } from '../../lib/clientStages'

// Hand-drawn sparkline (no charting library, per project convention) —
// normalizes the last few monthly revenue points into a 240x56 viewBox.
function Sparkline({ points }) {
  if (points.length < 2) return null

  const amounts = points.map((p) => p.amount)
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)
  const range = max - min || 1

  const width = 240
  const height = 56
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((p.amount - min) / range) * height
    return [x, y]
  })

  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = coords[coords.length - 1]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-14 w-full" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="#1E5FAD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill="#1E5FAD" />
    </svg>
  )
}

// Same figures as Finanzas (useFinanceData): this month's income — client
// payments received plus manual incomes — its change vs. last month, and
// the last six months as a sparkline. Click opens Finanzas.
export default function FinanceBlock({ hasData, ingresosDelMes, ingresosDeltaPct, series = [], onOpen }) {
  const points = series.map((p) => ({ month: p.month, amount: p.ingresos }))

  return (
    <button type="button" onClick={onOpen} className="ador-glass ador-grain ador-card-hover block w-full rounded-[20px] px-7 py-6 text-left">
      <div className="flex items-center gap-2">
        <span
          className="font-medium text-[#7A7A7A]"
          style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Resumen Financiero
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#1E5FAD]"
          style={{ animation: 'ador-pulse 2s ease-in-out infinite' }}
        />
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="ador-skeleton h-[2px] w-2/3 rounded-full" />
          <p className="text-[14px] font-light text-[#444444]">Sin datos financieros aún</p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-[12px] text-[#666666]">Ingresos del mes</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-[32px] font-semibold text-[#F5F5F5]">{currencyPEN.format(ingresosDelMes)}</span>
            {ingresosDeltaPct !== null && (
              <span className="text-[13px] font-medium" style={{ color: ingresosDeltaPct >= 0 ? '#1E5FAD' : '#E05252' }}>
                {ingresosDeltaPct >= 0 ? '+' : ''}
                {ingresosDeltaPct.toFixed(1)}% vs. mes anterior
              </span>
            )}
          </div>
          <Sparkline points={points} />
        </>
      )}
    </button>
  )
}
