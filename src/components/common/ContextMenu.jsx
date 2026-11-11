import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useEscape } from '../../hooks/useEscape'
import { isTouchLayout, swipeToClose, SHEET } from '../../lib/motion'
import { haptic } from '../../lib/haptics'
import { useSheetScale } from '../../hooks/useSheetScale'

// Menú de clic derecho (o mantener presionado en el teléfono), el mismo en toda
// la app: se abre en el cursor, no se sale de la pantalla y se cierra con Esc,
// con un clic fuera o al desplazar. `items`: [{label, onClick, danger, hint, icon}]
// o { divider: true }. Un elemento sin opciones propias deja el menú del navegador.
// En el teléfono el menú es una hoja de acciones al estilo iOS (filas de 52 px,
// "Cancelar" aparte, se cierra deslizando hacia abajo); en computadora, el menú
// compacto junto al cursor.
function ActionSheet({ title, subtitle, items, onClose }) {
  useEscape(onClose)
  useSheetScale(true)
  const list = items.filter(Boolean)
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[998] bg-black/45" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={SHEET}
        {...swipeToClose('y', onClose)}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-3 mx-auto max-w-[520px]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
      >
        <div className="max-h-[68vh] overflow-y-auto rounded-[22px] bg-[#1C1C1E]/95 backdrop-blur-xl" data-keep-scroll>
          {title && (
            <div className="border-b border-white/[0.08] px-5 py-3 text-center">
              <p className="truncate text-[13px] font-semibold text-[#F5F5F5]">{title}</p>
              {subtitle && <p className="truncate text-[12px] text-[#8E8E93]">{subtitle}</p>}
            </div>
          )}
          {list.map((it, i) =>
            it.divider ? (
              <div key={i} className="h-1.5 bg-black/40" />
            ) : (
              <button
                key={it.label}
                type="button"
                disabled={it.disabled}
                onClick={() => {
                  haptic(it.danger ? 'heavy' : 'tap')
                  onClose()
                  it.onClick?.()
                }}
                className="flex w-full items-center justify-between gap-3 px-5 text-left text-[17px] active:bg-white/[0.07] disabled:opacity-40"
                style={{ minHeight: 52, color: it.danger ? '#FF6961' : '#F5F5F5', borderTop: i && !list[i - 1]?.divider ? '0.5px solid rgba(255,255,255,0.08)' : 'none' }}
              >
                {it.label}
                {it.hint && <span className="text-[13px] text-[#8E8E93]">{it.hint}</span>}
              </button>
            )
          )}
        </div>
        <button type="button" onClick={onClose} className="mt-2 w-full rounded-[22px] bg-[#2C2C2E] text-[17px] font-semibold text-[#F4EEE2] active:bg-[#3A3A3C]" style={{ minHeight: 54 }}>
          Cancelar
        </button>
      </motion.div>
    </motion.div>,
    document.body
  )
}

export default function ContextMenu(props) {
  return isTouchLayout() ? <ActionSheet {...props} /> : <PopupMenu {...props} />
}

function PopupMenu({ x, y, title, subtitle, items, onClose }) {
  useEscape(onClose)
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) })
  }, [x, y])
  useEffect(() => {
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  return createPortal(
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <motion.div ref={ref} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="fixed z-[999] w-[240px]" style={{ left: pos.left, top: pos.top, transformOrigin: 'top left' }} onClick={(e) => e.stopPropagation()}>
        <div className="ador-glass ador-grain rounded-xl p-1.5">
          {title && (
            <>
              <div className="px-2.5 pb-1 pt-1.5">
                <p className="truncate text-[12.5px] font-medium text-[#F5F5F5]">{title}</p>
                {subtitle && <p className="truncate text-[11px] text-[#8A8A8A]">{subtitle}</p>}
              </div>
              <div className="my-1 h-px bg-white/[0.08]" />
            </>
          )}
          {items.filter(Boolean).map((it, i) =>
            it.divider ? (
              <div key={i} className="my-1 h-px bg-white/[0.08]" />
            ) : (
              <button
                key={it.label}
                type="button"
                disabled={it.disabled}
                onClick={() => {
                  onClose()
                  it.onClick?.()
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.07] disabled:opacity-40"
                style={{ color: it.danger ? '#EF5350' : '#E8E8E8' }}
              >
                {it.label}
                {it.hint && <span className="text-[11px] text-[#888888]">{it.hint}</span>}
              </button>
            )
          )}
        </div>
      </motion.div>
    </>,
    document.body
  )
}
