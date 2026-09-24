import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { SHEET, swipeToClose } from '../../lib/motion'

// Phones: press and hold a message → this sheet, like iMessage/WhatsApp.
// It holds everything the desktop hover toolbar and ⋯ menu offer (which
// don't exist on a touch screen): reactions on top, then the actions.
// Every option is passed in by MessageBubble, already bound to the message.
export default function MessageActionSheet({ preview, reactions, onReact, options, reminderOptions, onRemind, onClose }) {
  const [view, setView] = useState('main') // 'main' | 'remind' | 'confirm-delete'

  const row = (label, onClick, { danger = false, keepOpen = false } = {}) => (
    <button
      key={label}
      type="button"
      onClick={() => {
        onClick()
        if (!keepOpen) onClose()
      }}
      className="flex w-full items-center px-5 py-3.5 text-left text-[16px] active:bg-white/[0.08]"
      style={{ color: danger ? '#FF6B63' : '#F5F5F5' }}
    >
      {label}
    </button>
  )

  let list
  if (view === 'remind') {
    list = reminderOptions.map((o) => row(o.label, () => onRemind(o.at)))
  } else if (view === 'confirm-delete') {
    list = [row('Eliminar mensaje', options.find((o) => o.delete).onClick, { danger: true }), row('Cancelar', () => setView('main'), { keepOpen: true })]
  } else {
    list = options.map((o) =>
      o.delete
        ? row(o.label, () => setView('confirm-delete'), { danger: true, keepOpen: true })
        : o.remind
          ? row(o.label, () => setView('remind'), { keepOpen: true })
          : row(o.label, o.onClick)
    )
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/55 backdrop-blur-[6px]" onClick={onClose}>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={SHEET}
        {...swipeToClose('y', onClose)}
        onClick={(e) => e.stopPropagation()}
        className="px-2"
        style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
      >
        {preview && <p className="mx-3 mb-2 line-clamp-3 rounded-2xl bg-white/[0.07] px-4 py-2.5 text-[14px] leading-snug text-[#DDDDDD]">{preview}</p>}
        {reactions && view === 'main' && (
          <div className="mb-2 flex justify-between rounded-full bg-[#1C1C1E] px-3 py-2">
            {reactions.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onReact(e)
                  onClose()
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[24px] transition-transform active:scale-125"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="max-h-[52vh] overflow-y-auto rounded-2xl bg-[#1C1C1E] [&>button+button]:border-t [&>button+button]:border-white/[0.07]">{list}</div>
        <button type="button" onClick={onClose} className="mt-2 w-full rounded-2xl bg-[#1C1C1E] py-3.5 text-[16px] font-semibold text-[#E8C15A] active:bg-[#2A2A2C]">
          Cancelar
        </button>
      </motion.div>
    </motion.div>,
    document.body
  )
}
