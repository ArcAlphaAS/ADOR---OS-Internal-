import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import PersonAvatar from '../chat/PersonAvatar'
import { SHEET } from '../../lib/motion'
import { useSheetDrag } from '../../hooks/useSheetDrag'
import { haptic } from '../../lib/haptics'

// Elegir invitados en el teléfono, como el selector de contactos de iOS: una hoja con
// buscador redondeado, los elegidos arriba en una fila, y la lista de la organización con una
// marca de selección. Cada toque suma o quita al instante; "Listo" solo cierra.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Check({ on }) {
  return (
    <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150" style={on ? { background: '#F4EEE2' } : { boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.28)' }}>
      {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
    </span>
  )
}

export default function GuestSheet({ guests, setGuests, people, onClose }) {
  const sheet = useSheetDrag(onClose)
  const [q, setQ] = useState('')
  const picked = new Set(guests.map((g) => g.email))
  const byEmail = useMemo(() => Object.fromEntries(people.map((p) => [p.email, p])), [people])
  const query = fold(q.trim())
  const list = people.filter((p) => !query || fold(`${p.name} ${p.email} ${p.role || ''} ${p.area || ''}`).includes(query))
  const typed = q.trim().toLowerCase()
  const offerEmail = EMAIL_RE.test(typed) && !byEmail[typed] && !picked.has(typed)

  const toggle = (email) => {
    haptic('tap')
    setGuests((cur) => (cur.some((g) => g.email === email) ? cur.filter((g) => g.email !== email) : [...cur, { email }]))
  }
  const addTyped = () => { toggle(typed); setQ('') }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[70]" onClick={onClose}>
      <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-[10px]" style={{ opacity: sheet.backdrop }} />
      <div className="absolute inset-x-0 bottom-0">
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={SHEET} onClick={(e) => e.stopPropagation()}>
          <motion.div ref={sheet.sheetRef} style={{ y: sheet.y }}>
            <div className="ador-modal-surface flex flex-col overflow-hidden" style={{ padding: 0, height: '88dvh', maxHeight: '88dvh', borderRadius: '30px 30px 0 0' }}>
              <div className="flex-shrink-0">
                <div className="mx-auto mt-2 h-[5px] w-10 rounded-full bg-white/[0.22]" />
                <div className="flex items-center justify-between px-5 pb-3 pt-3">
                  <span className="min-w-[78px]" />
                  <h2 className="text-[17px] font-semibold text-[#F5F5F5]">Invitados</h2>
                  <button type="button" onClick={onClose} className="min-w-[78px] text-right text-[17px] font-semibold text-[#F4EEE2] active:opacity-60">Listo</button>
                </div>
                <div className="px-4 pb-3">
                  <label className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.09] px-3 py-2.5">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                    <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (offerEmail) addTyped() } }} type="search" enterKeyHint="done" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Buscar personas o escribir un correo" className="min-w-0 flex-1 bg-transparent text-[16px] text-[#F5F5F5] placeholder:text-[#8E8E93] outline-none" />
                    {q && <button type="button" onClick={() => setQ('')} aria-label="Borrar búsqueda" className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#8E8E93] text-[12px] leading-none text-black">×</button>}
                  </label>
                </div>
                {guests.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto px-5 pb-3" style={{ scrollbarWidth: 'none' }}>
                    {guests.map((g) => {
                      const p = byEmail[g.email]
                      return (
                        <button key={g.email} type="button" onClick={() => toggle(g.email)} className="flex w-[58px] flex-shrink-0 flex-col items-center gap-1 active:opacity-70" aria-label={`Quitar ${g.email}`}>
                          <span className="relative"><PersonAvatar name={p?.name || g.email} photo={p?.photo} size={44} />
                            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#3A3A3C] text-[12px] leading-none text-white ring-2 ring-[#1C1C1E]">×</span>
                          </span>
                          <span className="w-full truncate text-center text-[12px] text-[#E4E4E4]">{(p?.name || g.email).split(/[\s@]/)[0]}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div ref={sheet.scrollRef} className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+24px)]" style={{ overscrollBehavior: 'contain' }}>
                {offerEmail && (
                  <button type="button" onClick={addTyped} className="flex w-full items-center gap-3.5 px-5 py-3 text-left active:bg-white/[0.06]">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.09] text-[#E4E4E4]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 8l9 6 9-6" /></svg>
                    </span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[16px] text-[#F5F5F5]">Invitar a {typed}</span><span className="block text-[13px] text-[#8E8E93]">Correo externo</span></span>
                    <Check on={false} />
                  </button>
                )}
                {!query && list.length > 0 && <p className="px-5 pb-1 pt-1.5 text-[13px] text-[#8E8E93]">Tu organización</p>}
                {list.map((p, i) => (
                  <button key={p.email} type="button" onClick={() => toggle(p.email)} className="flex w-full items-center gap-3.5 pl-5 pr-5 text-left active:bg-white/[0.06]">
                    <PersonAvatar name={p.name} photo={p.photo} size={44} />
                    <span className="min-w-0 flex-1 py-3" style={i > 0 ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' } : undefined}>
                      <span className="block truncate text-[16px] text-[#F5F5F5]">{p.name}</span>
                      <span className="block truncate text-[13px] text-[#8E8E93]">{[p.role, p.email].filter(Boolean).join(' · ')}</span>
                    </span>
                    <Check on={picked.has(p.email)} />
                  </button>
                ))}
                {list.length === 0 && !offerEmail && (
                  <p className="px-8 py-12 text-center text-[15px] leading-snug text-[#8E8E93]">{query ? 'Nadie coincide. Escribe un correo completo para invitar a alguien de fuera.' : 'Aún no hay personas en tu organización.'}</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>,
    document.body
  )
}
