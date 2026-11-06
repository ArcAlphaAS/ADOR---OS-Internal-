import { currencyPEN } from '../../lib/clientStages'
import AnimatedNumber from '../common/AnimatedNumber'
import RequiereAtencion from './RequiereAtencion'

// Finanzas en el teléfono (de una referencia): una tarjeta principal con la
// caja como número protagonista, su estado en una pastilla y dos botones
// grandes; tres tarjetas de números con su variación; los últimos seis meses
// como cápsulas; dos tarjetas lado a lado (por cobrar y runway); la meta del
// trimestre con su barra; y los movimientos recientes. Todo plano, en grises
// de modo oscuro; el color solo marca estados.
const GREEN = '#4CAF50'
const AMBER = '#E8C15A'
const RED = '#EF5350'
const STATE = { Estable: GREEN, Atención: AMBER, Crítico: RED }
const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

const Card = ({ children, className = '', onClick }) => {
  const C = onClick ? 'button' : 'div'
  return <C type={onClick ? 'button' : undefined} onClick={onClick} className={`rounded-[28px] bg-[#1C1C1E] p-5 text-left ${className}`}>{children}</C>
}

function Delta({ pct, invert = false }) {
  if (pct == null) return <span className="h-[18px]" />
  const good = invert ? pct <= 0 : pct >= 0
  return <span className="text-[12px] font-semibold tabular-nums" style={{ color: good ? GREEN : RED }}>{pct >= 0 ? '+' : ''}{pct.toFixed(0)}%</span>
}

function Tile({ label, value, delta, invert }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-[24px] bg-[#1C1C1E] px-2 py-4">
      <Delta pct={delta} invert={invert} />
      <span className="mt-1 max-w-full truncate text-[19px] font-semibold tabular-nums text-[#F5F5F5]">{value}</span>
      <span className="mt-0.5 text-[12.5px] text-[#8E8E93]">{label}</span>
    </div>
  )
}

