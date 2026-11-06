import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { subscribeUsers, createKudos } from '../../lib/firestore'
import { userLabel } from '../../lib/chat'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { useEscape } from '../../hooks/useEscape'
import { SPRING } from '../../lib/motion'
import PersonAvatar from '../chat/PersonAvatar'

// "Dar las gracias": elegir a alguien y decirle, en una línea, por qué. Aparece
// en "Hoy en el equipo" para todos, y a esa persona le llega un aviso.
const IDEAS = ['por tu ayuda con…', 'por cerrar…', 'por tomarte el tiempo de…', 'por cubrirme en…']

export default function ThanksModal({ me, onClose }) {
  useEscape(onClose)
  const showToast = useToast()
  const [people, setPeople] = useState([])
  const [to, setTo] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  useEffect(() => subscribeUsers(setPeople), [])
  const others = people.filter((u) => u.id !== me.uid)
  const canSend = to && text.trim().length >= 3 && !sending

  const send = async () => {
    setSending(true)
    try {
      await withTimeout(createKudos({ fromUid: me.uid, fromName: me.displayName || me.email?.split('@')[0], toUid: to.id, toName: userLabel(to), text: text.trim() }))
      showToast(`Le diste las gracias a ${userLabel(to).split(' ')[0]} 🙌`)
      onClose()
    } catch (error) {
      showToast(`No se pudo enviar: ${error.message}`)
      setSending(false)
    }
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={SPRING} onClick={(e) => e.stopPropagation()}>
        <div className="ador-modal-surface ador-grain w-[440px] max-w-[92vw] rounded-[28px] p-7">
          <h2 className="text-[20px] font-semibold text-[#F5F5F5]">Dar las gracias 🙌</h2>
          <p className="mt-1 text-[13.5px] text-[#8E8E93]">Un reconocimiento real, en una línea. Lo verá el equipo.</p>

          <p className="mb-2 mt-5 text-[13px] font-medium text-[#8E8E93]">¿A quién?</p>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {others.map((u) => (
              <button key={u.id} type="button" onClick={() => setTo(u)} className="flex w-[64px] flex-shrink-0 flex-col items-center gap-1.5">
                <span className="rounded-full p-[3px]" style={{ boxShadow: to?.id === u.id ? '0 0 0 2px #F4EEE2' : '0 0 0 2px transparent', opacity: !to || to.id === u.id ? 1 : 0.5 }}>
                  <PersonAvatar uid={u.id} name={userLabel(u)} size={54} />
                </span>
                <span className="w-full truncate text-center text-[12.5px] text-[#D5D5D5]">{userLabel(u).split(' ')[0]}</span>
              </button>
            ))}
            {others.length === 0 && <p className="text-[13px] text-[#767676]">Aparecerán cuando tus socios entren a ADOR OS.</p>}
          </div>

          <p className="mb-2 mt-5 text-[13px] font-medium text-[#8E8E93]">¿Por qué?</p>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 140))} rows={3} placeholder="Gracias por…" className="w-full resize-none rounded-2xl bg-white/[0.06] px-4 py-3 text-[16px] text-[#F5F5F5] placeholder:text-[#767676] outline-none md:text-[14px]" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {IDEAS.map((i) => (
              <button key={i} type="button" onClick={() => setText((t) => (t.trim() ? t : `Gracias ${i}`))} className="rounded-full bg-white/[0.06] px-3 py-1 text-[12px] text-[#9A9A9A]">{i}</button>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2.5">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-3 text-[14px] text-[#8E8E93]">Cancelar</button>
            <button type="button" disabled={!canSend} onClick={send} className="ador-btn-primary flex-1 rounded-full py-3 text-[14.5px] font-semibold disabled:opacity-40">
              {sending ? 'Enviando…' : 'Enviar gracias'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
