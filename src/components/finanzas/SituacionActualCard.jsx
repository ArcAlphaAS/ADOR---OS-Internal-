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

function Metric({ label, value, color = '#F5F5F5', badge }) {
  return (
    <div className={`ador-glass ador-grain flex-1 ${CARD_RADIUS} px-6 py-5`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-[#8A8A8A]">{label}</span>
        {badge}
      </div>
      <p className="mt-3 text-[26px] font-semibold tracking-tight tabular-nums" style={{ color }}>
        <AnimatedNumber value={value} format={(n) => currencyPEN.format(n)} />
      </p>
    </div>
  )
}

// The month read as one unit: income, spending, and what's left. The delta
// sits on the result (the number that matters), not on income alone.
export default function SituacionActualCard({ monthLabel, ingresosDelMes, gastosDelMes, utilidadNeta, resultDeltaPct }) {
  return (
    <div>
      <div className="mb-3 px-1">
        <CardHeader label={monthLabel} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Metric label="Ingresos" value={ingresosDelMes} />
        <Metric label="Gastos" value={gastosDelMes} color="#B5B5B5" />
        <Metric label="Resultado" value={utilidadNeta} color={utilidadNeta >= 0 ? '#4CAF50' : '#EF5350'} badge={<Badge pct={resultDeltaPct} />} />
      </div>
    </div>
  )
}
