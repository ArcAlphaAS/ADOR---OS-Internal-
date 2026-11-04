import { motion } from 'framer-motion'
import { useAttention } from '../../hooks/useAttention'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

// "Necesita tu atención" — the firm-wide list of what's late, cold or stuck,
// ranked, each row one click from fixing it. Quiet when everything's fine.
const LEVEL = { urgent: '#EF5350', warn: '#E8C15A' }
const MAX_ROWS = 6

// Icono por tipo de aviso (se deduce del id): cobro, contrato, caja, meta,
// cliente frío, tareas, carga del equipo.
const ICONS = {
  pay: <path d="M3 8h18v10H3zM3 12h18M7 16h3" />,
  contract: <path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6" />,
  runway: <path d="M3 17l5-5 4 4 8-9M15 7h5v5" />,
  obj: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>,
  stale: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  my: <path d="M9 11l2.5 2.5L17 8M5 4h14v16H5z" />,
  load: <><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5M16 6.5a3 3 0 0 1 0 5.5M17.5 14.5c1.7.5 3 1.8 3.5 4" /></>,
}
const iconFor = (id) => ICONS[String(id).split('-')[0]] || ICONS.my

export default function AttentionCard({ finance, uid, onNavigate }) {
  const { items, loaded } = useAttention(finance, uid)
  const shown = items.slice(0, MAX_ROWS)
  const hasUrgent = items.some((i) => i.level === 'urgent')

  return (
    <div className={`ador-glass ador-grain h-full ${CARD_RADIUS} ${CARD_PAD} ${!loaded || items.length === 0 ? '' : hasUrgent ? 'ador-card-urgent' : 'ador-card-attention'}`}>
      <CardHeader label="Necesita tu atención" count={items.length > 0 ? items.length : null} />
      {loaded && items.length > 0 && (
        <p className="mt-1.5 text-[12.5px] text-[#8A8A8A]">
          {items.filter((i) => i.level === 'urgent').length > 0 ? `${items.filter((i) => i.level === 'urgent').length} urgente${items.filter((i) => i.level === 'urgent').length > 1 ? 's' : ''} · ` : ''}
          {items.filter((i) => i.level !== 'urgent').length} por revisar
        </p>
      )}

      {!loaded ? (
        <div className="mt-4 space-y-3 py-1">
          {[72, 58, 66].map((w) => (
            <div key={w} className="flex items-center gap-3">
              <span className="ador-skeleton h-2 w-2 flex-shrink-0 rounded-full" />
              <span className="ador-skeleton h-3 rounded-full" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-4 py-7">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#E8C15A]/40 text-[#E8C15A]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <div>
            <p className="text-[16px] font-light text-[#F5F5F5]">Todo en orden</p>
            <p className="mt-0.5 text-[13px] text-[#7A7A7A]">Nada requiere tu atención ahora mismo.</p>
          </div>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {shown.map((item, i) => {
            const color = LEVEL[item.level]
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={() => onNavigate?.(item.target[0], item.target[1])}
                  className="group flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors duration-200 hover:bg-white/[0.06]"
                  style={{ background: `${color}12` }}
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: `${color}24`, color }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconFor(item.id)}</svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-[#F0F0F0]">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-[#8A8A8A]">{item.detail}</span>
                  </span>
                  <span className="text-[#5A5A5A] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#C9C9C9]" aria-hidden>→</span>
                </button>
              </motion.li>
            )
          })}
        </ul>
      )}
      {items.length > MAX_ROWS && <p className="mt-3 text-[12px] text-[#767676]">y {items.length - MAX_ROWS} más</p>}
    </div>
  )
}
