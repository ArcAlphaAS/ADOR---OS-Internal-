import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSheetDrag } from '../../hooks/useSheetDrag'
import { GOOGLE_EVENT_COLORS } from '../../lib/googleCalendar'
import { SPRING } from '../../lib/motion'
import { useEscape } from '../../hooks/useEscape'
import { CloseIcon } from '../icons'
import { SHEET } from '../../lib/motion'
import GuestPicker from './GuestPicker'
import GuestSheet from './GuestSheet'
import WhereSection, { modeFromEvent, discordChannelOf, locationFor } from './WhereSection'
import PersonAvatar from '../chat/PersonAvatar'
import usePhone from '../../hooks/usePhone'
import { subscribeUsers, subscribeDirectoryPeople } from '../../lib/firestore'

// Crear o editar un evento de tu Google Calendar. Mismo patrón de portal + envoltorio con
// transform separado del vidrio que el resto de modales (CLAUDE.md §11). Nada se manda a
// Google hasta pulsar Guardar; las invitaciones por correo solo salen si lo marcas.
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const parseLocal = (date, time) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = (time || '00:00').split(':').map(Number); return new Date(y, m - 1, d, h, mi, 0, 0) }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SLOTS = Array.from({ length: 36 }, (_, i) => `${pad(6 + Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`) // 06:00 – 23:30
const DAY_CHIPS = 5
const REMINDERS = [[null, 'Sin aviso'], [0, 'Al empezar'], [5, '5 min'], [10, '10 min'], [30, '30 min'], [60, '1 h'], [1440, '1 día']]
const fmt12 = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}` }

function Switch({ on }) {
  return (
    <span className="relative inline-block h-[26px] w-[44px] flex-shrink-0 rounded-full transition-colors duration-200" style={{ background: on ? '#F4EEE2' : 'rgba(255,255,255,0.14)' }}>
      <span className="absolute top-[3px] h-5 w-5 rounded-full shadow transition-all duration-200" style={{ left: on ? 21 : 3, background: on ? '#1A1814' : '#F5F5F5' }} />
    </span>
  )
}

// Ajuste en baldosa: icono, nombre y un interruptor (o un texto fijo cuando no se puede cambiar).
function Tile({ icon, title, hint, on, onToggle, disabled, fixed }) {
  return (
    <button
      type="button"
      onClick={disabled || fixed ? undefined : onToggle}
      aria-pressed={fixed ? undefined : on}
      className="flex min-h-[112px] flex-col justify-between rounded-[22px] bg-white/[0.05] p-4 text-left transition-colors hover:bg-white/[0.08] disabled:opacity-40"
      style={{ opacity: disabled ? 0.45 : 1, cursor: disabled || fixed ? 'default' : 'pointer' }}
    >
      <span className="text-[#E4E4E4]">{icon}</span>
      <span className="mt-3 block">
        <span className="block text-[13.5px] font-medium leading-tight text-[#F0F0F0]">{title}</span>
        {hint && <span className="mt-0.5 block text-[11.5px] leading-snug text-[#8A8A8A]">{hint}</span>}
        {fixed ? <span className="mt-2 block text-[11.5px] text-[#8FD19A]">✓ {fixed}</span> : <span className="mt-2.5 block"><Switch on={on && !disabled} /></span>}
      </span>
    </button>
  )
}

export default function EventEditorModal({ event, draft, busy, events = [], onSave, onDelete, onClose }) {
  useEscape(onClose)
  const phone = usePhone()
  const sheet = useSheetDrag(onClose, phone)
  const [guestSheet, setGuestSheet] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const isEdit = Boolean(event)
  const src = event || draft || {}
  const start0 = src.start ? new Date(src.start) : new Date()
  const end0 = src.end ? new Date(src.end) : new Date(start0.getTime() + 3600000)
  const allDay0 = Boolean(src.allDay)
  // Google guarda el fin de un evento de día completo como exclusivo: se muestra el último día real.
  const endShown0 = allDay0 ? new Date(end0.getTime() - 86400000) : end0

  const [title, setTitle] = useState(src.title || '')
  const [allDay, setAllDay] = useState(allDay0)
  const [date, setDate] = useState(ymd(start0))
  const [endDate, setEndDate] = useState(ymd(endShown0 < start0 ? start0 : endShown0))
  const [startTime, setStartTime] = useState(allDay0 ? '09:00' : hm(start0))
  const [endTime, setEndTime] = useState(allDay0 ? '10:00' : hm(end0))
  const loc0 = (src.location || '').trim()
  const mode0 = modeFromEvent(src, Boolean(src.meet))
  const [mode, setMode] = useState(mode0)
  const [place, setPlace] = useState(mode0 === 'presencial' || mode0 === 'enlace' ? loc0 : '')
  const [channel, setChannel] = useState(mode0 === 'discord' ? discordChannelOf(loc0) : '')
  const [description, setDescription] = useState(src.description || '')
  const [colorId, setColorId] = useState(src.colorId || '')
  const [guests, setGuests] = useState([
    ...(src.attendees || []).filter((a) => !a.self).map((a) => ({ email: a.email, responseStatus: a.status })),
    ...(draft?.guests || []).filter((e) => EMAIL_RE.test(e)).map((e) => ({ email: e.toLowerCase() })),
  ])
  const [guestDraft, setGuestDraft] = useState('')
  const [notify, setNotify] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exact, setExact] = useState(false)
  const [reminder, setReminder] = useState(isEdit ? (src.reminderMin === undefined ? 'default' : src.reminderMin) : 10)
  const guestInput = useRef(null)
  const slotsRef = useRef(null)
  const [people, setPeople] = useState([])
  const [users, setUsers] = useState([])
  const [directory, setDirectory] = useState([])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeDirectoryPeople(setDirectory), [])
  // La gente de la organización: cuentas con acceso, enriquecidas con su ficha de Directorio.
  useEffect(() => {
    const out = {}
    for (const u of users) {
      const email = (u.email || '').toLowerCase()
      if (!email) continue
      const d = directory.find((x) => x.linkedUserId === u.id)
      out[email] = { email, name: d?.name || u.displayName || email.split('@')[0], photo: d?.photoDataUrl || u.photoDataUrl || null, role: d?.role || '', area: d?.area || '' }
    }
    for (const d of directory) {
      const email = (d.email || '').toLowerCase()
      if (email && !out[email]) out[email] = { email, name: d.name, photo: d.photoDataUrl || null, role: d.role || '', area: d.area || '' }
    }
    const selfEmails = new Set((src.attendees || []).filter((a) => a.self).map((a) => (a.email || '').toLowerCase()))
    setPeople(Object.values(out).filter((p) => !selfEmails.has(p.email)).sort((a, b) => a.name.localeCompare(b.name, 'es')))
  }, [users, directory])

  const addGuests = (raw) => {
    const emails = raw.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
    const ok = emails.filter((x) => EMAIL_RE.test(x) && !guests.some((g) => g.email === x))
    if (ok.length) setGuests((g) => [...g, ...ok.map((email) => ({ email }))])
    setGuestDraft(emails.filter((x) => !EMAIL_RE.test(x)).join(' '))
  }

  useEffect(() => {
    const el = slotsRef.current?.querySelector('[data-selected="true"]')
    if (el && slotsRef.current) slotsRef.current.scrollTop = Math.max(0, el.offsetTop - 60)
  }, [allDay]) // eslint-disable-line react-hooks/exhaustive-deps

  // Al mover la hora de inicio, el fin acompaña (se conserva la duración).
  const changeStart = (v) => {
    if (!v) return
    const dur = parseLocal(date, endTime) - parseLocal(date, startTime)
    setStartTime(v)
    if (dur > 0) setEndTime(hm(new Date(parseLocal(date, v).getTime() + dur)))
  }
  const quick = (min) => setEndTime(hm(new Date(parseLocal(date, startTime).getTime() + min * 60000)))

  const submit = (e) => {
    e?.preventDefault()
    if (!title.trim()) return setError('Ponle un título al evento.')
    const pending = guestDraft.trim()
    let allGuests = guests
    if (pending) {
      const extra = pending.split(/[\s,;]+/).filter(Boolean)
      if (extra.some((x) => !EMAIL_RE.test(x))) return setError(`Elige a «${extra.find((x) => !EMAIL_RE.test(x))}» de la lista o escribe un correo completo.`)
      allGuests = [...guests, ...extra.filter((x) => !guests.some((g) => g.email === x.toLowerCase())).map((email) => ({ email: email.toLowerCase() }))]
    }
    let start, end
    if (allDay) {
      start = parseLocal(date, '00:00'); end = parseLocal(endDate < date ? date : endDate, '00:00')
    } else {
      start = parseLocal(date, startTime); end = parseLocal(date, endTime)
      if (end <= start) return setError('La hora de fin debe ser después de la de inicio.')
    }
    const self = (src.attendees || []).filter((a) => a.self).map((a) => ({ email: a.email, self: true, responseStatus: a.status }))
    const attendees = allGuests.length || self.length ? [...self, ...allGuests] : undefined
    onSave({
      title: title.trim(), allDay, start, end, location: locationFor({ mode, place, channel, fallback: src.location }), description: description.trim(),
      colorId: colorId || null,
      reminderMin: reminder === 'default' ? undefined : reminder,
      guests: attendees,
      meet: mode === 'meet' && !src.meetLink,
      notify: allGuests.length > 0 && notify,
    })
  }

  const field = 'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-2.5 text-[13.5px] text-[#F5F5F5] placeholder:text-[#8A8A8A] outline-none transition-colors focus:border-white/[0.22]'
  const label = 'mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]'

  // Días a elegir de un toque: hoy, mañana y los tres siguientes.
  const today0 = new Date(); today0.setHours(0, 0, 0, 0)
  const dayChips = Array.from({ length: DAY_CHIPS }, (_, i) => {
    const d = new Date(today0); d.setDate(d.getDate() + i)
    return { key: ymd(d), label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' }).replace('.', '').replace(/^./, (c) => c.toUpperCase()) }
  })
  if (!dayChips.some((c) => c.key === date)) {
    const d = parseLocal(date, '00:00')
    dayChips.push({ key: date, label: d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '').replace(/^./, (c) => c.toUpperCase()) })
  }

  // Horas ocupadas ese día (otros eventos de tu calendario), para marcarlas en la cuadrícula.
  const dayStart = parseLocal(date, '00:00').getTime()
  const dayEnd = dayStart + 86400000
  const others = events.filter((e) => !e.allDay && e.start && (!event || e.id !== event.id) && new Date(e.end || e.start).getTime() > dayStart && new Date(e.start).getTime() < dayEnd)
  const durMin = Math.max(15, Math.round((parseLocal(date, endTime) - parseLocal(date, startTime)) / 60000) || 60)
  const clash = (slot) => {
    const s0 = parseLocal(date, slot).getTime(), s1 = s0 + durMin * 60000
    return others.find((e) => new Date(e.start).getTime() < s1 && new Date(e.end || e.start).getTime() > s0)
  }
  const startClash = !allDay && clash(startTime)

  const detail = 'flex items-start gap-3.5 px-4 py-3.5'
  const iconCls = 'mt-[3px] h-[18px] w-[18px] flex-shrink-0 text-[#8A8A8A]'

  // ---- Teléfono: hoja que sube desde abajo (resorte de iOS) y se cierra arrastrándola desde
  // cualquier parte. Diseño en tarjetas redondeadas: título y detalles con "+", una fila de
  // personas con el círculo "Añadir", y baldosas de ajustes que se deslizan de lado.
  if (phone) {
    const card = 'rounded-[28px] bg-white/[0.06]'
    const rowCls = 'flex items-center gap-3.5 px-4'
    const divider = 'border-t border-white/[0.08]'
    const pill = 'relative flex-shrink-0 rounded-[10px] bg-white/[0.1] px-3 py-[7px] text-[15px] tabular-nums text-[#F5F5F5]'
    const dateText = (v) => parseLocal(v, '00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')
    const remText = reminder === null ? 'Ninguna' : reminder === 0 ? 'Al empezar' : reminder === 'default' ? 'Predeterminada' : `${REMINDERS.find(([m]) => m === reminder)?.[1] || ''} antes`
    const colorHex = colorId ? GOOGLE_EVENT_COLORS[colorId] : '#1E5FAD'
    const Plus = ({ filled, onClear, onAdd }) => (
      <button type="button" onClick={filled ? onClear : onAdd} aria-label={filled ? 'Borrar' : 'Añadir'} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#A8A8AD] active:bg-white/[0.08]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: filled ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}><path d="M12 5v14M5 12h14" /></svg>
      </button>
    )
    const hasGuests = guests.length > 0 || guestDraft.trim()
    return (
      <>
      {createPortal(
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60]" onClick={onClose}>
        <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-[10px]" style={{ opacity: sheet.backdrop }} />
        <div className="absolute inset-x-0 bottom-0">
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={SHEET} onClick={(e) => e.stopPropagation()}>
            <motion.div ref={sheet.sheetRef} style={{ y: sheet.y }}>
              <form onSubmit={submit} className="ador-modal-surface flex flex-col overflow-hidden" style={{ padding: 0, height: '94dvh', maxHeight: '94dvh', borderRadius: '30px 30px 0 0' }}>
                <div className="flex-shrink-0">
                  <div className="mx-auto mt-2 h-[5px] w-10 rounded-full bg-white/[0.22]" />
                  <div className="flex items-center justify-between px-5 pb-3 pt-3">
                    <button type="button" onClick={onClose} className="min-w-[78px] text-left text-[17px] text-[#F4EEE2] active:opacity-60">Cancelar</button>
                    <h2 className="text-[17px] font-semibold text-[#F5F5F5]">{isEdit ? 'Editar evento' : 'Nuevo evento'}</h2>
                    <button type="submit" disabled={busy} className="min-w-[78px] text-right text-[17px] font-semibold text-[#F4EEE2] active:opacity-60 disabled:opacity-40">{busy ? '…' : isEdit ? 'Guardar' : 'Agregar'}</button>
                  </div>
                </div>

                <div ref={sheet.scrollRef} className="flex-1 space-y-6 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+32px)] pt-1" style={{ overscrollBehavior: 'contain' }}>
                  {/* Título y detalles */}
                  <div className={card}>
                    <div className={`${rowCls} py-3`}>
                      <button type="button" onClick={() => setColorOpen((v) => !v)} aria-label="Color del evento" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full active:scale-95" style={{ background: `${colorHex}33`, color: colorHex }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
                      </button>
                      <input autoFocus={!isEdit} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del evento" className="min-w-0 flex-1 bg-transparent py-1 text-[18px] font-medium text-[#F5F5F5] placeholder:text-[#6E6E73] outline-none" />
                      <Plus filled={Boolean(title)} onClear={() => setTitle('')} onAdd={() => {}} />
                    </div>
                    {colorOpen && (
                      <div className={`${divider} flex items-center gap-2.5 overflow-x-auto px-4 py-3.5`} style={{ scrollbarWidth: 'none' }}>
                        <button type="button" onClick={() => setColorId('')} aria-label="Color predeterminado" className="h-8 w-8 flex-shrink-0 rounded-full" style={{ background: '#1E5FAD', boxShadow: colorId === '' ? '0 0 0 2px #1C1C1E, 0 0 0 4px #F4EEE2' : 'none' }} />
                        {Object.entries(GOOGLE_EVENT_COLORS).map(([id, hex]) => (
                          <button key={id} type="button" onClick={() => setColorId(id)} aria-label={`Color ${id}`} className="h-8 w-8 flex-shrink-0 rounded-full" style={{ background: hex, boxShadow: colorId === id ? '0 0 0 2px #1C1C1E, 0 0 0 4px #F4EEE2' : 'none' }} />
                        ))}
                      </div>
                    )}
                    <div className={`${rowCls} ${divider} py-3.5`}>
                      <svg className="h-[18px] w-[18px] flex-shrink-0 text-[#8E8E93]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
                      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Añadir descripción" className="min-w-0 flex-1 bg-transparent py-1 text-[16px] text-[#F5F5F5] placeholder:text-[#6E6E73] outline-none" />
                      <Plus filled={Boolean(description)} onClear={() => setDescription('')} onAdd={() => {}} />
                    </div>
                  </div>

                  {/* Cuándo */}
                  <div className={card}>
                    <div className={`${rowCls} min-h-[52px]`}>
                      <span className="flex-1 text-[16px] text-[#F5F5F5]">Todo el día</span>
                      <button type="button" role="switch" aria-checked={allDay} onClick={() => setAllDay((v) => !v)}><Switch on={allDay} /></button>
                    </div>
                    <div className={`${rowCls} ${divider} min-h-[52px]`}>
                      <span className="flex-1 text-[16px] text-[#F5F5F5]">{allDay ? 'Desde' : 'Empieza'}</span>
                      <label className={pill}>{dateText(date)}<input type="date" value={date} onChange={(e) => { if (!e.target.value) return; setDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value) }} className="absolute inset-0 h-full w-full opacity-0" aria-label="Fecha" /></label>
                      {!allDay && <label className={pill}>{startTime}<input type="time" value={startTime} onChange={(e) => e.target.value && changeStart(e.target.value)} className="absolute inset-0 h-full w-full opacity-0" aria-label="Hora de inicio" /></label>}
                    </div>
                    <div className={`${rowCls} ${divider} min-h-[52px]`}>
                      <span className="flex-1 text-[16px] text-[#F5F5F5]">{allDay ? 'Hasta' : 'Termina'}</span>
                      {allDay
                        ? <label className={pill}>{dateText(endDate)}<input type="date" value={endDate} min={date} onChange={(e) => e.target.value && setEndDate(e.target.value)} className="absolute inset-0 h-full w-full opacity-0" aria-label="Fecha de fin" /></label>
                        : <label className={pill}>{endTime}<input type="time" value={endTime} onChange={(e) => e.target.value && setEndTime(e.target.value)} className="absolute inset-0 h-full w-full opacity-0" aria-label="Hora de fin" /></label>}
                    </div>
                    {!allDay && (
                      <div className={`${divider} flex gap-2 overflow-x-auto px-4 py-3.5`} style={{ scrollbarWidth: 'none' }}>
                        {[[30, '30 min'], [45, '45 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h']].map(([m, l]) => (
                          <button key={m} type="button" onClick={() => quick(m)} className="flex-shrink-0 rounded-full px-4 py-2 text-[14px]" style={durMin === m ? { background: 'rgba(244,238,226,0.18)', color: '#F4EEE2' } : { background: 'rgba(255,255,255,0.08)', color: '#C9C9C9' }}>{l}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  {startClash && <p className="-mt-3 px-3 text-[13px] text-[#E8C15A]">Cruza con «{startClash.title}».</p>}

                  {/* Personas */}
                  <div>
                    <div className="flex items-start gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                      <button type="button" onClick={() => setGuestSheet(true)} className="flex w-[68px] flex-shrink-0 flex-col items-center gap-1.5 active:opacity-70">
                        <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-white/[0.2] text-[26px] font-light text-[#F5F5F5]">+</span>
                        <span className="text-[13px] font-medium text-[#F5F5F5]">Añadir</span>
                        <span className="-mt-1.5 text-[11.5px] text-[#8E8E93]">Invitado</span>
                      </button>
                      {guests.map((g) => {
                        const p = people.find((x) => x.email === g.email)
                        const first = (p?.name || g.email).split(/[\s@]/)[0]
                        const ring = { accepted: '#7FC98F', declined: '#EF5350', tentative: '#E8C15A' }[g.responseStatus]
                        return (
                          <div key={g.email} className="relative flex w-[68px] flex-shrink-0 flex-col items-center gap-1.5">
                            <span className="relative rounded-full" style={ring ? { boxShadow: `0 0 0 2px #1C1C1E, 0 0 0 3.5px ${ring}` } : undefined}>
                              <PersonAvatar name={p?.name || g.email} photo={p?.photo} size={60} />
                              <button type="button" aria-label={`Quitar ${g.email}`} onClick={() => setGuests((cur) => cur.filter((x) => x.email !== g.email))} className="absolute -right-1.5 -top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#3A3A3C] text-[13px] leading-none text-white ring-2 ring-[#1C1C1E]">×</button>
                            </span>
                            <span className="w-full truncate text-center text-[13px] font-medium text-[#F5F5F5]">{first}</span>
                            <span className="-mt-1.5 w-full truncate text-center text-[11.5px] text-[#8E8E93]">{p?.role || (p ? 'Equipo' : 'Externo')}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ¿Cómo se reúnen? */}
                  <div>
                    <p className="mb-3 px-1 text-[15px] text-[#8E8E93]">¿Cómo se reúnen?</p>
                    <div className={`${card} p-4`}>
                      <WhereSection phone mode={mode} setMode={setMode} place={place} setPlace={setPlace} channel={channel} setChannel={setChannel} hasMeetLink={Boolean(src.meetLink)} />
                    </div>
                  </div>

                  {/* Ajustes */}
                  <div>
                    <p className="mb-3 px-1 text-[15px] text-[#8E8E93]">Ajustes</p>
                    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
                      <div className="relative flex h-[150px] w-[168px] flex-shrink-0 snap-start flex-col justify-between rounded-[26px] bg-white/[0.06] p-4">
                        <svg className="text-[#F5F5F5]" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" /></svg>
                        <div>
                          <p className="text-[17px] font-medium leading-tight text-[#F5F5F5]">Alerta</p>
                          <p className="mt-0.5 text-[12.5px] leading-snug text-[#8E8E93]">{remText}</p>
                          <p className="mt-2.5 text-[13px] font-medium text-[#F4EEE2]">Cambiar</p>
                        </div>
                        <select value={String(reminder)} onChange={(e) => { const v = e.target.value; setReminder(v === 'default' ? 'default' : v === 'null' ? null : Number(v)) }} className="absolute inset-0 h-full w-full rounded-[26px] opacity-0" aria-label="Alerta">
                          {reminder === 'default' && <option value="default">Predeterminada</option>}
                          {REMINDERS.map(([m, l]) => <option key={String(m)} value={String(m)}>{m === null ? 'Ninguna' : m === 0 ? 'Al empezar' : `${l} antes`}</option>)}
                        </select>
                      </div>
                      <div className="relative flex h-[150px] w-[168px] flex-shrink-0 snap-start flex-col justify-between rounded-[26px] bg-white/[0.06] p-4" style={{ opacity: hasGuests ? 1 : 0.5 }}>
                        <svg className="text-[#F5F5F5]" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 8l9 6 9-6" /></svg>
                        <div>
                          <p className="text-[17px] font-medium leading-tight text-[#F5F5F5]">Invitar por correo</p>
                          <p className="mt-0.5 text-[12.5px] leading-snug text-[#8E8E93]">{hasGuests ? 'Les llega la invitación' : 'Añade invitados primero'}</p>
                          <button type="button" role="switch" aria-checked={notify} disabled={!hasGuests} onClick={() => setNotify((v) => !v)} className="mt-2.5 block"><Switch on={notify && Boolean(hasGuests)} /></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isEdit && src.recurring && <p className="px-3 text-[13px] text-[#8E8E93]">Este evento se repite: los cambios se aplican solo a esta fecha.</p>}
                  {error && <p className="px-3 text-[14px] text-[#FF8A85]">{error}</p>}

                  {isEdit && (
                    <button type="button" onClick={() => (confirmDelete ? onDelete(event) : setConfirmDelete(true))} className={`block w-full ${card} py-4 text-center text-[17px] text-[#FF453A] active:bg-white/[0.1]`}>
                      {confirmDelete ? 'Toca otra vez para eliminar' : 'Eliminar evento'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>,
      document.body
      )}
      <AnimatePresence>{guestSheet && <GuestSheet guests={guests} setGuests={setGuests} people={people} onClose={() => setGuestSheet(false)} />}</AnimatePresence>
      </>
    )
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-0 backdrop-blur-[10px] md:p-6" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={SPRING} onClick={(e) => e.stopPropagation()} className="w-full max-w-[580px]">
        <form onSubmit={submit} className="ador-modal-surface ador-grain max-h-[90vh] overflow-y-auto rounded-[30px] p-7 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.1em] text-[#8A8A8A]">{isEdit ? 'Editar evento' : 'Nuevo evento'}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-[#B5B5B5] hover:bg-white/[0.12]"><CloseIcon size={11} /></button>
          </div>

          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del evento" className="mt-4 w-full bg-transparent text-[28px] font-semibold tracking-[-0.02em] text-[#F5F5F5] placeholder:text-[#555] outline-none" />

          {/* 1 · Cuándo */}
          <section className="mt-7">
            <p className={label}>{allDay ? 'Días' : '1 · Fecha'}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {dayChips.map((c) => (
                <button key={c.key} type="button" onClick={() => { setDate(c.key); if (endDate < c.key) setEndDate(c.key) }} className="rounded-full px-3.5 py-1.5 text-[13px] transition-colors" style={c.key === date ? { background: '#F5F5F5', color: '#0A0A0A', fontWeight: 600 } : { background: 'rgba(255,255,255,0.06)', color: '#C9C9C9' }}>
                  {c.label}
                </button>
              ))}
              <label className="relative cursor-pointer rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[13px] text-[#C9C9C9] transition-colors hover:bg-white/[0.12]">
                Otra fecha
                <input type="date" value={date} onChange={(e) => { if (!e.target.value) return; setDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value) }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Elegir otra fecha" />
              </label>
            </div>
            {allDay && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[12.5px] text-[#8A8A8A]">Hasta</span>
                <input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} className={`${field} max-w-[190px]`} />
              </div>
            )}
          </section>

          {!allDay && (
            <section className="mt-6">
              <div className="mb-2.5 flex items-baseline justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">2 · Hora</p>
                <p className="text-[13px] tabular-nums text-[#E4E4E4]">{fmt12(startTime)} <span className="text-[#767676]">→</span> {fmt12(endTime)}</p>
              </div>
              <div className="relative">
                <div ref={slotsRef} className="ador-noscroll grid max-h-[168px] grid-cols-3 gap-2 overflow-y-auto pb-6" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 78%, transparent)', maskImage: 'linear-gradient(to bottom, #000 78%, transparent)' }}>
                  {SLOTS.map((t) => {
                    const sel = t === startTime
                    const busyWith = !sel && clash(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        data-selected={sel}
                        onClick={() => changeStart(t)}
                        title={busyWith ? `Ocupado: ${busyWith.title}` : undefined}
                        className="relative rounded-full py-2.5 text-center text-[13.5px] tabular-nums transition-colors"
                        style={sel ? { background: '#F5F5F5', color: '#0A0A0A', fontWeight: 600 } : { background: 'rgba(255,255,255,0.055)', color: busyWith ? '#6E6E6E' : '#D8D8D8' }}
                      >
                        {fmt12(t)}
                        {busyWith && <span className="absolute right-3.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#E8C15A]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
              {startClash && <p className="mt-1 text-[12px] text-[#E8C15A]">Cruza con «{startClash.title}»</p>}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {[[30, '30 min'], [45, '45 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h']].map(([m, l]) => (
                  <button key={m} type="button" onClick={() => quick(m)} className="rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors" style={durMin === m ? { background: 'rgba(244,238,226,0.16)', color: '#F4EEE2' } : { background: 'rgba(255,255,255,0.055)', color: '#B8B8B8' }}>{l}</button>
                ))}
              </div>
              <button type="button" onClick={() => setExact((v) => !v)} className="mt-3 text-[12px] text-[#8A8A8A] underline-offset-2 hover:text-[#F5F5F5] hover:underline">{exact ? 'Ocultar hora exacta' : 'Poner una hora exacta'}</button>
              {exact && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div><label className={label}>Inicio</label><input type="time" value={startTime} onChange={(e) => changeStart(e.target.value)} className={field} /></div>
                  <div><label className={label}>Fin</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={field} /></div>
                </div>
              )}
            </section>
          )}

          {/* 2 · Personas */}
          <section className="mt-7">
            <p className={label}>{allDay ? 'Personas' : '3 · Personas'}</p>
            <div className="flex items-start gap-4 overflow-x-auto pb-2">
              <button type="button" onClick={() => guestInput.current?.focus()} className="flex w-[64px] flex-shrink-0 flex-col items-center gap-1.5">
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/[0.18] text-[22px] font-light text-[#E4E4E4] transition-colors hover:bg-white/[0.08]">+</span>
                <span className="text-[12px] font-medium text-[#E4E4E4]">Añadir</span>
              </button>
              {guests.map((g) => {
                const p = people.find((x) => x.email === g.email)
                const first = (p?.name || g.email).split(/[\s@]/)[0]
                const ring = { accepted: '#7FC98F', declined: '#EF5350', tentative: '#E8C15A' }[g.responseStatus]
                return (
                  <div key={g.email} className="group relative flex w-[64px] flex-shrink-0 flex-col items-center gap-1.5" title={`${p?.name || ''} ${g.email}`.trim()}>
                    <span className="relative rounded-full" style={ring ? { boxShadow: `0 0 0 2px #141414, 0 0 0 3.5px ${ring}` } : undefined}>
                      <PersonAvatar name={p?.name || g.email} photo={p?.photo} size={52} />
                      <button type="button" aria-label={`Quitar ${g.email}`} onClick={() => setGuests((cur) => cur.filter((x) => x.email !== g.email))} className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#2A2A2A] text-[11px] leading-none text-[#E4E4E4] opacity-0 ring-2 ring-[#141414] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100">×</button>
                    </span>
                    <span className="w-full truncate text-center text-[12px] font-medium text-[#E4E4E4]">{first}</span>
                    {p?.role && <span className="-mt-1 w-full truncate text-center text-[10.5px] text-[#8A8A8A]">{p.role}</span>}
                  </div>
                )
              })}
            </div>
            <div className="mt-2">
              <GuestPicker
                showChips={false}
                inputRef={guestInput}
                guests={guests}
                people={people}
                draft={guestDraft}
                setDraft={setGuestDraft}
                onAdd={(email) => setGuests((cur) => (cur.some((g) => g.email === email) ? cur : [...cur, { email }]))}
                onAddRaw={addGuests}
                onRemove={(email) => setGuests((cur) => cur.filter((x) => x.email !== email))}
                onRemoveLast={() => setGuests((g) => g.slice(0, -1))}
                hasError={Boolean(error) && /correo|lista/.test(error)}
              />
            </div>
          </section>

          {/* ¿Cómo se reúnen? */}
          <section className="mt-7">
            <p className={label}>{allDay ? '¿Cómo se reúnen?' : '4 · ¿Cómo se reúnen?'}</p>
            <WhereSection mode={mode} setMode={setMode} place={place} setPlace={setPlace} channel={channel} setChannel={setChannel} hasMeetLink={Boolean(src.meetLink)} />
          </section>

          {/* Detalles */}
          <section className="mt-7 divide-y divide-white/[0.07] overflow-hidden rounded-[22px] bg-white/[0.05]">
            <label className={detail}>
              <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción: notas, agenda, enlaces…" className="min-w-0 flex-1 resize-none bg-transparent text-[14px] leading-snug text-[#F5F5F5] placeholder:text-[#767676] outline-none" />
            </label>
            <div className={detail}>
              <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" /></svg>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-[#F5F5F5]">Avisarme antes</p>
                <div className="ador-noscroll mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
                  {reminder === 'default' && <span className="flex-shrink-0 rounded-full bg-[rgba(244,238,226,0.16)] px-3 py-1 text-[12.5px] text-[#F4EEE2]">Predeterminado</span>}
                  {REMINDERS.map(([m, l]) => (
                    <button key={String(m)} type="button" onClick={() => setReminder(m)} className="flex-shrink-0 rounded-full px-3 py-1 text-[12.5px] transition-colors" style={reminder === m ? { background: 'rgba(244,238,226,0.16)', color: '#F4EEE2' } : { background: 'rgba(255,255,255,0.055)', color: '#B8B8B8' }}>{l}</button>
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] leading-snug text-[#767676]">Te llega como notificación de Google Calendar, también con ADOR OS cerrado.</p>
              </div>
            </div>
          </section>

          {/* Ajustes */}
          <section className="mt-7">
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Ajustes</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Tile
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>}
                title="Todo el día"
                hint="Sin hora de inicio"
                on={allDay}
                onToggle={() => setAllDay((v) => !v)}
              />
              <Tile
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 8l9 6 9-6" /></svg>}
                title="Invitar por correo"
                hint={guests.length || guestDraft.trim() ? 'Les llega la invitación' : 'Añade personas primero'}
                on={notify}
                onToggle={() => setNotify((v) => !v)}
                disabled={!guests.length && !guestDraft.trim()}
              />
            </div>
          </section>

          <section className="mt-7">
            <p className={label}>Color</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setColorId('')} title="Predeterminado" className="h-6 w-6 rounded-full" style={{ background: '#1E5FAD', boxShadow: colorId === '' ? '0 0 0 2px #141414, 0 0 0 4px #F4EEE2' : 'none' }} />
              {Object.entries(GOOGLE_EVENT_COLORS).map(([id, hex]) => (
                <button key={id} type="button" onClick={() => setColorId(id)} className="h-6 w-6 rounded-full" style={{ background: hex, boxShadow: colorId === id ? '0 0 0 2px #141414, 0 0 0 4px #F4EEE2' : 'none' }} aria-label={`Color ${id}`} />
              ))}
            </div>
          </section>

          {isEdit && src.recurring && <p className="mt-4 text-[11.5px] text-[#8A8A8A]">Este evento se repite: los cambios se aplican solo a esta fecha.</p>}
          {error && <p className="mt-4 text-[12.5px] text-[#EF9A98]">{error}</p>}

          <div className="mt-7 flex items-center gap-3">
            {isEdit && (
              <button type="button" onClick={() => (confirmDelete ? onDelete(event) : setConfirmDelete(true))} className="mr-auto rounded-xl px-2 py-2 text-[13px] transition-colors" style={{ color: confirmDelete ? '#EF5350' : '#8A8A8A' }}>
                {confirmDelete ? 'Pulsa otra vez para eliminar' : 'Eliminar'}
              </button>
            )}
            <button type="button" onClick={onClose} className={`rounded-xl px-4 py-2 text-[13px] text-[#888888] hover:text-[#F5F5F5] ${isEdit ? '' : 'ml-auto'}`}>Cancelar</button>
            <button type="submit" disabled={busy} className="ador-btn-primary rounded-full px-7 py-3 text-[13.5px] font-semibold disabled:opacity-60">{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear evento'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  )
}
