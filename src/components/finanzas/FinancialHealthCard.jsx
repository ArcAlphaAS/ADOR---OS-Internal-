import { currencyPEN } from '../../lib/clientStages'
import { WalletIcon, ClockIcon, TrendUpIcon, FileIcon } from '../icons'

const RED = '#EF5350'
const AMBER = '#FFC107'
const GREEN = '#4CAF50'
const GRAY = '#444444'

const STATE_COLOR = { Crítico: RED, Atención: AMBER, Estable: GREEN }

function Tile({ Icon, label, value, sub, color, onClick }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="flex flex-1 items-center gap-3 px-5 py-4 text-left transition-colors duration-150"
      style={onClick ? { cursor: 'pointer' } : undefined}
      onMouseEnter={onClick ? (e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)') : undefined}
      onMouseLeave={onClick ? (e) => (e.currentTarget.style.background = 'transparent') : undefined}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#888888]">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <span className="block font-medium text-[#444444]" style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span className="block font-semibold" style={{ fontSize: 19, letterSpacing: '-0.01em', color }}>
          {value}
        </span>
        {sub && <span className="text-[11px] text-[#666666]">{sub}</span>}
      </div>
    </Comp>
  )
}

// The header of Finanzas — four real signals (not restatements of numbers
// shown lower down), matching the reference's own exact set: Caja
// disponible, Runway, Margen, Por cobrar. "Por cobrar" and "Runway" open a
// real drill-down (see FinanceDetailPanel.jsx) — direct request that every
// important number here be actionable, not just visible.
export default function FinancialHealthCard({
  cashBalance,
  runwayMonths,
  margenNetoPct,
  totalPorCobrar,
  porCobrarClientCount,
  onOpenPorCobrar,
  onOpenRunway,
}) {
  const runwayColor = runwayMonths == null ? GRAY : runwayMonths < 2 ? RED : runwayMonths < 4 ? AMBER : GREEN
  const runwayValue = runwayMonths == null ? '—' : `${runwayMonths.toFixed(1)} meses`

  const margenColor = margenNetoPct == null ? GRAY : margenNetoPct < 0 ? RED : margenNetoPct < 15 ? AMBER : GREEN
  const margenValue = margenNetoPct == null ? '—' : `${margenNetoPct.toFixed(0)}%`

  const porCobrarColor = porCobrarClientCount === 0 ? GREEN : porCobrarClientCount >= 3 ? RED : AMBER

  const signalColors = [runwayColor, margenColor, porCobrarClientCount === 0 ? GREEN : porCobrarColor]
  const estado = signalColors.includes(RED) ? 'Crítico' : signalColors.includes(AMBER) ? 'Atención' : signalColors.includes(GREEN) ? 'Estable' : null

  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-[18px]">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: estado ? STATE_COLOR[estado] : GRAY }} />
          <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Salud Financiera
          </span>
          {estado && (
            <span className="font-semibold" style={{ fontSize: 11, letterSpacing: '0.04em', color: STATE_COLOR[estado] }}>
              {estado.toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap divide-x divide-white/[0.06]">
        <Tile Icon={WalletIcon} label="Caja disponible" value={cashBalance ? currencyPEN.format(cashBalance) : '—'} sub={cashBalance ? 'saldo registrado' : 'edítalo en Proyección'} color="#F5F5F5" />
        <Tile Icon={ClockIcon} label="Runway" value={runwayValue} sub="con el gasto promedio actual" color={runwayColor} onClick={onOpenRunway} />
        <Tile Icon={TrendUpIcon} label="Margen neto" value={margenValue} sub="este mes" color={margenColor} />
        <Tile
          Icon={FileIcon}
          label="Por cobrar"
          value={currencyPEN.format(totalPorCobrar)}
          sub={porCobrarClientCount === 0 ? 'al día' : `${porCobrarClientCount} cliente${porCobrarClientCount === 1 ? '' : 's'}`}
          color={porCobrarClientCount === 0 ? GREEN : porCobrarColor}
          onClick={onOpenPorCobrar}
        />
      </div>
    </div>
  )
}
