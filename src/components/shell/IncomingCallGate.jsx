import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { subscribeIncomingCalls, respondToChatCall, subscribeUsers } from '../../lib/firestore'
import Avatar from './Avatar'
import { PhoneIcon, VideoIcon, CloseIcon } from '../icons'

// How long a call rings before it quietly becomes "missed" — the call card
// in the conversation stays either way, this only controls the ringing.
const RING_MS = 45_000

// A soft two-tone ring built with Web Audio — no audio file to ship or
// license. Browsers only allow sound after the person has interacted with
// the page at least once; if they haven't, this fails silently and the
// visual overlay + system notification still do the job.
function useRingtone(active) {
  useEffect(() => {
    if (!active) return
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    ctx.resume().catch(() => {})
    const burst = () => {
      const t = ctx.currentTime
      for (const [offset, freq] of [
        [0, 880],
        [0.18, 660],
        [0.5, 880],
        [0.68, 660],
      ]) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, t + offset)
        gain.gain.linearRampToValueAtTime(0.12, t + offset + 0.02)
        gain.gain.linearRampToValueAtTime(0, t + offset + 0.16)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t + offset)
        osc.stop(t + offset + 0.18)
      }
    }
    burst()
    const interval = setInterval(burst, 2500)
    return () => {
      clearInterval(interval)
      ctx.close().catch(() => {})
    }
  }, [active])
}

// Layer 2: when ADOR OS is open but not the tab you're looking at, a real
// operating-system notification (Notification API, permission asked once
// from Chat's sidebar — see CallNotificationsPrompt). Also flashes the tab
// title, which catches the eye even with notifications turned off.
function useBackgroundAlert(call) {
  useEffect(() => {
    if (!call) return
    let notification = null
    const title = `${call.fromName} te está llamando`
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && (document.hidden || !document.hasFocus())) {
      notification = new Notification(title, {
        body: `${call.type === 'video' ? 'Videollamada' : 'Llamada'} en Google Meet · ${call.conversationLabel}`,
        tag: `ador-call-${call.id}`,
        requireInteraction: true,
      })
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }
    const original = document.title
    let flip = false
    const titleTimer = setInterval(() => {
      if (!document.hidden) {
        document.title = original
        return
      }
      flip = !flip
      document.title = flip ? `📞 ${title}` : original
    }, 1000)
    return () => {
      clearInterval(titleTimer)
      document.title = original
      notification?.close()
    }
    // Keyed on the call's id, not the object: the gate re-renders every
    // second while ringing, and a new notification per tick would spam.
  }, [call?.id])
}

// Layer 1: the app-wide "llamada entrante" screen. Mounted once in
// AppShell.jsx (same as AssignmentConfirmGate) so it rings no matter which
// module is open. Listens to chatCalls where you're a recipient and shows
// the newest one that's still inside its ring window and you haven't
// answered. What it can't do: ring when ADOR OS isn't open at all — that
// needs Web Push + a service worker (the parked PWA phase 3, CLAUDE.md §34).
export default function IncomingCallGate({ user }) {
  const [calls, setCalls] = useState([])
  const [users, setUsers] = useState([])
  const [dismissed, setDismissed] = useState(() => new Set())
  const [now, setNow] = useState(() => Date.now())
  const busyRef = useRef(false)

  useEffect(() => {
    if (!user?.uid || user.uid === 'preview') return
    return subscribeIncomingCalls(user.uid, setCalls)
  }, [user?.uid])
  useEffect(() => subscribeUsers(setUsers), [])

  const ringing = calls
    .filter((c) => c.createdAt?.toMillis && now - c.createdAt.toMillis() < RING_MS && !c.responses?.[user.uid] && !dismissed.has(c.id))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
  const current = ringing[0] || null

  // Re-evaluates the ring window every second while something might ring,
  // so a call expires on time even if no new Firestore snapshot arrives.
  const hasCandidates = calls.some((c) => c.createdAt?.toMillis && Date.now() - c.createdAt.toMillis() < RING_MS)
  useEffect(() => {
    if (!hasCandidates) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [hasCandidates])

  useRingtone(Boolean(current))
  useBackgroundAlert(current)

  const respond = (response) => {
    if (!current || busyRef.current) return
    const id = current.id
    // Stop ringing locally right away, even if the write is slow or fails.
    setDismissed((prev) => new Set(prev).add(id))
    if (response === 'joined') window.open(current.url, '_blank', 'noopener,noreferrer')
    busyRef.current = true
    respondToChatCall(id, user.uid, response)
      .catch(() => {})
      .finally(() => {
        busyRef.current = false
      })
  }

  if (!current) return null
  const video = current.type === 'video'
  const caller = users.find((u) => u.id === current.fromUid)

  return createPortal(
    <motion.div
      key={current.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-[10px]"
    >
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <div className="ador-modal-surface ador-grain flex w-[340px] flex-col items-center rounded-[28px] px-8 pt-9 pb-8 text-center">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-[96px] w-[96px] rounded-full" style={{ background: 'rgba(76,175,80,0.18)', animation: 'ador-pulse 1.6s ease-in-out infinite' }} />
            <Avatar displayName={current.fromName} photoURL={caller?.photoDataUrl} size={72} />
          </div>
          <p className="mt-5 text-[17px] font-semibold text-[#F5F5F5]">{current.fromName}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#888888]">
            {video ? <VideoIcon size={13} /> : <PhoneIcon size={12} />}
            {video ? 'Videollamada' : 'Llamada'} entrante · Google Meet
          </p>
          <p className="mt-0.5 text-[11.5px] text-[#555555]">{current.conversationLabel}</p>
          {ringing.length > 1 && <p className="mt-2 text-[11px] text-[#B8860B]">+{ringing.length - 1} llamada{ringing.length > 2 ? 's' : ''} más</p>}

          <div className="mt-8 flex w-full items-start justify-center gap-12">
            <button type="button" onClick={() => respond('declined')} className="flex flex-col items-center gap-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ background: '#EF5350' }}>
                <CloseIcon size={18} />
              </span>
              <span className="text-[11.5px] text-[#888888]">Rechazar</span>
            </button>
            <button type="button" onClick={() => respond('joined')} className="flex flex-col items-center gap-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ background: '#4CAF50' }}>
                {video ? <VideoIcon size={20} /> : <PhoneIcon size={18} />}
              </span>
              <span className="text-[11.5px] text-[#888888]">Unirse</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
