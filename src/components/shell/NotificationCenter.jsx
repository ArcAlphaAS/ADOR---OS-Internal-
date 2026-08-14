import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { BellIcon } from '../icons'

export default function NotificationCenter({ items = [], anchorRect }) {
  if (!anchorRect) return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="ador-glass ador-grain z-50 w-[340px] overflow-hidden rounded-2xl"
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 12,
        right: window.innerWidth - anchorRect.right,
        boxShadow: '0 24px 48px -16px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.08)',
      }}
    >
      <div className="border-b border-white/[0.06] px-5 py-4">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Notificaciones
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <BellIcon size={18} className="text-[#333333]" />
          <p className="text-[13px] font-light text-[#444444]">Sin notificaciones</p>
        </div>
      ) : (
        <ul>
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 border-b border-white/[0.04] px-5 py-3 last:border-0">
              <span className="text-[13px] text-[#888888]">{item.text}</span>
              <span className="ml-auto text-[11px] text-[#444444]">{item.time}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>,
    document.body
  )
}
