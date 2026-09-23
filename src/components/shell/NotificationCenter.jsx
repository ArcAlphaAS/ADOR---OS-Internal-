import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { BellIcon } from '../icons'
import useDeferredReveal from '../../hooks/useDeferredReveal'

export default function NotificationCenter({ items = [], anchorRect, open, onItemClick }) {
  const ready = useDeferredReveal()
  if (!anchorRect) return null

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
          <ul className="max-h-[420px] overflow-y-auto">
            {/* Items with an onClick (chat mentions/messages) are real
                buttons that take you there; the rest stay informational. */}
            {items.map((item, i) => (
              <li key={i} className="border-b border-white/[0.04] last:border-0">
                {item.onClick ? (
                  <button
                    type="button"
                    onClick={() => {
                      item.onClick()
                      onItemClick?.()
                    }}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-white/[0.04]"
                  >
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#E8C15A' }} />
                    <span className="line-clamp-2 text-[13px] text-[#CCCCCC]">{item.text}</span>
                    <span className="ml-auto flex-shrink-0 text-[11px] text-[#444444]">{item.time}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-3">
                    <span className="text-[13px] text-[#888888]">{item.text}</span>
                    <span className="ml-auto text-[11px] text-[#444444]">{item.time}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>,
    document.body
  )
}
