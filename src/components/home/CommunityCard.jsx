import { useEffect, useState } from 'react'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'
import { subscribeCommunityPosts, subscribeDirectoryPeople, setCommunityRsvp } from '../../lib/firestore'
import { useTodaysBirthdays } from '../../hooks/useTodaysBirthdays'
import { useAccess } from '../../hooks/useAccess'
import PersonAvatar from '../chat/PersonAvatar'

// "Comunidad" on Inicio: the team's shared plans (events posted in Comunidad)
// plus the human moments — birthdays today and people who just joined — which
// only appear when there is one. Faces come from HomePeople's context.
const WELCOME_DAYS = 14

function eventStart(ev) {
  if (!ev?.date) return null
  const [y, m, d] = ev.date.split('-').map(Number)
  const [hh, mm] = (ev.time || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

const pad = (n) => String(n).padStart(2, '0')
function clock(ev) {
  if (!ev.time) return ''
  const [h, m] = ev.time.split(':').map(Number)
  return `${h % 12 || 12}${m ? `:${pad(m)}` : ''} ${h < 12 ? 'am' : 'pm'}`
}

function dayWord(start) {
  const days = Math.round((new Date(start).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (days < 7) return start.toLocaleDateString('es', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase())
  return start.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/^./, (c) => c.toUpperCase())
}

function EventRow({ post, uid, name, onOpen }) {
  const start = eventStart(post.event)
  const going = post.rsvp?.going || []
  const iGo = going.includes(uid)
  const title = post.title || (post.text || '').split('\n')[0].slice(0, 60) || 'Encuentro'
  const when = [dayWord(start), clock(post.event)].filter(Boolean).join(' · ')
  return (
    <li className="flex items-center gap-4 py-3.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <span className="flex w-[46px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border border-white/[0.1] bg-[#141414]">
          <span className="w-full bg-[#E8C15A] py-px text-center text-[9px] font-bold uppercase tracking-wider text-[#1C1A16]">
            {start.toLocaleDateString('es', { month: 'short' }).replace('.', '')}
          </span>
          <span className="py-0.5 text-[19px] font-semibold leading-none text-[#F5F5F5]">{start.getDate()}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] text-[#F0F0F0]">{title}</span>
          <span className="mt-0.5 block truncate text-[12.5px] text-[#8A8A8A]">
            {when}
            {post.event.place ? ` · ${post.event.place}` : ''}
            {going.length > 0 ? ` · ${going.length} ${going.length === 1 ? 'va' : 'van'}` : ''}
          </span>
        </span>
      </button>
      {iGo ? (
        <span className="flex-shrink-0 text-[12.5px] font-medium text-[#E8C15A]">✓ Vas</span>
      ) : (
        <button
          type="button"
          onClick={() => setCommunityRsvp(post.id, uid, 'going', name, post).catch(() => {})}
          className="flex-shrink-0 rounded-full border border-white/[0.18] px-3.5 py-1.5 text-[12.5px] font-medium text-[#E4E4E4] transition-colors hover:border-[#E8C15A] hover:text-[#E8C15A]"
        >
          Voy
        </button>
      )}
    </li>
  )
}

function MomentRow({ uid, name, text, action, onAction }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <PersonAvatar uid={uid} name={name} size={30} />
      <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-[#E4E4E4]">{text}</span>
      {action && (
        <button type="button" onClick={onAction} className="flex-shrink-0 text-[12.5px] font-medium text-[#E8C15A] transition-opacity hover:opacity-80">
          {action}
        </button>
      )}
    </li>
  )
}

export default function CommunityCard({ user, onNavigate }) {
  const [posts, setPosts] = useState([])
  const [directory, setDirectory] = useState([])
  const birthdays = useTodaysBirthdays()
  useEffect(() => subscribeCommunityPosts(setPosts), [])
  useEffect(() => subscribeDirectoryPeople(setDirectory), [])

  const uid = user?.uid
  const { canOrganizeEvents } = useAccess(uid)
  const name = user?.displayName || user?.email?.split('@')[0] || 'Alguien'

  const events = posts
    .map((p) => ({ p, start: p.type === 'evento' ? eventStart(p.event) : null }))
    .filter(({ start }) => start && start.getTime() + 3 * 3600e3 >= Date.now())
    .sort((a, b) => a.start - b.start)
    .slice(0, 3)
    .map(({ p }) => p)

  // Someone who just joined: a Directorio entry created in the last two weeks.
  const welcomes = directory
    .filter((person) => {
      const at = person.createdAt?.toMillis?.() || 0
      return at && Date.now() - at < WELCOME_DAYS * 864e5 && person.linkedUserId !== uid
    })
    .slice(-2)

  const moments = [
    ...birthdays.map((b) => ({
      key: `b-${b.uid}`,
      uid: b.uid,
      name: b.displayName,
      text: b.uid === uid ? `¡Feliz cumpleaños, ${b.displayName.split(' ')[0]}! Todo el equipo te desea un gran día.` : `Hoy es el cumpleaños de ${b.displayName}.`,
      action: b.uid === uid ? null : 'Saludar',
      onAction: () => onNavigate?.('chat', { type: 'chat', convType: 'dm', participantUids: [uid, b.uid] }),
    })),
    ...welcomes.map((w) => ({
      key: `w-${w.id}`,
      uid: w.linkedUserId || null,
      name: w.name,
      text: `Damos la bienvenida a ${w.name}${w.role ? ` · ${w.role}` : ''}.`,
      action: null,
    })),
  ]

  return (
    <div className={`ador-glass ador-grain h-full ${CARD_RADIUS} ${CARD_PAD}`}>
      <CardHeader label="Comunidad" />

      {moments.length > 0 && (
        <ul className="mt-2 divide-y divide-white/[0.06] border-b border-white/[0.06] pb-1">
          {moments.map((m) => (
            <MomentRow key={m.key} {...m} />
          ))}
        </ul>
      )}

      <p className="mb-0.5 mt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#767676]">Próximos encuentros</p>
      {events.length === 0 ? (
        <div className="py-4">
          <p className="text-[13.5px] text-[#7A7A7A]">Sin encuentros por ahora.</p>
          {canOrganizeEvents && (
            <button type="button" onClick={() => onNavigate?.('news', { type: 'community' })} className="mt-1.5 text-[13px] font-medium text-[#E8C15A] transition-opacity hover:opacity-80">
              Organizar uno →
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {events.map((post) => (
            <EventRow key={post.id} post={post} uid={uid} name={name} onOpen={() => onNavigate?.('news', { type: 'community', id: post.id })} />
          ))}
        </ul>
      )}
    </div>
  )
}
