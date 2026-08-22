import { currencyPEN } from '../../lib/clientStages'

// Four signals, not restatements of numbers shown elsewhere on this
// dashboard — each answers a distinct "is the business actually okay"
// question a founder would ask, not just "how much did we make." Traffic-
// light coloring reuses the same palette Workspace's priority pills already
// established (#EF5350/#FFC107/#4CAF50) for visual consistency across the app.
const RED = '#EF5350'
const AMBER = '#FFC107'
const GREEN = '#4CAF50'
const GRAY = '#444444'

function Tile({ label, value, sub, color }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5 px-5 py-4">
      <span
        className="font-medium text-[#444444]"
        style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        {label}
      </span>
      <span className="font-semibold" style={{ fontSize: 22, letterSpacing: '-0.01em', color }}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-[#666666]">{sub}</span>}
    </div>
  )
}

export default function FinancialHealthCard({
  runwayMonths,
  margenNetoPct,
  topClientConcentrationPct,
  topClientName,
  overdueAmount,
  overdueCount,
}) {
  const runwayColor = runwayMonths == null ? GRAY : runwayMonths < 2 ? RED : runwayMonths < 4 ? AMBER : GREEN
  const runwayValue = runwayMonths == null ? '—' : `${runwayMonths.toFixed(1)} meses`

  const margenColor = margenNetoPct == null ? GRAY : margenNetoPct < 0 ? RED : margenNetoPct < 15 ? AMBER : GREEN
  const margenValue = margenNetoPct == null ? '—' : `${margenNetoPct >= 0 ? '' : ''}${margenNetoPct.toFixed(0)}%`

  const concColor =
    topClientConcentrationPct == null ? GRAY : topClientConcentrationPct >= 60 ? RED : topClientConcentrationPct >= 40 ? AMBER : GREEN
  const concValue = topClientConcentrationPct == null ? '—' : `${topClientConcentrationPct.toFixed(0)}%`

  const overdueColor = overdueCount === 0 ? GREEN : overdueCount <= 1 ? AMBER : RED
  const overdueValue = overdueCount === 0 ? currencyPEN.format(0) : currencyPEN.format(overdueAmount)

  // Worst-of-four, so the header dot/border reads as "does anything here
  // need attention" at a glance — GRAY only when every signal still lacks
  // data (nothing to warn about yet, not literally "healthy").
  const signalColors = [runwayColor, margenColor, concColor, overdueColor]
  const overallColor = signalColors.includes(RED)
    ? RED
    : signalColors.includes(AMBER)
      ? AMBER
      : signalColors.includes(GREEN)
        ? GREEN
        : GRAY

  return (
    <div
      className="ador-glass ador-grain overflow-hidden rounded-[18px]"
      style={{ borderLeft: `3px solid ${overallColor}` }}
    >
      <div className="flex items-center gap-2 px-5 pt-4">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: overallColor }} />
        <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Salud Financiera
        </span>
      </div>
      <div className="flex divide-x divide-white/[0.06]">
        <Tile label="Runway" value={runwayValue} sub={runwayMonths == null ? 'Registra tu caja' : 'a la quema actual'} color={runwayColor} />
        <Tile label="Margen neto" value={margenValue} sub="ingresos vs. gastos, este mes" color={margenColor} />
        <Tile
          label="Concentración"
          value={concValue}
          sub={topClientName ? `en ${topClientName}` : 'sin ingresos recientes'}
          color={concColor}
        />
        <Tile
          label="Cobros vencidos"
          value={overdueValue}
          sub={overdueCount === 0 ? 'al día' : `${overdueCount} pago${overdueCount === 1 ? '' : 's'} atrasado${overdueCount === 1 ? '' : 's'}`}
          color={overdueColor}
        />
      </div>
    </div>
  )
}
