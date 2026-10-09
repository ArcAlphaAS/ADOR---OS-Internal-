import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { CakeIcon } from '../icons'
import Avatar from './Avatar'
import useDeferredReveal from '../../hooks/useDeferredReveal'
import { subscribeDirectoryPeople, dmIdFor } from '../../lib/firestore'
import { setDraft } from '../../lib/chatDrafts'

// The little cake in the top bar: it only exists on a day someone at ADOR has
// a birthday, with a gold dot until you've opened it today. It opens a glass
// card (portaled and measured from the button, like the bell) with the
// person's photo, name, role and date, and one action that opens a direct
// message with a greeting already written — you can edit it or just send.
// On your own birthday it's a greeting to you, no action.
const SEEN_KEY = 'ador_birthday_seen'
const todayStamp = () => new Date().toDateString()

function wasSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === todayStamp()
  } catch {
    return false
  }
}

function longDate(birthday) {
  if (!birthday) return null
  const [, m, d] = birthday.split('-').map(Number)
  return new Date(2000, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'long' })
}

function Card({ person, directoryEntry, isSelf, onGreet }) {
  const first = person.displayName.split(' ')[0]
  const role = [directoryEntry?.role, directoryEntry?.area].filter(Boolean).join(' · ')
  return (
    <div className="px-6 pb-6 pt-6">
      <div className="flex items-start justify-between">
        <span className="rounded-full">
          <Avatar photoURL={directoryEntry?.photoDataUrl || person.photoDataUrl} displayName={person.displayName} size={72} />
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8C15A]/30 text-[#E8C15A]">
          <CakeIcon size={17} />
        </span>
      </div>
      <h3 className="mt-4 text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[#F5F5F5]">{person.displayName}</h3>
      {role && <p className="mt-0.5 text-[14px] text-[#8A8A8A]">{role}</p>}
      <div className="mt-5 flex items-center gap-6 border-y border-white/[0.07] py-3.5">
        <div>
          <p className="text-[15px] font-semibold text-[#F5F5F5]">Hoy</p>
          <p className="mt-0.5 text-[12px] text-[#767676]">Cumpleaños</p>
        </div>
        {longDate(person.birthday) && (
          <div>
            <p className="text-[15px] font-semibold text-[#F5F5F5]">{longDate(person.birthday)}</p>
            <p className="mt-0.5 text-[12px] text-[#767676]">Fecha</p>
          </div>
        )}
      </div>
      {isSelf ? (
        <p className="mt-4 text-[14px] leading-relaxed text-[#C9C9C9]">¡Feliz cumpleaños, {first}! Todo el equipo ADOR te desea un gran día.</p>
      ) : (
        <button
          type="button"
          onClick={onGreet}
          className="mt-5 w-full rounded-full bg-[#F5F5F5] py-3 text-[14px] font-semibold text-[#0A0A0A] transition-opacity duration-200 hover:opacity-85"
        >
          Salúdalo por su cumpleaños
        </button>
      )}
    </div>
  )
}

export default function BirthdayCenter({ birthdays, user, onNavigate }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const [seen, setSeen] = useState(wasSeen)
  const [button, setButton] = useState(null)
  const [directory, setDirectory] = useState([])
  const ready = useDeferredReveal()
  const hasBirthdays = birthdays.length > 0

  useEffect(() => (hasBirthdays ? subscribeDirectoryPeople(setDirectory) : undefined), [hasBirthdays])

  // Measured from the button, and again on resize (same rule as every other
  // floating surface — see CLAUDE.md §1).
  useEffect(() => {
    if (!button) return undefined
    const measure = () => setRect(button.getBoundingClientRect())
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [button, hasBirthdays])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!hasBirthdays) return null

  const toggle = () => {
    if (button) setRect(button.getBoundingClientRect())
    setOpen((v) => !v)
    if (!seen) {
      setSeen(true)
      try {
        localStorage.setItem(SEEN_KEY, todayStamp())
      } catch {
        /* ignore */
      }
    }
  }

  const greet = (person) => {
    const first = person.displayName.split(' ')[0]
    setDraft(dmIdFor(user.uid, person.uid), `¡Feliz cumpleaños, ${first}! Te deseamos un gran día de parte de todo el equipo.`)
    setOpen(false)
    onNavigate?.('chat', { type: 'chat', convType: 'dm', participantUids: [user.uid, person.uid] })
  }

  const visible = open && ready
  const width = Math.min(340, window.innerWidth - 24)

  return (
    <div className="relative">
      <button
        ref={setButton}
        type="button"
        onClick={toggle}
        title="Cumpleaños de hoy"
        aria-label="Cumpleaños de hoy"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-[#E8C15A] transition-colors duration-150 hover:bg-white/[0.06]"
      >
        <CakeIcon size={18} />
        {!seen && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#E8C15A]" />}
      </button>

      {open && createPortal(<div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />, document.body)}
      {rect &&
        createPortal(
          // Transform lives on this wrapper; the glass element below carries
          // the backdrop blur (Chromium drops the blur if both are on one
          // element — CLAUDE.md §11).
          <motion.div
            animate={{ opacity: visible ? 1 : 0.001, y: visible ? 0 : -8, scale: visible ? 1 : 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="z-[999]"
            style={{
              position: 'fixed',
              pointerEvents: visible ? 'auto' : 'none',
              top: rect.bottom + 12,
              right: Math.max(12, window.innerWidth - rect.right),
              width,
            }}
          >
            <div className="ador-glass ador-grain max-h-[calc(100vh-110px)] overflow-y-auto rounded-[28px]">
              {birthdays.map((person, i) => (
                <div key={person.uid} className={i > 0 ? 'border-t border-white/[0.07]' : ''}>
                  <Card
                    person={person}
                    directoryEntry={directory.find((d) => d.linkedUserId === person.uid)}
                    isSelf={person.uid === user?.uid}
                    onGreet={() => greet(person)}
                  />
                </div>
              ))}
            </div>
          </motion.div>,
          document.body
        )}
    </div>
  )
}
