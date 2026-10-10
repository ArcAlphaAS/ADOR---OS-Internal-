import { motion } from 'framer-motion'
import { useAttention } from '../../hooks/useAttention'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

// "Necesita tu atención" — the firm-wide list of what's late, cold or stuck,
// ranked, each row one click from fixing it. Quiet when everything's fine.
const LEVEL = { urgent: '#EF5350', warn: '#E8C15A' }
const MAX_ROWS = 6

export default function AttentionCard({ finance, uid, onNavigate }) {
  const { items, loaded } = useAttention(finance, uid)
  const shown = items.slice(0, MAX_ROWS)
  const hasUrgent = items.some((i) => i.level === 'urgent')

  return (
    <div className={`ador-glass ador-grain h-full ${CARD_RADIUS} ${CARD_PAD} ${!loaded || items.length === 0 ? '' : hasUrgent ? 'ador-card-urgent' : 'ador-card-attention'}`}>
      <CardHeader label="Necesita tu atención" count={items.length > 0 ? items.length : null} />

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
