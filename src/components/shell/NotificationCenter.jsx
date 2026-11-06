import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { BellIcon, MessageIcon, CheckCircleIcon, GlobeIcon, UsersIcon, ClockIcon } from '../icons'
import useDeferredReveal from '../../hooks/useDeferredReveal'

// Cada aviso lleva su origen (`kind`, puesto en TopBar); aquí decide el icono y la pestaña.
const KIND = {
  chat: { label: 'Chat', Icon: MessageIcon, color: '#F4EEE2' },
  task: { label: 'Tareas', Icon: CheckCircleIcon, color: '#E8C15A' },
  news: { label: 'News', Icon: GlobeIcon, color: '#F4EEE2' },
  community: { label: 'Comunidad', Icon: UsersIcon, color: '#F4EEE2' },
  client: { label: 'Clientes', Icon: ClockIcon, color: '#D98A86' },
}

export default function NotificationCenter({ items = [], anchorRect, open, onItemClick }) {
  const ready = useDeferredReveal()
  const [tab, setTab] = useState('all')
  if (!anchorRect) return null
  const kinds = Object.keys(KIND).filter((k) => items.some((i) => i.kind === k))
  const shown = tab === 'all' || !kinds.includes(tab) ? items : items.filter((i) => i.kind === tab)

  const visible = open && ready

  return createPortal(
    // Animation (opacity/y/scale => transform) lives on this outer wrapper,
    // not on the glass element itself. Chromium has a known bug where an
    // element combining `transform` with `backdrop-filter` can stop
    // compositing the blur (background renders sharp, only the tint shows) —
    // confirmed here by inspecting computed style (backdrop-filter was
    // correctly set) vs. the actual screenshot (no blur visible). Splitting
    // the transformed wrapper from the backdrop-filter surface avoids it.
    //
    // Permanently mounted by TopBar.jsx (not conditionally rendered on
    // `open`) — see ProfileMenu.jsx for the full reasoning, including why
    // the hidden state uses opacity 0.001 rather than exactly 0 (browsers
    // skip painting/compositing a fully transparent element, which was
    // quietly defeating the whole point of staying mounted).
    <motion.div
      animate={{ opacity: visible ? 1 : 0.001, y: visible ? 0 : -8, scale: visible ? 1 : 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="z-[999]"
      style={{
        position: 'fixed',
        pointerEvents: visible ? 'auto' : 'none',
        top: anchorRect.bottom + 12,
        // Nunca más a la izquierda del borde de la pantalla (en teléfono el panel es casi tan ancho como ella).
        right: Math.max(12, Math.min(window.innerWidth - anchorRect.right, window.innerWidth - Math.min(390, window.innerWidth - 24) - 12)),
      }}
    >
      <div className="ador-glass ador-grain w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-[22px]">
        <div className="flex items-center gap-2.5 px-5 pb-3 pt-4">
          <span className="text-[15px] font-semibold text-[#F5F5F5]">Notificaciones</span>
          {items.length > 0 && <span className="rounded-full bg-white/[0.1] px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-[#C9C9C9]">{items.length}</span>}
        </div>

        {kinds.length > 1 && (
          <div className="mx-4 mb-2 flex gap-1 overflow-x-auto rounded-full bg-white/[0.06] p-1 [scrollbar-width:none]">
            {[{ id: 'all', label: 'Todas', n: items.length }, ...kinds.map((k) => ({ id: k, label: KIND[k].label, n: items.filter((i) => i.kind === k).length }))].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
                style={{ background: tab === t.id ? '#F5F5F5' : 'transparent', color: tab === t.id ? '#0A0A0A' : '#9A9A9A' }}
              >
                {t.label}
                <span className="text-[11px] tabular-nums" style={{ opacity: 0.6 }}>{t.n}</span>
              </button>
            ))}
          </div>
        )}

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06]"><BellIcon size={18} className="text-[#767676]" /></span>
            <p className="text-[14px] font-medium text-[#C9C9C9]">Todo al día</p>
            <p className="text-[12.5px] text-[#767676]">Cuando pase algo que te toque, lo verás aquí.</p>
          </div>
        ) : (
          <ul className="max-h-[440px] overflow-y-auto border-t border-white/[0.06]">
            {shown.map((item, i) => {
              const K = KIND[item.kind] || KIND.client
              const Row = item.onClick ? 'button' : 'div'
              return (
                <li key={item.key || i} className="border-b border-white/[0.05] last:border-0">
                  <Row
                    {...(item.onClick ? { type: 'button', onClick: () => { item.onClick(); onItemClick?.() } } : {})}
                    className={`flex w-full items-start gap-3 px-5 py-3.5 text-left ${item.onClick ? 'transition-colors duration-150 hover:bg-white/[0.04]' : ''}`}
                  >
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.07]" style={{ color: K.color }}>
                      <K.Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-3 text-[13.5px] leading-snug text-[#E4E4E4]">{item.text}</span>
                      <span className="mt-0.5 block text-[12px] text-[#767676]">{K.label}{item.time ? ` · ${item.time}` : ''}</span>
                    </span>
                    {item.onClick && <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: '#F4EEE2' }} />}
                  </Row>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </motion.div>,
    document.body
  )
}
