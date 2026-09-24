import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import useDeferredReveal from '../../hooks/useDeferredReveal'

// Same portal + split-wrapper pattern as NotificationCenter.jsx: the
// transform-animated wrapper and the ador-glass surface are two separate
// elements, otherwise Chromium drops the backdrop blur (see that file for
// the full explanation). `animate` waits for `useDeferredReveal`'s `ready`
// flag so the freshly-mounted blur layer has a couple of frames to
// composite before anything becomes visible. onMouseDown/preventDefault on
// each result stops the input's onBlur from closing this dropdown before
// the click's own onClick fires.
//
// `activeIndex` is the keyboard-highlighted result (↑/↓ in the search box,
// Enter opens it) — counted across all groups in display order.
export default function SearchResults({ results, anchorRect, activeIndex, onSelect }) {
  const ready = useDeferredReveal()
  if (!anchorRect) return null
  let index = -1

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={ready ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -8, scale: 0.98 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="z-[999]"
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 8,
        left: Math.max(12, anchorRect.right - 380),
        width: 380,
      }}
    >
      <div className="ador-glass ador-grain max-h-[460px] overflow-y-auto rounded-2xl py-2">
        {!results.hasResults ? (
          <p className="px-4 py-6 text-center text-[13px] font-light text-[#666666]">{results.loadingMessages ? 'Buscando también en los mensajes…' : 'Sin resultados'}</p>
        ) : (
          <>
            {results.groups.map((group) => (
              <div key={group.key}>
                <span className="block px-4 pb-1 pt-3 font-medium text-[#666666]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {group.label}
                </span>
                {group.items.map((item) => {
                  index += 1
                  const active = index === activeIndex
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSelect(item)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors duration-150 hover:bg-white/[0.06]"
                      style={active ? { background: 'rgba(255,255,255,0.08)' } : undefined}
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[#F5F5F5]">{item.title}</span>
                      <span className="max-w-[45%] flex-shrink-0 truncate text-[11px] text-[#777777]">{item.meta}</span>
                    </button>
                  )
                })}
              </div>
            ))}
            {results.loadingMessages && <p className="px-4 pt-2 pb-1 text-[11px] text-[#666666]">Buscando también en los mensajes…</p>}
          </>
        )}
      </div>
    </motion.div>,
    document.body
  )
}
