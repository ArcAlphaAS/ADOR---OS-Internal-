import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { subscribeMyReminders, updateChatReminder } from '../../lib/firestore'
import { Timestamp } from 'firebase/firestore'
import { ClockIcon, CloseIcon } from '../icons'

// "Recuérdamelo" delivery, app-wide (mounted in AppShell.jsx). When a
// reminder's time comes while ADOR OS is open, a card appears top-right
// (plus an OS notification if call notifications were allowed); if the app
// was closed, it appears the moment it's opened. It stays until handled:
// Ver mensaje (opens it and marks done), Posponer 1 h, or Listo. The bell
// also lists it (useChatNotifications) so it can't slip by unseen.
export default function ReminderGate({ user, onNavigate }) {
  const [reminders, setReminders] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const notifiedRef = useRef(new Set())

  useEffect(() => {
    if (!user?.uid || user.uid === 'preview') return
    return subscribeMyReminders(user.uid, setReminders)
  }, [user?.uid])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000)
    return () => clearInterval(t)
  }, [])

  const due = reminders
    .filter((r) => !r.done && r.remindAt?.toMillis && r.remindAt.toMillis() <= now)
    .sort((a, b) => a.remindAt.toMillis() - b.remindAt.toMillis())
  const current = due[0] || null

  useEffect(() => {
    if (!current || notifiedRef.current.has(current.id)) return
    notifiedRef.current.add(current.id)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && (document.hidden || !document.hasFocus())) {
      const n = new Notification('Recordatorio de ADOR OS', { body: `${current.authorName ? `${current.authorName}: ` : ''}${current.text}`, tag: `ador-reminder-${current.id}` })
      n.onclick = () => {
        window.focus()
        n.close()
      }
    }
  }, [current?.id])

  if (!current) return null

  const done = () => updateChatReminder(current.id, { done: true }).catch(() => {})
  const snooze = () => updateChatReminder(current.id, { remindAt: Timestamp.fromMillis(Date.now() + 60 * 60000) }).catch(() => {})
  const open = () => {
    done()
    onNavigate('chat', {
      type: 'chat',
      convType: current.convType,
      convId: current.convId,
      participantUids: current.participantUids,
      messageId: current.messageId,
      threadParentId: current.threadParentId,
    })
  }

  return createPortal(
    <motion.div key={current.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="fixed top-[72px] right-5 z-[66] w-[320px]">
      <div className="ador-glass ador-grain rounded-2xl p-4" style={{ borderColor: 'rgba(184,134,11,0.35)' }}>
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(184,134,11,0.16)', color: '#E8C15A' }}>
            <ClockIcon size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-[#F2EBDD]">Recordatorio</p>
            <p className="text-[11px] text-[#777777]">{current.conversationLabel}</p>
            <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-[#CCCCCC]">
              {current.authorName ? <span className="text-[#999999]">{current.authorName.split(' ')[0]}: </span> : null}
              {current.text || 'Mensaje'}
            </p>
          </div>
          <button type="button" onClick={done} title="Listo" className="flex-shrink-0 text-[#666666] hover:text-[#F5F5F5]">
            <CloseIcon size={11} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={open} className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#1C1A16]" style={{ background: '#E8C15A' }}>
            Ver mensaje
          </button>
          <button type="button" onClick={snooze} className="rounded-full border border-white/[0.12] px-3 py-1.5 text-[12px] text-[#CCCCCC] hover:text-[#F5F5F5]">
            Posponer 1 h
          </button>
          {due.length > 1 && <span className="ml-auto text-[11px] text-[#777777]">+{due.length - 1}</span>}
        </div>
      </div>
    </motion.div>,
    document.body
  )
}
