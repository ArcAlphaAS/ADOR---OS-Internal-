import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

// Desktop right-click on a message: the same actions the phone's press-and-
// hold sheet and the ⋯ menu offer, at the cursor. Options come bound to the
// message from MessageBubble ({label, onClick, remind?, delete?}).
export default function MessageContextMenu({ x, y, reactions = [], onReact, options, reminderOptions = [], onRemind, onClose }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })
  const [view, setView] = useState('main') // 'main' | 'remind'
  const [confirmDelete, setConfirmDelete] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) })
  }, [x, y, view, confirmDelete])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const row = (key, label, onClick, danger) => (
    <button key={key} type="button" onClick={onClick} className="w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.07]" style={{ color: danger ? '#EF5350' : '#E8E8E8' }}>
      {label}
    </button>
  )

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[998]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <motion.div ref={ref} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="fixed z-[999] w-[220px]" style={{ left: pos.left, top: pos.top, transformOrigin: 'top left' }} onClick={(e) => e.stopPropagation()}>
        <div className="ador-glass ador-grain max-h-[70vh] overflow-y-auto rounded-xl p-1.5">
          {view === 'remind' ? (
            <>
              {reminderOptions.map((o) =>
                row(o.label, o.label, () => {
                  onRemind(o.at)
                  onClose()
                })
              )}
              {row('back', '‹ Volver', () => setView('main'))}
            </>
          ) : (
            <>
              {reactions.length > 0 && (
                <div className="mb-1 flex justify-between rounded-lg bg-white/[0.04] px-1.5 py-1">
                  {reactions.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        onReact(e)
                        onClose()
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[16px] transition-transform hover:scale-125"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
              {options.map((o) =>
                o.delete
                  ? confirmDelete
                    ? row(o.label, 'Clic otra vez para eliminar', () => {
                        o.onClick()
                        onClose()
                      }, true)
                    : row(o.label, o.label, () => setConfirmDelete(true), true)
                  : o.remind
                    ? row(o.label, `${o.label} ▸`, () => setView('remind'))
                    : row(o.label, o.label, () => {
                        o.onClick()
                        onClose()
                      })
              )}
            </>
          )}
        </div>
      </motion.div>
    </>,
    document.body
  )
}
