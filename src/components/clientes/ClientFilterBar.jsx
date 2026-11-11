import { SearchIcon } from '../icons'

export const QUICK_FILTERS = [
  { id: 'mine', label: 'Mis clientes' },
  { id: 'money', label: 'Con pagos pendientes' },
  { id: 'stale', label: 'Sin contacto en 14 días' },
]

// Always-visible search + one-tap filters shared by Pipeline and Lista.
export default function ClientFilterBar({ search, onSearch, active, onToggle, shown, total }) {
  const filtering = search.trim() || active.length > 0
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 focus-within:bg-white/[0.09]">
        <SearchIcon size={14} style={{ color: '#888888' }} />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar cliente…" className="w-48 bg-transparent text-[13px] text-[#F5F5F5] placeholder:text-[#767676] outline-none" />
      </div>
      {QUICK_FILTERS.map((f) => {
        const on = active.includes(f.id)
        return (
          <button key={f.id} type="button" onClick={() => onToggle(f.id)} className="rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-150" style={{ background: on ? '#F5F5F5' : 'rgba(255,255,255,0.06)', color: on ? '#0B0B0B' : '#B5B5B5' }}>
            {f.label}
          </button>
        )
      })}
      {filtering && <span className="ml-1 text-[12px] text-[#8A8A8A]">{shown} de {total}</span>}
    </div>
  )
}
