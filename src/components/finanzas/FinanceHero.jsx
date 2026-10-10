import { currencyPEN } from '../../lib/clientStages'
import AnimatedNumber from '../common/AnimatedNumber'
import CardHeader, { CARD_PAD, CARD_RADIUS } from '../home/CardHeader'

const RED = '#EF5350'
const AMBER = '#E8C15A'
const GREEN = '#4CAF50'
const MUTED = '#767676'
const STATE_COLOR = { Crítico: RED, Atención: AMBER, Estable: GREEN }

function Stat({ label, value, sub, color = '#F5F5F5', onClick }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`min-w-0 flex-1 rounded-2xl bg-white/[0.04] px-3.5 py-3.5 text-left ${onClick ? 'transition-colors duration-150 hover:bg-white/[0.08]' : ''}`}
    >
      <span className="block text-[11px] text-[#767676]">{label}</span>
      <span className="mt-1 block truncate text-[16px] font-semibold tabular-nums tracking-tight" style={{ color }}>
        {value}
      </span>
      {sub && <span className="mt-0.5 block truncate text-[11.5px] text-[#767676]">{sub}</span>}
    </Comp>
  )
}

// The protagonist of Finanzas: cash in hand as the one big number, the
// overall state, three signals under it (each opens its drill-down where it
// can) and the two actions you take most — register income or an expense.
export default function FinanceHero({
  cashBalance,
  runwayMonths,
  margenNetoPct,
  totalPorCobrar,
  porCobrarClientCount,
  estado,
  onOpenPorCobrar,
  onOpenRunway,
  onIngreso,
  onGasto,
}) {
  const runwayColor = runwayMonths == null ? MUTED : runwayMonths < 2 ? RED : runwayMonths < 4 ? AMBER : GREEN
  const margenColor = margenNetoPct == null ? MUTED : margenNetoPct < 0 ? RED : margenNetoPct < 15 ? AMBER : GREEN
  const cobrarColor = porCobrarClientCount === 0 ? GREEN : porCobrarClientCount >= 3 ? RED : AMBER

  return (
    <div className={`ador-glass ador-grain ${CARD_RADIUS} ${CARD_PAD}`}>
      <CardHeader label="Caja disponible" dot={estado ? STATE_COLOR[estado] : MUTED} action={estado ? <span style={{ color: STATE_COLOR[estado] }}>{estado}</span> : null} />

      {cashBalance ? (
        <p className="mt-5 text-[46px] font-light leading-none tracking-[-0.03em] text-[#F5F5F5] tabular-nums sm:text-[52px]">
          <AnimatedNumber value={cashBalance} format={(n) => currencyPEN.format(n)} />
        </p>
      ) : (
        <p className="mt-5 text-[34px] font-light leading-none tracking-[-0.02em] text-[#5A5A5A]">Sin registrar</p>
      )}
      <p className="mt-2 text-[12.5px] text-[#767676]">{cashBalance ? 'Saldo registrado a mano en Proyección de caja' : 'Regístralo en Proyección de caja para ver el runway'}</p>

      <div className="mt-6 flex gap-2.5">
        <button type="button" onClick={onIngreso} className="ador-btn-primary flex-1 rounded-full px-4 py-2.5 text-[13px] font-medium">
          + Ingreso
        </button>
        <button type="button" onClick={onGasto} className="flex-1 rounded-full border border-white/[0.14] px-4 py-2.5 text-[13px] font-medium text-[#F4EEE2] transition-colors duration-150 hover:bg-white/[0.08]">
          + Gasto
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2.5">
        <Stat label="Runway" value={runwayMonths == null ? '—' : `${runwayMonths.toFixed(1)} meses`} sub="gasto actual" color={runwayColor} onClick={onOpenRunway} />
        <Stat label="Margen neto" value={margenNetoPct == null ? '—' : `${margenNetoPct.toFixed(0)}%`} sub="este mes" color={margenColor} />
        <Stat
          label="Por cobrar"
          value={currencyPEN.format(totalPorCobrar)}
          sub={porCobrarClientCount === 0 ? 'al día' : `${porCobrarClientCount} cliente${porCobrarClientCount === 1 ? '' : 's'}`}
          color={cobrarColor}
          onClick={onOpenPorCobrar}
        />
      </div>
    </div>
  )
}
