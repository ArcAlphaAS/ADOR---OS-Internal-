import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useChatNotifications, useChatUnreadCount } from '../../hooks/useChatNotifications'
import { subscribeMyPresence } from '../../lib/firestore'
import { presenceOf } from '../../lib/chat'
import Avatar from './Avatar'
import { CloseIcon } from '../icons'
import { isPushOnHere } from '../../lib/push'

const SHOW_MS = 6000
const BASE_TITLE = 'ADOR OS'

// A short, soft two-note chime (Web Audio, no file). Only plays after the
// person has interacted with the page — browsers block it otherwise.
function chime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioCtx()
    const t = ctx.currentTime
    ;[
      [0, 740],
      [0.09, 988],
    ].forEach(([offset, freq]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t + offset)
      gain.gain.linearRampToValueAtTime(0.06, t + offset + 0.015)
      gain.gain.linearRampToValueAtTime(0, t + offset + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t + offset)
      osc.stop(t + offset + 0.2)
    })
    setTimeout(() => ctx.close().catch(() => {}), 600)
  } catch {
    // no audio available — the visual toast still shows
  }
}

// How people find out about new messages while they're somewhere else in
// ADOR OS (Workspace, Clientes…), Slack-style. Mounted once in AppShell.
//   - A toast bottom-left for each new message addressed to you (DM,
//     @mention, private group, reply in your thread) with a soft chime;
//     click opens the conversation at that message. Not shown while you're
//     already in Comunicación.
//   - An OS notification too, when ADOR OS isn't the window in front.
//   - "(3) ADOR OS" in the browser tab = conversations with unread messages.
// The bell and the number on the Comunicación icon cover the same things
// persistently; the toast is just the "it just arrived" moment.
export default function ChatMessageToaster({ user, activeModule, onNavigate }) {
  const uid = user?.uid
  const items = useChatNotifications(uid, onNavigate)
  const unread = useChatUnreadCount(uid)
  const seenRef = useRef(null)
  const [toasts, setToasts] = useState([])
  const [myPresence, setMyPresence] = useState(null)

  useEffect(() => {
    if (!uid || uid === 'preview') return
    return subscribeMyPresence(uid, setMyPresence)
  }, [uid])

  useEffect(() => {
    document.title = unread ? `(${unread}) ${BASE_TITLE}` : BASE_TITLE
  }, [unread])

  useEffect(() => {
    const incoming = items.filter((i) => !i.reminder && i.key)
    // First load: everything already there is backlog, not "new".
    if (seenRef.current === null) {
      if (!uid || uid === 'preview') return
      seenRef.current = new Set(incoming.map((i) => i.key))
      return
    }
    const fresh = incoming.filter((i) => !seenRef.current.has(i.key))
    if (!fresh.length) return
    fresh.forEach((i) => seenRef.current.add(i.key))

    // No molestar: nothing pops or sounds — the badge, tab count and bell
    // still collect everything for later. En reunión: shown, but silent.
    const availability = presenceOf(myPresence).status
    if (availability === 'dnd') return
    const silent = availability === 'meeting'

    // ADOR OS not in front (background tab, or another app focused): OS
    // notification. Visible on screen: the in-app toast as well.
    const inFront = document.visibilityState === 'visible' && document.hasFocus()
    if (!inFront) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && !isPushOnHere()) {
        for (const i of fresh.slice(0, 3)) {
          const n = new Notification(i.from ? `${i.from} · ADOR OS` : 'Nuevo mensaje · ADOR OS', { body: i.text, tag: `ador-msg-${i.key}`, silent })
          n.onclick = () => {
            window.focus()
            i.onClick()
            n.close()
          }
        }
      }
    }
    if (document.visibilityState !== 'visible' || activeModule === 'chat') return
    if (!silent) chime()
    setToasts((prev) => [...fresh.map((i) => ({ ...i, shownAt: Date.now() })), ...prev].slice(0, 3))
  }, [items, activeModule, uid, myPresence])

  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => setToasts((prev) => prev.filter((x) => Date.now() - x.shownAt < SHOW_MS)), 1000)
    return () => clearTimeout(t)
  }, [toasts])

  // Entering Comunicación clears any toasts still on screen.
  useEffect(() => {
    if (activeModule === 'chat') setToasts([])
  }, [activeModule])

  return createPortal(
    <div className="pointer-events-none fixed bottom-[calc(96px+env(safe-area-inset-bottom))] left-4 z-[64] flex w-[min(320px,calc(100vw-32px))] flex-col-reverse gap-2 lg:bottom-6 lg:left-24">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="pointer-events-auto">
            {/* Opaque surface, not glass: it floats over busy module content and
                has to read at a glance. */}
            <div className="ador-modal-surface ador-grain flex items-start gap-3 rounded-2xl p-3.5" style={{ borderColor: 'rgba(184,134,11,0.3)' }}>
              <button
                type="button"
                onClick={() => {
                  setToasts((prev) => prev.filter((x) => x.key !== t.key))
                  t.onClick()
                }}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <Avatar displayName={t.from || 'ADOR'} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium text-[#E8C15A]">Nuevo mensaje · abrir</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-relaxed text-[#DDDDDD]">{t.text}</span>
                </span>
              </button>
              <button type="button" onClick={() => setToasts((prev) => prev.filter((x) => x.key !== t.key))} className="flex-shrink-0 text-[#858585] hover:text-[#F5F5F5]">
                <CloseIcon size={11} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
