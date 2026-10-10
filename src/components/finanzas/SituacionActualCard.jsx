import { currencyPEN } from '../../lib/clientStages'
import AnimatedNumber from '../common/AnimatedNumber'
import CardHeader, { CARD_RADIUS } from '../home/CardHeader'

function Badge({ pct }) {
  if (pct == null) return null
  const up = pct >= 0
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums" style={{ color: up ? '#4CAF50' : '#EF5350', background: up ? 'rgba(76,175,80,0.12)' : 'rgba(239,83,80,0.12)' }}>
      {up ? '+' : '−'}
      {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

// A tiny trend line under the number — the last months of this same figure.
function Spark({ points, color }) {
  if (!points || points.length < 2 || points.every((v) => v === 0)) return <div className="mt-4 h-8" />
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const coords = points.map((v, i) => [(i / (points.length - 1)) * 100, 28 - ((v - min) / range) * 24])
  const d = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = coords[coords.length - 1]
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-4 h-8 w-full overflow-visible">
      <path d={`${d} L100,32 L0,32 Z`} fill={color} opacity="0.08" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Metric({ label, value, color = '#F5F5F5', badge, points, wide }) {
  return (
    <div className={`ador-glass ador-grain min-w-0 ${wide ? 'col-span-2' : ''} ${CARD_RADIUS} px-6 py-5`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-[#8A8A8A]">{label}</span>
        {badge}
      </div>
      <p className="mt-3 text-[26px] font-semibold tracking-tight tabular-nums" style={{ color }}>
        <AnimatedNumber value={value} format={(n) => currencyPEN.format(n)} />
      </p>
      <Spark points={points} color={color} />
    </div>
  )
}

// The month read as one unit: income, spending, and what's left. The delta
// sits on the result (the number that matters), not on income alone.
export default function SituacionActualCard({ monthLabel, ingresosDelMes, gastosDelMes, utilidadNeta, resultDeltaPct, series = [] }) {
  return (
    <div>
      <div className="mb-3 px-1">
        <CardHeader label={monthLabel} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Ingresos" value={ingresosDelMes} points={series.map((p) => p.ingresos)} />
        <Metric label="Gastos" value={gastosDelMes} color="#D9A62B" points={series.map((p) => p.gastos)} />
        <Metric wide label="Resultado" value={utilidadNeta} color={utilidadNeta >= 0 ? '#4CAF50' : '#EF5350'} badge={<Badge pct={resultDeltaPct} />} points={series.map((p) => p.ingresos - p.gastos)} />
      </div>
    </div>
  )
}
