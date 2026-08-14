import { useState } from 'react'
import { currencyPEN } from '../../lib/clientStages'
import { SearchIcon } from '../icons'

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

export default function MovimientosTable({ movements }) {
  const [search, setSearch] = useState('')

  const filtered = movements.filter((m) => {
    const label = m.type === 'ingreso' ? m.name : m.description
    return label?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="ador-glass ador-grain rounded-[20px] px-7 py-6">
      <div className="flex items-center justify-between">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Movimientos
        </span>
        <div className="relative">
          <SearchIcon size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444444' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar movimiento..."
            className="rounded-full border border-white/[0.08] bg-[#1A1A1A] py-1.5 pl-8 pr-3.5 text-[12px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]"
          />
        </div>
      </div>

      {movements.length === 0 ? (
        <p className="mt-8 text-center text-[13px] font-light text-[#444444]">Sin movimientos registrados</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-[13px] font-light text-[#444444]">Sin resultados para "{search}"</p>
      ) : (
        <div className="mt-4 max-h-[280px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Movimiento', 'Fecha', 'Monto', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className="sticky top-0 bg-[#0A0A0A] pb-2 text-left font-medium text-[#444444]"
                    style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((m) => (
                <tr key={`${m.type}-${m.id}`}>
                  <td className="py-2.5 pr-3 text-[13px] text-[#F5F5F5]">
                    {m.type === 'ingreso' ? m.name : m.description}
                  </td>
                  <td className="py-2.5 pr-3 text-[12px] text-[#444444]">{formatDate(m.date)}</td>
                  <td
                    className="py-2.5 pr-3 font-semibold"
                    style={{ fontSize: 13, color: m.type === 'ingreso' ? '#4CAF50' : '#EF5350' }}
                  >
                    {m.type === 'ingreso' ? '+' : '−'} {currencyPEN.format(m.amount)}
                  </td>
                  <td className="py-2.5">
                    <StatusPill movement={m} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
