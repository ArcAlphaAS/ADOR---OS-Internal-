import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { BellIcon } from '../icons'

export default function NotificationCenter({ items = [], anchorRect }) {
  if (!anchorRect) return null

  return createPortal(
    // Animation (opacity/y/scale => transform) lives on this outer wrapper,
    // not on the glass element itself. Chromium has a known bug where an
    // element combining `transform` with `backdrop-filter` can stop
    // compositing the blur (background renders sharp, only the tint shows) —
    // confirmed here by inspecting computed style (backdrop-filter was
    // correctly set) vs. the actual screenshot (no blur visible). Splitting
    // the transformed wrapper from the backdrop-filter surface avoids it.
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="z-50"
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 12,
        right: window.innerWidth - anchorRect.right,
      }}
    >
      <div className="ador-glass ador-grain w-[340px] overflow-hidden rounded-2xl">
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
      </div>
    </motion.div>,
    document.body
  )
}
