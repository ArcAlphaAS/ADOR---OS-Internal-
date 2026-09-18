import { currencyPEN } from '../../lib/clientStages'
import { useCountUp } from '../../hooks/useCountUp'

// "Resultados del mes" — Ingresos/Gastos/Resultado read together as one
// unit instead of three isolated cards (the old MetricCards.jsx), matching
// the reference's own framing: this answers "how is ADOR doing right now,"
// not three separate facts. Delta compares utilidadNeta itself (the number
// that actually matters), not ingresos alone.
export default function SituacionActualCard({ monthLabel, ingresosDelMes, gastosDelMes, utilidadNeta, resultDeltaPct }) {
  const ingresosDisplay = useCountUp(ingresosDelMes)
  const gastosDisplay = useCountUp(gastosDelMes)
  const resultColor = utilidadNeta >= 0 ? '#4CAF50' : '#EF5350'

  return (
    <div className="ador-glass ador-grain rounded-[18px] px-6 py-5">
      <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {monthLabel}
      </span>
      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <p className="text-[12px] text-[#888888]">Ingresos</p>
          <p className="mt-0.5 text-[24px] font-semibold text-[#F5F5F5]">{currencyPEN.format(Math.round(ingresosDisplay))}</p>
        </div>
        <div>
          <p className="text-[12px] text-[#888888]">Gastos</p>
          <p className="mt-0.5 text-[24px] font-semibold text-[#888888]">{currencyPEN.format(Math.round(gastosDisplay))}</p>
        </div>
        <div>
          <p className="text-[12px] text-[#888888]">Resultado</p>
          <p className="mt-0.5 text-[24px] font-semibold" style={{ color: resultColor }}>
            {utilidadNeta >= 0 ? '+' : ''}
            {currencyPEN.format(utilidadNeta)}
          </p>
        </div>
        {resultDeltaPct !== null && (
          <span className="mb-1.5 text-[12px] font-medium" style={{ color: resultDeltaPct >= 0 ? '#4CAF50' : '#EF5350' }}>
            {resultDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(resultDeltaPct).toFixed(0)}% vs. mes anterior
          </span>
        )}
      </div>
    </div>
  )
}
