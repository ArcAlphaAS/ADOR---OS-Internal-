import { useState } from 'react'
import { setCommunityRsvp, toggleCommunityVote, updateCommunityPost } from '../../lib/firestore'
import PersonAvatar from '../chat/PersonAvatar'
import { SERIF } from './NewsLayout'
import { CalendarIcon, FileIcon } from '../icons'

// What each Comunidad post type adds on top of text + photos, borrowed from
// the social networks that do it best:
//   Evento   — date card, place/link, Asistiré/Tal vez/No puedo with faces,
//              "Añadir a mi calendario" (Google link or an .ics for Apple/
//              Outlook), "Pasado" once it's over (LinkedIn/Facebook Events)
//   Pregunta — the author marks the best answer; the post shows "Resuelta"
//              (Stack Overflow / Reddit)
//   Idea     — "Me sumo" votes + a status admins set (Product Hunt/Canny)
//   Logro    — who achieved it, a gold card, "Felicitar" (LinkedIn Celebrate)
//   Recurso  — a link or Google Drive file as a card
// Plus #hashtags that act as a search filter, everywhere.

const input =
  'w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] text-[#F5F5F5] placeholder:text-[#6A6A6A] outline-none [color-scheme:dark]'

// ---------------- Composer extras ----------------

export function EventFields({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="grid grid-cols-1 gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-[11.5px] text-[#8A8A8A]">
        Fecha
        <input type="date" value={value.date} onChange={set('date')} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-[11.5px] text-[#8A8A8A]">
        Hora (opcional)
        <input type="time" value={value.time} onChange={set('time')} className={input} />
      </label>
      <input value={value.place} onChange={set('place')} placeholder="Lugar (opcional)" className={input} />
      <input value={value.link} onChange={set('link')} placeholder="Enlace de la reunión (opcional)" className={input} />
    </div>
  )
}

export function HonoreePicker({ users, value, onChange, currentUid }) {
  const [q, setQ] = useState('')
  const picked = new Set(value.map((h) => h.uid))
  const name = (u) => u.displayName || u.email?.split('@')[0] || 'Sin nombre'
  const options = users.filter((u) => !picked.has(u.id) && name(u).toLowerCase().includes(q.toLowerCase())).slice(0, 5)
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#E8C15A]/20 bg-[#E8C15A]/[0.04] p-3">
      <p className="text-[12px] text-[#CFC6B8]">¿Quién lo logró? (opcional)</p>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((h) => (
            <button key={h.uid} type="button" onClick={() => onChange(value.filter((x) => x.uid !== h.uid))} className="flex items-center gap-1.5 rounded-full bg-white/[0.07] py-1 pl-1 pr-2.5 text-[12.5px] text-[#EEEEEE]">
              <PersonAvatar uid={h.uid} name={h.name} size={20} /> {h.name} ×
            </button>
          ))}
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca a alguien del equipo…" className={input} />
      {q && (
        <div className="flex flex-col">
          {options.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onChange([...value, { uid: u.id, name: name(u) }])
                setQ('')
              }}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[#DDDDDD] hover:bg-white/[0.05]"
            >
              <PersonAvatar uid={u.id} name={name(u)} size={22} /> {name(u)}
              {u.id === currentUid ? ' (tú)' : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ResourceFields({ value, onChange, onPickDrive }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
      {value?.kind === 'drive' ? (
        <div className="flex items-center gap-2">
          <ResourceCard resource={value} />
          <button type="button" onClick={() => onChange(null)} className="text-[12.5px] text-[#8A8A8A] hover:text-[#EF5350]">
            Quitar
          </button>
        </div>
      ) : (
        <>
          <input
            value={value?.url || ''}
            onChange={(e) => onChange(e.target.value ? { kind: 'link', url: e.target.value, name: value?.name || '' } : null)}
            placeholder="Pega un enlace (artículo, plantilla, herramienta…)"
            className={input}
          />
          <button type="button" onClick={onPickDrive} className="self-start rounded-full border border-white/[0.12] px-3.5 py-1.5 text-[12.5px] text-[#DDDDDD] hover:bg-white/[0.05]">
            O elige un archivo de Google Drive
          </button>
        </>
      )}
    </div>
  )
}

// ---------------- Card blocks ----------------

function eventDate(ev) {
  if (!ev?.date) return null
  const [y, m, d] = ev.date.split('-').map(Number)
  const [hh, mm] = (ev.time || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

const pad = (n) => String(n).padStart(2, '0')
const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

function calendarLinks(post) {
  const start = eventDate(post.event)
  const end = new Date(start.getTime() + (post.event.time ? 60 : 24 * 60) * 60000)
  const title = post.title || post.text?.slice(0, 60) || 'Evento ADOR'
  const details = [post.text, post.event.link].filter(Boolean).join('\n\n')
  const where = post.event.place || post.event.link || ''
  const dates = post.event.time ? `${stamp(start)}/${stamp(end)}` : `${stamp(start).slice(0, 8)}/${stamp(end).slice(0, 8)}`
  const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: title, dates, details, location: where, ctz: Intl.DateTimeFormat().resolvedOptions().timeZone })}`
  const esc = (s) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ADOR OS//Comunidad//ES',
    'BEGIN:VEVENT',
    `UID:${post.id}@ador-os`,
    `DTSTAMP:${stamp(new Date())}`,
    post.event.time ? `DTSTART:${stamp(start)}` : `DTSTART;VALUE=DATE:${stamp(start).slice(0, 8)}`,
    post.event.time ? `DTEND:${stamp(end)}` : `DTEND;VALUE=DATE:${stamp(end).slice(0, 8)}`,
    `SUMMARY:${esc(title)}`,
    where && `LOCATION:${esc(where)}`,
    details && `DESCRIPTION:${esc(details)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
  return { google, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` }
}

const RSVP = [
  { id: 'going', label: 'Asistiré' },
  { id: 'maybe', label: 'Tal vez' },
  { id: 'no', label: 'No puedo' },
]

export function EventBlock({ post, uid }) {
  const start = eventDate(post.event)
  if (!start) return null
  const past = start.getTime() + 3 * 3600e3 < Date.now()
  const rsvp = post.rsvp || {}
  const mine = RSVP.find((r) => rsvp[r.id]?.includes(uid))?.id
  const going = rsvp.going || []
  const days = Math.ceil((new Date(start).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5)
  const when = past ? 'Pasado' : days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : days < 7 ? `En ${days} días` : null
  const links = calendarLinks(post)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4 sm:flex-1">
        <div className="flex w-[58px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border border-white/[0.1] bg-[#141414]">
          <span className="w-full bg-[#E8C15A] py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#1C1A16]">
            {start.toLocaleDateString('es', { month: 'short' }).replace('.', '')}
          </span>
          <span className="py-1 text-[24px] font-semibold leading-none text-[#F5F5F5]">{start.getDate()}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium capitalize text-[#F5F5F5]">
            {start.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
            {post.event.time ? ` · ${post.event.time}` : ''}
          </p>
          {post.event.place && <p className="mt-0.5 truncate text-[13px] text-[#9A9A9A]">📍 {post.event.place}</p>}
          {post.event.link && (
            <a href={post.event.link} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-[13px] text-[#E8C15A] hover:underline">
              🔗 Unirse en línea
            </a>
          )}
          <p className="mt-1 flex items-center gap-2 text-[12px] text-[#8A8A8A]">
            {when && <span className={`rounded-full px-2 py-0.5 ${past ? 'bg-white/[0.06]' : 'bg-[#4CAF50]/15 text-[#8FD19A]'}`}>{when}</span>}
            {going.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="flex -space-x-1.5">
                  {going.slice(0, 4).map((g) => (
                    <span key={g} className="rounded-full ring-2 ring-[#141414]">
                      <PersonAvatar uid={g} size={18} />
                    </span>
                  ))}
                </span>
                {going.length} {going.length === 1 ? 'asistirá' : 'asistirán'}
              </span>
            )}
          </p>
        </div>
      </div>
      {!past && (
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex gap-1 rounded-full bg-white/[0.04] p-1">
            {RSVP.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setCommunityRsvp(post.id, uid, r.id).catch(() => {})}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                style={{ background: mine === r.id ? '#E8C15A' : 'transparent', color: mine === r.id ? '#1C1A16' : '#BBBBBB' }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 text-[12px]">
            <a href={links.google} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#AAAAAA] hover:text-[#F5F5F5]">
              <CalendarIcon size={12} /> Google Calendar
            </a>
            <a href={links.ics} download={`${(post.title || 'evento').slice(0, 40)}.ics`} className="text-[#AAAAAA] hover:text-[#F5F5F5]">
              Apple / Outlook
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export function AchievementBlock({ post }) {
  if (!post.honorees?.length) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#E8C15A]/25 bg-gradient-to-r from-[#E8C15A]/[0.10] to-transparent p-4">
      <span className="text-[26px]">🏆</span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {post.honorees.map((h) => (
          <span key={h.uid} className="flex items-center gap-1.5 rounded-full bg-black/30 py-1 pl-1 pr-3 text-[13px] font-medium text-[#F2EBDD]">
            <PersonAvatar uid={h.uid} name={h.name} size={24} /> {h.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ResourceCard({ resource }) {
  if (!resource?.url) return null
  let host = ''
  try {
    host = new URL(resource.url).hostname.replace('www.', '')
  } catch {
    host = resource.url
  }
  return (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/[0.2]">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
        {resource.iconUrl ? <img src={resource.iconUrl} alt="" className="h-5 w-5" /> : <FileIcon size={18} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium text-[#F5F5F5]">{resource.name || host}</span>
        <span className="block truncate text-[12px] text-[#8A8A8A]">{resource.kind === 'drive' ? 'Google Drive' : host} · Abrir ↗</span>
      </span>
    </a>
  )
}

const IDEA_STATUS = {
  nueva: { label: 'Nueva', color: '#AAAAAA' },
  evaluacion: { label: 'En evaluación', color: '#FFC107' },
  aprobada: { label: 'Aprobada', color: '#4CAF50' },
  descartada: { label: 'Descartada', color: '#EF5350' },
}

export function IdeaBar({ post, uid, isAdminUser }) {
  const votes = post.votes || []
  const voted = votes.includes(uid)
  const status = IDEA_STATUS[post.ideaStatus] || IDEA_STATUS.nueva
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => toggleCommunityVote(post.id, uid, !voted).catch(() => {})}
        className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors"
        style={{ borderColor: voted ? '#E8C15A' : 'rgba(255,255,255,0.14)', color: voted ? '#E8C15A' : '#DDDDDD', background: voted ? 'rgba(232,193,90,0.1)' : 'transparent' }}
      >
        ▲ Me sumo <span className="tabular-nums">{votes.length}</span>
      </button>
      {isAdminUser ? (
        <select
          value={post.ideaStatus || 'nueva'}
          onChange={(e) => updateCommunityPost(post.id, { ideaStatus: e.target.value }).catch(() => {})}
          className="rounded-full border border-white/[0.1] bg-[#141414] px-3 py-1.5 text-[12.5px] outline-none"
          style={{ color: status.color }}
        >
          {Object.entries(IDEA_STATUS).map(([id, s]) => (
            <option key={id} value={id}>
              {s.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="rounded-full px-3 py-1 text-[12.5px] font-medium" style={{ color: status.color, background: `${status.color}1F` }}>
          {status.label}
        </span>
      )}
    </div>
  )
}

// Text with clickable #hashtags (they fill the search box) and links.
export function PostText({ text, onTag, className }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+|https?:\/\/\S+)/u)
  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.startsWith('#') && part.length > 1 ? (
          <button key={i} type="button" onClick={() => onTag?.(part)} className="font-medium text-[#E8C15A] hover:underline">
            {part}
          </button>
        ) : /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-[#E8C15A] underline decoration-[#E8C15A]/40 underline-offset-2">
            {part}
          </a>
        ) : (
          part
        )
      )}
    </p>
  )
}

export { SERIF }
