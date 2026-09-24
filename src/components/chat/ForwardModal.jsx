import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { isPrivate, userLabel, groupLabel, messageSnippet } from '../../lib/chat'
import { LockIcon, SearchIcon, ForwardIcon } from '../icons'
import PersonAvatar from './PersonAvatar'
import { SPRING } from '../../lib/motion'

// "Reenviar": pick one conversation — a person, a group or a channel — and
// the message goes there as a copy labeled "Reenviado · de X en #canal",
// WhatsApp-style. An optional note is sent right after it as a normal
// message. Same centered-modal pattern as TaskFromMessageModal.
export default function ForwardModal({ message, fromLabel, users, groups, channels, currentUid, onClose, onForward }) {
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState(null) // {convType:'dm', otherUid} | {convType:'conv', convId}
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const q = search.trim().toLowerCase()
  const match = (label) => !q || label.toLowerCase().includes(q)

  const options = [
    ...users
      .filter((u) => u.id !== currentUid)
      .map((u) => ({ key: `dm:${u.id}`, target: { convType: 'dm', otherUid: u.id }, label: userLabel(u), icon: <PersonAvatar uid={u.id} name={userLabel(u)} size={22} />, hint: 'Mensaje directo' })),
    ...groups.map((g) => ({ key: g.id, target: { convType: 'conv', convId: g.id }, label: groupLabel(g, users, currentUid), icon: <Glyph>{(g.memberUids || []).length}</Glyph>, hint: 'Grupo' })),
    ...channels.map((c) => ({
      key: c.id,
      target: { convType: 'conv', convId: c.id },
      label: `#${c.name}`,
      icon: <Glyph>{isPrivate(c) ? <LockIcon size={11} /> : '#'}</Glyph>,
      hint: isPrivate(c) ? 'Canal privado' : 'Canal de la empresa',
    })),
  ].filter((o) => match(o.label))

  const isSelected = (o) => target && JSON.stringify(o.target) === JSON.stringify(target)
  const expired = message.attachment?.expired

  const send = async () => {
    if (!target || sending) return
    setSending(true)
    try {
      await onForward(target, note.trim())
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="ador-modal-surface ador-grain flex max-h-[80vh] w-[440px] flex-col rounded-[28px] p-7">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#F5F5F5]">
            <ForwardIcon size={15} className="text-[#E8C15A]" /> Reenviar mensaje
          </h2>

          <div className="mt-4 rounded-xl border-l-2 border-[#B8860B] bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] font-medium text-[#E8C15A]">
              {message.authorName} · {fromLabel}
            </p>
            <p className="line-clamp-2 text-[12.5px] text-[#AAAAAA]">{messageSnippet(message)}</p>
            {expired && <p className="mt-1 text-[11px] text-[#8A8A8A]">El archivo ya expiró — se reenvía solo el texto.</p>}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5">
            <SearchIcon size={12} className="text-[#858585]" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar persona, grupo o canal…"
              className="w-full bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#858585] outline-none"
            />
          </div>

          <div className="mt-2 flex min-h-[120px] flex-1 flex-col gap-0.5 overflow-y-auto">
            {options.length === 0 && <p className="px-2 py-3 text-[12.5px] text-[#7A7A7A]">Nada coincide con “{search.trim()}”.</p>}
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setTarget(o.target)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
                style={isSelected(o) ? { background: 'rgba(184,134,11,0.16)' } : undefined}
              >
                {o.icon}
                <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: isSelected(o) ? '#E8C15A' : '#DDDDDD' }}>
                  {o.label}
                </span>
                <span className="flex-shrink-0 text-[11px] text-[#7A7A7A]">{o.hint}</span>
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Añade un comentario (opcional)"
            className="mt-3 w-full resize-none rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-2.5 text-[13.5px] text-[#F5F5F5] placeholder:text-[#767676] outline-none focus:border-white/[0.2]"
          />

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[13.5px] text-[#888888] transition-colors hover:text-[#F5F5F5]">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!target || sending}
              onClick={send}
              className="rounded-xl px-5 py-2 text-[13.5px] font-medium text-[#1C1A16] transition-opacity disabled:opacity-40"
              style={{ background: '#E8C15A' }}
            >
              {sending ? 'Reenviando…' : 'Reenviar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

function Glyph({ children }) {
  return <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[11px] font-semibold text-[#888888]">{children}</span>
}
