import { currencyPEN } from '../../lib/clientStages'
import { CheckCircleIcon, AlertIcon, ChevronRightIcon } from '../icons'

const RED = '#EF5350'
const AMBER = '#FFC107'
const GREEN = '#4CAF50'

function AlertRow({ color, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.03] disabled:cursor-default"
    >
      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[#F5F5F5]">{title}</p>
        <p className="truncate text-[11.5px] text-[#888888]">{sub}</p>
      </div>
      {onClick && <ChevronRightIcon size={14} className="flex-shrink-0 text-[#444444]" />}
    </button>
  )
}

// Real, rule-based alerts — not a decorative "everything's fine" card. Each
// rule reads live data already computed by useFinanceData; nothing here is
// a separately-tracked flag. This is deliberately the highest-leverage
// section in the redesign per direct feedback: "esto es mucho más valioso
// que simplemente mostrar números."
export default function RequiereAtencion({ runwayMonths, totalPorCobrar, porCobrarClientCount, overdueCount, categorySpikes, onOpenRunway, onOpenPorCobrar }) {
  const alerts = []

  if (runwayMonths !== null && runwayMonths < 3) {
    alerts.push({
      color: runwayMonths < 2 ? RED : AMBER,
      title: 'Runway por debajo de 3 meses',
      sub: `${runwayMonths.toFixed(1)} meses con el gasto actual`,
      onClick: onOpenRunway,
    })
  }

  if (totalPorCobrar > 0) {
    alerts.push({
      color: overdueCount >= 2 ? RED : AMBER,
      title: `${currencyPEN.format(totalPorCobrar)} por cobrar`,
      sub: overdueCount > 0 ? `${overdueCount} pago${overdueCount === 1 ? '' : 's'} vencido${overdueCount === 1 ? '' : 's'}` : `${porCobrarClientCount} cliente${porCobrarClientCount === 1 ? '' : 's'}`,
      onClick: onOpenPorCobrar,
    })
  }

  for (const spike of categorySpikes.slice(0, 2)) {
    alerts.push({
      color: AMBER,
      title: `Gasto de ${spike.category} +${spike.pct}%`,
      sub: 'vs. mes anterior',
      onClick: null,
    })
  }

  return (
    <div className="ador-glass ador-grain rounded-[18px] px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: alerts.length ? (alerts.some((a) => a.color === RED) ? RED : AMBER) : GREEN }} />
        <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Requiere atención
        </span>
        {alerts.length > 0 && (
          <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold" style={{ background: `${alerts.some((a) => a.color === RED) ? RED : AMBER}22`, color: alerts.some((a) => a.color === RED) ? RED : AMBER }}>
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl px-2 py-2">
          <CheckCircleIcon size={16} className="flex-shrink-0 text-[#4CAF50]" />
          <p className="text-[13px] text-[#888888]">Sin alertas financieras.</p>
        </div>
      ) : (
        <div className="mt-2 flex flex-col divide-y divide-white/[0.05]">
          {alerts.map((a, i) => (
            <AlertRow key={i} {...a} />
          ))}
        </div>
      )}
    </div>
  )
}