export default function PhoneFinanzas({ data, onIngreso, onGasto, onOpenPorCobrar, onOpenRunway }) {
  const monthName = new Date().toLocaleDateString('es', { month: 'long' })
  const estado = data.estadoSalud
  const max = Math.max(1, ...data.series.flatMap((s) => [s.ingresos, s.gastos]))
  const runway = data.runwayMonths
  const goal = data.quarterlyTarget
  const goalPct = goal ? Math.min(100, Math.round((data.recaudadoTrimestre / goal) * 100)) : 0
  const recent = data.movements.slice(0, 6)

  return (
    <div className="flex flex-col gap-3">
      <Card className="!p-6">
        <div className="flex items-center justify-between">
          <span className="text-[14px] capitalize text-[#8E8E93]">{monthName}</span>
          {estado && (
            <span className="rounded-full px-3 py-1 text-[12.5px] font-semibold" style={{ background: `${STATE[estado]}22`, color: STATE[estado] }}>● {estado}</span>
          )}
        </div>
        <p className="mt-2 text-[15px] text-[#8E8E93]">Caja disponible</p>
        {data.cashBalance ? (
          <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#F5F5F5]"><AnimatedNumber value={data.cashBalance} format={(n) => currencyPEN.format(n)} /></p>
        ) : (
          <p className="mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em] text-[#5A5A5E]">Sin registrar</p>
        )}
        <div className="mt-6 flex gap-2.5">
          <button type="button" onClick={onIngreso} className="ador-btn-primary flex-1 rounded-full py-3.5 text-[15px] font-semibold">+ Ingreso</button>
          <button type="button" onClick={onGasto} className="flex-1 rounded-full bg-[#2C2C2E] py-3.5 text-[15px] font-semibold text-[#F5F5F5]">+ Gasto</button>
        </div>
      </Card>

      <div className="flex gap-2.5">
        <Tile label="Ingresos" value={currencyPEN.format(data.ingresosDelMes)} delta={data.ingresosDeltaPct} />
        <Tile label="Gastos" value={currencyPEN.format(data.gastosDelMes)} delta={data.gastosDeltaPct} invert />
        <Tile label="Resultado" value={currencyPEN.format(data.utilidadNeta)} delta={data.resultDeltaPct} />
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-[#8E8E93]">Últimos 6 meses</span>
          <span className="text-[12.5px] text-[#8E8E93]"><span className="text-[#F4EEE2]">●</span> ingresos <span className="ml-2 text-[#636366]">●</span> gastos</span>
        </div>
        <div className="mt-4 flex h-[110px] items-end justify-between gap-2">
          {data.series.map((s) => (
            <div key={s.month} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-[88px] items-end gap-[3px]">
                <span className="w-[10px] rounded-full bg-[#F4EEE2]" style={{ height: `${Math.max(6, (s.ingresos / max) * 100)}%` }} />
                <span className="w-[10px] rounded-full bg-[#48484A]" style={{ height: `${Math.max(6, (s.gastos / max) * 100)}%` }} />
              </div>
              <span className="text-[11.5px] text-[#8E8E93]">{MONTHS[Number(s.month.slice(5, 7)) - 1]}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Card onClick={onOpenPorCobrar}>
          <span className="text-[13.5px] text-[#8E8E93]">Por cobrar</span>
          <p className="mt-2 text-[24px] font-semibold tabular-nums text-[#F5F5F5]">{currencyPEN.format(data.totalPorCobrar)}</p>
          <p className="mt-1 text-[13px]" style={{ color: data.porCobrarClientCount === 0 ? GREEN : AMBER }}>
            {data.porCobrarClientCount === 0 ? 'Al día' : `${data.porCobrarClientCount} cliente${data.porCobrarClientCount === 1 ? '' : 's'}`}
          </p>
        </Card>
        <Card onClick={onOpenRunway}>
          <span className="text-[13.5px] text-[#8E8E93]">Runway</span>
          <p className="mt-2 text-[24px] font-semibold tabular-nums text-[#F5F5F5]">{runway == null ? '—' : `${runway.toFixed(1)} m`}</p>
          <span className="mt-2.5 block h-[6px] overflow-hidden rounded-full bg-[#2C2C2E]">
            <span className="block h-full rounded-full" style={{ width: `${runway == null ? 0 : Math.min(100, (runway / 6) * 100)}%`, background: runway == null ? '#636366' : runway < 2 ? RED : runway < 4 ? AMBER : GREEN }} />
          </span>
        </Card>
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-[#8E8E93]">Meta del trimestre</span>
          <span className="text-[14px] font-semibold tabular-nums text-[#F5F5F5]">{goal ? `${goalPct}%` : '—'}</span>
        </div>
        <span className="mt-3 block h-[10px] overflow-hidden rounded-full bg-[#2C2C2E]">
          <span className="block h-full rounded-full bg-[#F4EEE2]" style={{ width: `${goalPct}%`, transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)' }} />
        </span>
        <p className="mt-2.5 text-[13px] text-[#8E8E93]">
          {goal ? `${currencyPEN.format(data.recaudadoTrimestre)} de ${currencyPEN.format(goal)} · faltan ${currencyPEN.format(Math.max(0, goal - data.recaudadoTrimestre))}` : 'Define la meta en la versión de escritorio.'}
        </p>
      </Card>

      <RequiereAtencion
        runwayMonths={data.runwayMonths}
        totalPorCobrar={data.totalPorCobrar}
        porCobrarClientCount={data.porCobrarClientCount}
        overdueCount={data.overdueCount}
        categorySpikes={data.categorySpikes}
        onOpenRunway={onOpenRunway}
        onOpenPorCobrar={onOpenPorCobrar}
      />

      <p className="mt-3 px-2 text-[14px] font-medium text-[#8E8E93]">Movimientos recientes</p>
      {recent.length === 0 ? (
        <Card><p className="text-center text-[14px] text-[#8E8E93]">Aún no hay movimientos.</p></Card>
      ) : (
        <div className="overflow-hidden rounded-[28px] bg-[#1C1C1E]">
          {recent.map((m, i) => (
            <div key={m.id || i} className="flex items-center gap-3 px-5 py-3.5" style={{ borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-[#F5F5F5]">{m.description || m.label || m.category || (m.type === 'ingreso' ? 'Ingreso' : 'Gasto')}</span>
                <span className="block text-[12.5px] text-[#8E8E93]">{m.category ? `${m.category} · ` : ''}{new Date(`${m.date}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
              </span>
              <span className="text-[15px] font-semibold tabular-nums" style={{ color: m.type === 'ingreso' ? GREEN : '#F5F5F5' }}>{m.type === 'ingreso' ? '+' : '−'}{currencyPEN.format(m.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
