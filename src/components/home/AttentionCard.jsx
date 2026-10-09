import { motion } from 'framer-motion'
import { useAttention } from '../../hooks/useAttention'

// "Necesita tu atención" — the firm-wide list of what's late, cold or stuck,
// ranked, each row one click from fixing it. Quiet when everything's fine.
const LEVEL = { urgent: '#EF5350', warn: '#E8C15A' }
const MAX_ROWS = 6

export default function AttentionCard({ finance, uid, onNavigate }) {
  const items = useAttention(finance, uid)
  const shown = items.slice(0, MAX_ROWS)
  const hasUrgent = items.some((i) => i.level === 'urgent')

  return (
    <div className={`ador-glass ador-grain rounded-[24px] px-7 py-7 sm:px-9 ${items.length === 0 ? '' : hasUrgent ? 'ador-card-urgent' : 'ador-card-attention'}`}>
      <div className="flex items-baseline gap-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">Necesita tu atención</h3>
        {items.length > 0 && <span className="text-[12px] tabular-nums text-[#767676]">{items.length}</span>}
      </div>

      {items.length === 0 ? (
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
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {shown.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => onNavigate?.(item.target[0], item.target[1])}
                className="group flex w-full items-center gap-4 py-3.5 text-left"
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: LEVEL[item.level] }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] text-[#F0F0F0]">{item.title}</span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-[#7A7A7A]">{item.detail}</span>
                </span>
                <span className="text-[#5A5A5A] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#C9C9C9]" aria-hidden>
                  →
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
      {items.length > MAX_ROWS && <p className="mt-3 text-[12px] text-[#767676]">y {items.length - MAX_ROWS} más</p>}
    </div>
  )
}
