import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useEscape } from '../../hooks/useEscape'

// Menú de clic derecho (o mantener presionado en el teléfono), el mismo en toda
// la app: se abre en el cursor, no se sale de la pantalla y se cierra con Esc,
// con un clic fuera o al desplazar. `items`: [{label, onClick, danger, hint, icon}]
// o { divider: true }. Un elemento sin opciones propias deja el menú del navegador.
export default function ContextMenu({ x, y, title, subtitle, items, onClose }) {
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
                {subtitle && <p className="truncate text-[11px] text-[#767676]">{subtitle}</p>}
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
