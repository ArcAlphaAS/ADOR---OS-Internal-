import { currencyPEN } from '../../lib/clientStages'
import AnimatedNumber from '../common/AnimatedNumber'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

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
      <path
        d={path}
        pathLength="1"
        fill="none"
        stroke="#F4EEE2"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 1, animation: 'ador-draw 1.1s ease-out' }}
      />
      <circle cx={lastX} cy={lastY} r="3" fill="#F4EEE2" style={{ animation: 'ador-fade-in 0.4s ease-out 0.95s backwards' }} />
    </svg>
  )
}

// Same figures as Finanzas (useFinanceData): this month's income — client
// payments received plus manual incomes — its change vs. last month, and
// the last six months as a sparkline. Click opens Finanzas.
export default function FinanceBlock({ hasData, ingresosDelMes, ingresosDeltaPct, series = [], onOpen }) {
  const points = series.map((p) => ({ month: p.month, amount: p.ingresos }))

  return (
    <button type="button" onClick={onOpen} className={`ador-glass ador-grain ador-card-hover flex h-full w-full flex-col ${CARD_RADIUS} ${CARD_PAD} text-left`}>
      <CardHeader label="Resumen financiero" dot="#F4EEE2" action="Abrir →" />

      {!hasData ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="ador-skeleton h-[2px] w-2/3 rounded-full" />
          <p className="text-[14px] font-light text-[#767676]">Sin datos financieros aún</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-[12px] text-[#767676]">Ingresos del mes</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-[32px] font-semibold text-[#F5F5F5]"><AnimatedNumber value={ingresosDelMes} format={(n) => currencyPEN.format(n)} /></span>
            {ingresosDeltaPct !== null && (
              <span className="text-[13px] font-medium" style={{ color: ingresosDeltaPct >= 0 ? '#F4EEE2' : '#E05252' }}>
                {ingresosDeltaPct >= 0 ? '+' : ''}
                {ingresosDeltaPct.toFixed(1)}% vs. mes anterior
              </span>
            )}
          </div>
          <div className="mt-auto">
            <Sparkline points={points} />
          </div>
        </>
      )}
    </button>
  )
}
