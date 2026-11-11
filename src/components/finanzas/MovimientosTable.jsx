import { useState } from 'react'
import { currencyPEN } from '../../lib/clientStages'
import { SearchIcon } from '../icons'
import { movementsToCsv, downloadCsv } from '../../lib/financePeriod'
import { monthLabel } from '../../lib/finance'
import { MovimientoMenu, EditMovimientoModal } from './MovimientoMenu'

function dayLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const today = new Date(new Date().toDateString())
  const diff = Math.round((today - d) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  const l = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  return l.charAt(0).toUpperCase() + l.slice(1)
}

const TYPES = [
  { id: 'todos', label: 'Todos' },
  { id: 'ingreso', label: 'Ingresos' },
  { id: 'gasto', label: 'Gastos' },
]

// Grouped by day like a native transactions list: a round initial for the
// category/client, the title, a quiet subtitle and the amount on the right.
export default function MovimientosTable({ movements, onNavigate, scopeLabel, monthFilter, onClearMonth }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('todos')
  const [menu, setMenu] = useState(null)
  const [editing, setEditing] = useState(null)

  const filtered = movements.filter((m) => {
    if (type !== 'todos' && m.type !== type) return false
    const label = `${m.type === 'ingreso' ? m.name : m.description} ${m.category || ''} ${m.clientName || ''}`
    return label.toLowerCase().includes(search.toLowerCase())
  })
  const groups = []
  for (const m of filtered) {
    const last = groups[groups.length - 1]
    if (last && last.date === m.date) last.items.push(m)
    else groups.push({ date: m.date, items: [m] })
  }
  const total = filtered.reduce((s, m) => s + (m.type === 'ingreso' ? m.amount : -m.amount), 0)

  return (
    <div className="ador-glass ador-grain rounded-[24px] px-7 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">Movimientos · {scopeLabel}</h3>
          {monthFilter && (
            <button type="button" onClick={onClearMonth} className="mt-1.5 rounded-full bg-white/[0.08] px-3 py-1 text-[11.5px] text-[#F4EEE2]">
              {monthLabel(monthFilter)} ✕
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5">
            {TYPES.map((t) => (
              <button key={t.id} type="button" onClick={() => setType(t.id)} className="rounded-full px-3 py-1 text-[12px] font-medium transition-colors" style={{ background: type === t.id ? '#F5F5F5' : 'transparent', color: type === t.id ? '#0A0A0A' : '#8A8A8A' }}>{t.label}</button>
            ))}
          </div>
          <div className="relative">
            <SearchIcon size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8A8A' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="w-40 rounded-full bg-white/[0.06] py-1.5 pl-8 pr-3.5 text-[12px] text-[#F5F5F5] placeholder:text-[#767676] outline-none focus:bg-white/[0.09]" />
          </div>
          <button type="button" disabled={filtered.length === 0} onClick={() => downloadCsv(`movimientos-ador-${new Date().toISOString().slice(0, 10)}.csv`, movementsToCsv(filtered))} className="rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-medium text-[#D5D5D5] transition-colors hover:bg-white/[0.1] disabled:opacity-40" title="Descargar para el contador (abre en Excel)">
            Exportar CSV
          </button>
        </div>
      </div>

      {movements.length === 0 ? (
        <p className="mt-8 text-center text-[13px] font-light text-[#8A8A8A]">Sin movimientos en este periodo</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-[13px] font-light text-[#8A8A8A]">Sin resultados</p>
      ) : (
        <>
          <div className="mt-4 max-h-[460px] overflow-y-auto pr-1">
            {groups.map((g) => (
              <div key={g.date} className="mb-1">
                <p className="sticky top-0 z-10 bg-[#101010]/90 py-2 text-[11.5px] font-medium text-[#8A8A8A] backdrop-blur-sm">{dayLabel(g.date)}</p>
                <div className="flex flex-col">
                  {g.items.map((m) => {
                    const title = m.type === 'ingreso' ? m.name : m.description
                    const sub = m.type === 'ingreso' ? m.clientName || (m.source === 'client' ? 'Pago de cliente' : 'Ingreso') : m.category
                    return (
                      <div
                        key={`${m.type}-${m.id}`}
                        onContextMenu={(e) => { e.preventDefault(); setMenu({ movement: m, x: e.clientX, y: e.clientY }) }}
                        className="group flex items-center gap-3.5 rounded-2xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold" style={{ background: m.type === 'ingreso' ? 'rgba(244,238,226,0.12)' : 'rgba(255,255,255,0.07)', color: m.type === 'ingreso' ? '#F4EEE2' : '#B5B5B5' }}>
                          {(title || '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-[#F5F5F5]">
                            {title}
                            {m.recurringId && <span title="Recurrente" className="ml-1.5 text-[11px] text-[#E8C15A]">↻</span>}
                          </span>
                          <span className="block truncate text-[12px] text-[#8A8A8A]">
                            {sub}
                            {m.receipt?.url && (
                              <a href={m.receipt.url} target="_blank" rel="noopener noreferrer" title={`Comprobante: ${m.receipt.name}`} className="ml-2 text-[#F4EEE2] hover:underline">comprobante ↗</a>
                            )}
                          </span>
                        </span>
                        <span className="text-[14.5px] font-semibold tabular-nums" style={{ color: m.type === 'ingreso' ? '#4CAF50' : '#F5F5F5' }}>
                          {m.type === 'ingreso' ? '+' : '−'}{currencyPEN.format(m.amount)}
                        </span>
                        <button
                          type="button"
                          aria-label="Más acciones"
                          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ movement: m, x: r.left - 190, y: r.bottom + 4 }) }}
                          className="rounded-full px-2 py-0.5 text-[16px] leading-none text-[#8A8A8A] opacity-0 transition-all hover:bg-white/[0.08] hover:text-[#F5F5F5] group-hover:opacity-100"
                        >⋯</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[12.5px]">
            <span className="text-[#8A8A8A]">{filtered.length} movimiento{filtered.length === 1 ? '' : 's'}</span>
            <span className="tabular-nums text-[#C9C9C9]">Neto <b className="font-semibold" style={{ color: total >= 0 ? '#4CAF50' : '#EF5350' }}>{total >= 0 ? '+' : '−'}{currencyPEN.format(Math.abs(total))}</b></span>
          </div>
        </>
      )}
      {menu && <MovimientoMenu movement={menu.movement} x={menu.x} y={menu.y} onClose={() => setMenu(null)} onEdit={setEditing} onOpenClient={() => onNavigate?.('clientes')} />}
      {editing && <EditMovimientoModal movement={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
