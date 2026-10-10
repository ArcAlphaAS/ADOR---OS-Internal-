import { useState } from 'react'
import { currencyPEN } from '../../lib/clientStages'
import { SearchIcon } from '../icons'
import { MovimientoMenu, EditMovimientoModal } from './MovimientoMenu'

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function StatusPill({ movement }) {
  if (movement.type === 'ingreso') {
    return (
      <span
        className="rounded-full px-2.5 py-1 font-medium"
        style={{ fontSize: 11, color: '#4CAF50', background: 'rgba(76,175,80,0.12)' }}
      >
        Recibido
      </span>
    )
  }
  return (
    <span
      className="rounded-full px-2.5 py-1 font-medium"
      style={{ fontSize: 11, color: '#B8860B', background: 'rgba(184,134,11,0.14)' }}
    >
      {movement.category}
    </span>
  )
}

export default function MovimientosTable({ movements, onNavigate }) {
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState(null) // { movement, x, y }
  const [editing, setEditing] = useState(null)

  const filtered = movements.filter((m) => {
    const label = m.type === 'ingreso' ? m.name : m.description
    return label?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="ador-glass ador-grain rounded-[24px] px-7 py-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">Movimientos</h3>
        <div className="relative">
          <SearchIcon size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444444' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar movimiento..."
            className="rounded-full border border-white/[0.08] bg-[#1A1A1A] py-1.5 pl-8 pr-3.5 text-[12px] text-[#F5F5F5] placeholder:text-[#767676] outline-none transition-colors duration-150 focus:border-white/[0.2]"
          />
        </div>
      </div>

      {movements.length === 0 ? (
        <p className="mt-8 text-center text-[13px] font-light text-[#767676]">Sin movimientos registrados</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-[13px] font-light text-[#767676]">Sin resultados para "{search}"</p>
      ) : (
        <div className="mt-4 max-h-[280px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Movimiento', 'Fecha', 'Monto', 'Estado', ''].map((h, i) => (
                  <th
                    key={h}
                    className="pb-2 text-left font-medium text-[#767676]"
                    style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((m) => (
                <tr
                  key={`${m.type}-${m.id}`}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setMenu({ movement: m, x: e.clientX, y: e.clientY })
                  }}
                  className="transition-colors hover:bg-white/[0.025]"
                >
                  <td className="py-2.5 pr-3 text-[13px] text-[#F5F5F5]">
                    {m.type === 'ingreso' ? m.name : m.description}
                    {m.recurringId && <span title="Recurrente" className="ml-1.5 text-[11px] text-[#E8C15A]">↻</span>}
                    {m.receipt?.url && (
                      <a
                        href={m.receipt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Comprobante: ${m.receipt.name}`}
                        className="ml-2 text-[11px] text-[#F4EEE2] hover:underline"
                      >
                        comprobante ↗
                      </a>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-[12px] text-[#767676]">{formatDate(m.date)}</td>
                  <td
                    className="py-2.5 pr-3 font-semibold"
                    style={{ fontSize: 13, color: m.type === 'ingreso' ? '#4CAF50' : '#EF5350' }}
                  >
                    {m.type === 'ingreso' ? '+' : '−'} {currencyPEN.format(m.amount)}
                  </td>
                  <td className="py-2.5">
                    <StatusPill movement={m} />
                  </td>
                  <td className="w-8 py-2.5 text-right">
                    <button
                      type="button"
                      aria-label="Más acciones"
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect()
                        setMenu({ movement: m, x: r.left - 190, y: r.bottom + 4 })
                      }}
                      className="rounded-full px-2 py-0.5 text-[16px] leading-none text-[#767676] transition-colors hover:bg-white/[0.08] hover:text-[#F5F5F5]"
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {menu && <MovimientoMenu movement={menu.movement} x={menu.x} y={menu.y} onClose={() => setMenu(null)} onEdit={setEditing} onOpenClient={() => onNavigate?.('clientes')} />}
      {editing && <EditMovimientoModal movement={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
