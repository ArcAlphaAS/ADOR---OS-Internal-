import { currencyPEN } from '../../lib/clientStages'
import { useCountUp } from '../../hooks/useCountUp'

function DeltaPill({ pct }) {
  if (pct === null) return null
  const positive = pct >= 0
  return (
    <span
      className="rounded-full px-2 py-0.5 font-medium"
      style={{
        fontSize: 11,
        color: positive ? '#4CAF50' : '#EF5350',
        background: positive ? 'rgba(76,175,80,0.12)' : 'rgba(239,83,80,0.12)',
      }}
    >
      {positive ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  )
}

function MetricCard({ label, amount, color, deltaPct }) {
  const display = useCountUp(amount)
  return (
    <div className="ador-glass ador-grain flex flex-1 flex-col gap-2.5 rounded-[18px] px-6 py-5">
      <div className="flex items-center justify-between">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          {label}
        </span>
        {deltaPct !== undefined && <DeltaPill pct={deltaPct} />}
      </div>
      <span className="font-semibold" style={{ fontSize: 30, letterSpacing: '-0.02em', color }}>
        {currencyPEN.format(Math.round(display))}
      </span>
    </div>
  )
}

export default function MetricCards({ ingresosDelMes, gastosDelMes, utilidadNeta, ingresosDeltaPct, gastosDeltaPct }) {
  const utilidadColor = utilidadNeta >= 0 ? '#4CAF50' : '#EF5350'

  return (
    <div className="flex gap-4">
      <MetricCard label="Ingresos del mes" amount={ingresosDelMes} color="#F5F5F5" deltaPct={ingresosDeltaPct} />
      <MetricCard label="Gastos del mes" amount={gastosDelMes} color="#888888" deltaPct={gastosDeltaPct} />
      <MetricCard label="Utilidad Neta" amount={utilidadNeta} color={utilidadColor} />
    </div>
  )
}
