import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { isMeetLink } from '../../lib/chat'
import { PhoneIcon, VideoIcon } from '../icons'

const WIDTH = 300

// The fallback path for Llamar / Videollamada. With Google connected
// (useGoogleMeet 'ready') the call is one click and this popover never
// shows. Without it, the popover leads with "connect Google once" and
// keeps the manual path below it: open a fresh Meet, paste its link, and
// it lands in the conversation as a call card.
//
// Portaled + positioned from the trigger's measured rect, with a resize
// listener — the shell's rule for every floating element (CLAUDE.md §1).
// Glass lives on the inner div, transform on the outer (§11).
export default function MeetPopover({ type, anchorRef, onClose, onSend, canConnect, onConnect }) {
  const [rect, setRect] = useState(null)
  const [url, setUrl] = useState('')
  const [opened, setOpened] = useState(false)
  const popRef = useRef(null)
  const video = type === 'video'

  useLayoutEffect(() => {
    const measure = () => anchorRef.current && setRect(anchorRef.current.getBoundingClientRect())
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [anchorRef])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [anchorRef, onClose])

  if (!rect) return null

  const valid = isMeetLink(url.trim())
  const left = Math.max(16, Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 16))

  const openMeet = () => {
    window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')
    setOpened(true)
  }

  return createPortal(
    <motion.div
      ref={popRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50"
      style={{ top: rect.bottom + 8, left, width: WIDTH }}
    >
      <div className="ador-glass ador-grain rounded-2xl p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#F5F5F5]">
          {video ? <VideoIcon size={14} /> : <PhoneIcon size={13} />}
          {video ? 'Videollamada' : 'Llamada'} con Google Meet
        </p>

        {canConnect && (
          <div className="mt-3 rounded-xl border border-[#B8860B]/35 bg-[#B8860B]/[0.07] p-3">
            <p className="text-[12.5px] font-medium text-[#F2EBDD]">Llama en un clic</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#999999]">Conecta tu cuenta de Google una sola vez: ADOR OS crea la reunión, le suena a la otra persona y te abre Meet.</p>
            <button type="button" onClick={onConnect} className="mt-2 w-full rounded-lg px-3 py-2 text-[12.5px] font-medium text-[#1C1A16]" style={{ background: '#E8C15A' }}>
              Conectar Google
            </button>
          </div>
        )}
        {canConnect && <p className="mt-3 text-[11px] text-[#555555]">O hazlo manual esta vez:</p>}

        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <Step n={1} done={opened} />
            <div className="flex-1">
              <button
                type="button"
                onClick={openMeet}
                className="w-full rounded-lg border border-white/[0.12] px-3 py-2 text-[12.5px] font-medium text-[#F5F5F5] hover:border-white/[0.24]"
              >
                Abrir Google Meet
              </button>
              {!video && <p className="mt-1 text-[10.5px] leading-snug text-[#666666]">Para solo audio, entra con la cámara apagada.</p>}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Step n={2} done={valid} />
            <div className="flex-1">
              <input
                autoFocus={opened}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && valid && onSend(url.trim())}
                placeholder="Pega el enlace: meet.google.com/..."
                className="w-full rounded-lg border border-white/[0.1] bg-[#141414] px-3 py-2 text-[12px] text-[#F5F5F5] placeholder:text-[#555555] outline-none focus:border-white/[0.2]"
              />
              {url.trim() && !valid && <p className="mt-1 text-[10.5px] text-[#EF5350]">Eso no parece un enlace de Google Meet.</p>}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!valid}
          onClick={() => onSend(url.trim())}
          className="mt-3.5 w-full rounded-lg border border-white/[0.12] px-3 py-2 text-[12.5px] font-medium text-[#F5F5F5] transition-opacity disabled:opacity-35"
        >
          Enviar invitación al chat
        </button>
      </div>
    </motion.div>,
    document.body
  )
}

function Step({ n, done }) {
  return (
    <span
      className="mt-1.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold"
      style={{ background: done ? 'rgba(76,175,80,0.18)' : 'rgba(255,255,255,0.06)', color: done ? '#4CAF50' : '#888888' }}
    >
      {done ? '✓' : n}
    </span>
  )
}
