import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { GOOGLE_EVENT_COLORS } from '../../lib/googleCalendar'
import { SPRING } from '../../lib/motion'
import { useEscape } from '../../hooks/useEscape'
import { CloseIcon } from '../icons'
import GuestPicker from './GuestPicker'
import { subscribeUsers, subscribeDirectoryPeople } from '../../lib/firestore'

// Crear o editar un evento de tu Google Calendar. Mismo patrón de portal + envoltorio con
// transform separado del vidrio que el resto de modales (CLAUDE.md §11). Nada se manda a
// Google hasta pulsar Guardar; las invitaciones por correo solo salen si lo marcas.
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const parseLocal = (date, time) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = (time || '00:00').split(':').map(Number); return new Date(y, m - 1, d, h, mi, 0, 0) }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EventEditorModal({ event, draft, busy, onSave, onDelete, onClose }) {
  useEscape(onClose)
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
  const [location, setLocation] = useState(src.location || '')
  const [description, setDescription] = useState(src.description || '')
  const [colorId, setColorId] = useState(src.colorId || '')
  const [meet, setMeet] = useState(Boolean(src.meet))
  const [guests, setGuests] = useState((src.attendees || []).filter((a) => !a.self).map((a) => ({ email: a.email, responseStatus: a.status })))
  const [guestDraft, setGuestDraft] = useState((draft?.guests || []).join(' '))
  const [notify, setNotify] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
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
      title: title.trim(), allDay, start, end, location: location.trim(), description: description.trim(),
      colorId: colorId || null,
      guests: attendees,
      meet: meet && !src.meetLink,
      notify: allGuests.length > 0 && notify,
    })
  }

  const field = 'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-2.5 text-[13.5px] text-[#F5F5F5] placeholder:text-[#8A8A8A] outline-none transition-colors focus:border-white/[0.22]'
  const label = 'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-[#8A8A8A]'

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-6 backdrop-blur-[10px]" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={SPRING} onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px]">
        <form onSubmit={submit} className="ador-modal-surface ador-grain max-h-[88vh] overflow-y-auto rounded-[28px] p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#F5F5F5]">{isEdit ? 'Editar evento' : 'Nuevo evento'}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-[#B5B5B5] hover:bg-white/[0.12]"><CloseIcon size={11} /></button>
          </div>

          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del evento" className="mt-5 w-full bg-transparent text-[24px] font-semibold tracking-[-0.01em] text-[#F5F5F5] placeholder:text-[#555] outline-none" />

          <div className="mt-5 flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[#D0D0D0]">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-3.5 w-3.5 accent-[#F4EEE2]" /> Todo el día
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{allDay ? 'Desde' : 'Fecha'}</label>
                <input type="date" value={date} onChange={(e) => { setDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value) }} className={field} />
              </div>
              {allDay ? (
                <div><label className={label}>Hasta</label><input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} className={field} /></div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={label}>Inicio</label><input type="time" value={startTime} onChange={(e) => changeStart(e.target.value)} className={field} /></div>
                  <div><label className={label}>Fin</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={field} /></div>
                </div>
              )}
            </div>
            {!allDay && (
              <div className="flex flex-wrap gap-1.5">
                {[[30, '30 min'], [45, '45 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h']].map(([m, l]) => (
                  <button key={m} type="button" onClick={() => quick(m)} className="rounded-full bg-white/[0.06] px-3 py-1 text-[12px] text-[#C9C9C9] hover:bg-white/[0.12]">{l}</button>
                ))}
              </div>
            )}

            <div>
              <label className={label}>Invitados</label>
              <GuestPicker
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
              {(guests.length > 0 || guestDraft.trim()) && (
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12.5px] text-[#B5B5B5]">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-3.5 w-3.5 accent-[#F4EEE2]" /> Enviarles la invitación por correo
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Lugar</label><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Oficina, dirección…" className={field} /></div>
              <div>
                <label className={label}>Videollamada</label>
                {src.meetLink ? <p className="py-2.5 text-[12.5px] text-[#8FD19A]">✓ Ya tiene enlace de Meet</p> : (
                  <button type="button" onClick={() => setMeet((v) => !v)} className="w-full rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition-colors" style={{ borderColor: meet ? 'rgba(244,238,226,0.5)' : 'rgba(255,255,255,0.08)', background: meet ? 'rgba(244,238,226,0.08)' : '#1A1A1A', color: meet ? '#F4EEE2' : '#9A9A9A' }}>
                    {meet ? '✓ Con Google Meet' : 'Añadir Google Meet'}
                  </button>
                )}
              </div>
            </div>

            <div><label className={label}>Descripción</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notas, agenda, enlaces…" className={`${field} resize-none`} /></div>

            <div>
              <label className={label}>Color</label>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setColorId('')} title="Predeterminado" className="h-6 w-6 rounded-full ring-offset-2 ring-offset-[#141414]" style={{ background: '#1E5FAD', boxShadow: colorId === '' ? '0 0 0 2px #F4EEE2' : 'none' }} />
                {Object.entries(GOOGLE_EVENT_COLORS).map(([id, hex]) => (
                  <button key={id} type="button" onClick={() => setColorId(id)} className="h-6 w-6 rounded-full" style={{ background: hex, boxShadow: colorId === id ? '0 0 0 2px #141414, 0 0 0 4px #F4EEE2' : 'none' }} aria-label={`Color ${id}`} />
                ))}
              </div>
            </div>
          </div>

          {isEdit && src.recurring && <p className="mt-4 text-[11.5px] text-[#8A8A8A]">Este evento se repite: los cambios se aplican solo a esta fecha.</p>}
          {error && <p className="mt-4 text-[12.5px] text-[#EF9A98]">{error}</p>}

          <div className="mt-6 flex items-center gap-3">
            {isEdit && (
              <button type="button" onClick={() => (confirmDelete ? onDelete(event) : setConfirmDelete(true))} className="mr-auto rounded-xl px-2 py-2 text-[13px] transition-colors" style={{ color: confirmDelete ? '#EF5350' : '#8A8A8A' }}>
                {confirmDelete ? 'Pulsa otra vez para eliminar' : 'Eliminar'}
              </button>
            )}
            <button type="button" onClick={onClose} className={`rounded-xl px-4 py-2 text-[13px] text-[#888888] hover:text-[#F5F5F5] ${isEdit ? '' : 'ml-auto'}`}>Cancelar</button>
            <button type="submit" disabled={busy} className="ador-btn-primary rounded-xl px-6 py-2.5 text-[13px] font-semibold disabled:opacity-60">{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear evento'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  )
}
