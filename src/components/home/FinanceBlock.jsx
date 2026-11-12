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
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-20 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fin-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4EEE2" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F4EEE2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${width},${height} L0,${height} Z`} fill="url(#fin-area)" style={{ animation: 'ador-fade-in 0.8s ease-out 0.4s backwards' }} />
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
    <button type="button" onClick={onOpen} className={`ador-glass ador-quiet ador-grain ador-card-hover flex h-full w-full flex-col ${CARD_RADIUS} ${CARD_PAD} text-left`}>
      <CardHeader label="Resumen financiero" dot="#F4EEE2" action="→" />

      {!hasData ? (
        <div className="flex flex-1 items-center gap-4 py-6">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-[#F4EEE2]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 4 8-9M15 7h5v5" /></svg>
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-light text-[#E4E4E4]">Aún no hay ingresos registrados</p>
            <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">Cuando entre el primero, verás aquí el mes y su tendencia.</p>
            <span className="mt-2 inline-block text-[12.5px] font-medium text-[#F4EEE2]">Ir a Finanzas →</span>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-4 text-[12px] text-[#8A8A8A]">Ingresos del mes</p>
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
