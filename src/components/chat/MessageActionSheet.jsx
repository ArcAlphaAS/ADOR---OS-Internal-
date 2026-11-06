import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { SHEET, swipeToClose } from '../../lib/motion'
import { EMOJIS } from '../../lib/chat'

const ic = (d) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
// Icono y una línea de ayuda por opción (según su nombre), como en una hoja de iOS.
const META = [
  [/^Responder en hilo/, ic(<><path d="M4 5.5h16v10H11l-4 3.5v-3.5H4v-10Z" /><path d="M8 9.5h8M8 12.5h5" /></>), 'Una conversación aparte debajo del mensaje'],
  [/^Responder/, ic(<path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 7 7v2" />), 'Cita este mensaje en tu respuesta'],
  [/^Copiar/, ic(<><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>), 'Copia el texto al portapapeles'],
  [/^(Guardar|Quitar de guardados|Guardado)/, ic(<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" />), 'Lo encuentras en Mensajes guardados'],
  [/^Reenviar/, ic(<path d="m15 5 5 5-5 5M20 10H9a5 5 0 0 0-5 5v3" />), 'Envíalo a otra persona o canal'],
  [/^(Fijar|Desfijar)/, ic(<><path d="m14 4 6 6-3 1-3.5 3.5.5 4-1.5 1.5-4-4L5 21l-.5-.5L8 15l-4-4 1.5-1.5 4 .5L13 6.5 14 4Z" /></>), 'Déjalo a la vista arriba de la conversación'],
  [/^Record/, ic(<><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4l2.5 1.5M5 4 3 6M19 4l2 2" /></>), 'Te lo muestro a la hora que elijas'],
  [/^Crear tarea/, ic(<><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.3 2.4 2.4 4.6-5" /></>), 'Conviértelo en una tarea de Workspace'],
  [/^Editar/, ic(<path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />), 'Corrige el texto'],
  [/^Eliminar/, ic(<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />), 'Se borra para todos'],
]
const metaFor = (label) => META.find(([re]) => re.test(label)) || [null, null, null]

// Phones: press and hold a message → this sheet, like iMessage/WhatsApp.
// It holds everything the desktop hover toolbar and ⋯ menu offer (which
// don't exist on a touch screen): reactions on top, then the actions.
// Every option is passed in by MessageBubble, already bound to the message.
export default function MessageActionSheet({ preview, reactions, onReact, options, reminderOptions, onRemind, onClose }) {
  const [view, setView] = useState('main') // 'main' | 'remind' | 'confirm-delete'
  const [allEmojis, setAllEmojis] = useState(false)

  const row = (label, onClick, { danger = false, keepOpen = false, plain = false } = {}) => {
    const [icon, hint] = plain ? [null, null] : metaFor(label)
    return (
      <button
        key={label}
        type="button"
        onClick={() => {
          onClick()
          if (!keepOpen) onClose()
        }}
        className="flex w-full items-center gap-3.5 px-5 py-3 text-left active:bg-white/[0.08]"
        style={{ color: danger ? '#FF6B63' : '#F5F5F5' }}
      >
        {icon && (
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: danger ? 'rgba(255,107,99,0.14)' : '#2C2C2E', color: danger ? '#FF6B63' : '#E4DCCB' }}>
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[16px]">{label}</span>
          {hint && <span className="block text-[12.5px] font-normal text-[#8E8E93]">{hint}</span>}
        </span>
      </button>
    )
  }

  let list
  if (view === 'remind') {
    list = reminderOptions.map((o) => row(o.label, () => onRemind(o.at), { plain: true }))
  } else if (view === 'confirm-delete') {
    list = [row('Eliminar mensaje', options.find((o) => o.delete).onClick, { danger: true }), row('Cancelar', () => setView('main'), { keepOpen: true, plain: true })]
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
        {reactions && view === 'main' && allEmojis && (
          <div className="mb-2 grid grid-cols-8 gap-0.5 rounded-[22px] bg-[#1C1C1E] p-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { onReact(e); onClose() }} className="flex h-10 items-center justify-center rounded-xl text-[22px] active:bg-white/[0.1]">{e}</button>
            ))}
          </div>
        )}
        {reactions && view === 'main' && !allEmojis && (
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
            <button type="button" onClick={() => setAllEmojis(true)} aria-label="Más emojis" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-[20px] text-[#C9C9C9]">＋</button>
          </div>
        )}
        <div className="max-h-[52vh] overflow-y-auto rounded-[26px] bg-[#1C1C1E] [&>button+button]:border-t [&>button+button]:border-white/[0.07]">{list}</div>
        <button type="button" onClick={onClose} className="mt-2 w-full rounded-2xl bg-[#1C1C1E] py-3.5 text-[16px] font-semibold text-[#F4EEE2] active:bg-[#2A2A2C]">
          Cancelar
        </button>
      </motion.div>
    </motion.div>,
    document.body
  )
}
