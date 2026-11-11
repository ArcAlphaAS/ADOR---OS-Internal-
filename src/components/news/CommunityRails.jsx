import PersonAvatar from '../chat/PersonAvatar'
import { SERIF } from './NewsLayout'
import { BookmarkIcon } from '../icons'
import { COMMUNITY_TYPES } from './CommunityFeed'

// Columnas laterales de Comunidad en escritorio (como una red interna): a la izquierda
// quién eres tú aquí; a la derecha lo que está pasando — encuentros, preguntas sin
// responder, temas y logros. Todo sale de las mismas publicaciones, nada se guarda aparte.

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function eventStart(ev) {
  if (!ev?.date) return null
  const d = new Date(`${ev.date}T${ev.time || '23:59'}`)
  return Number.isNaN(d.getTime()) ? null : d
}

function Card({ title, action, children }) {
  return (
    <section className="ador-glass rounded-[22px] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function LeftRail({ user, profile, directory, posts, savedCount, filter, onPick }) {
  const on = (id) => (filter === id ? 'bg-white/[0.1] text-[#F5F5F5]' : 'text-[#D0D0D0] hover:bg-white/[0.06]')
  const uid = user?.uid
  const entry = directory.find((p) => p.linkedUserId === uid)
  const mine = posts.filter((p) => p.authorUid === uid)
  const likes = mine.reduce((n, p) => n + new Set(Object.values(p.reactions || {}).flat()).size, 0)
  const name = entry?.name || user?.displayName || user?.email?.split('@')[0] || 'Tú'
  const role = [entry?.role, entry?.isDirectivo ? 'Dirección' : entry?.area].filter(Boolean).join(' · ')
  return (
    <aside className="sticky top-6 flex flex-col gap-4 self-start">
      <section className="ador-glass overflow-hidden rounded-[22px]">
        <div className="h-16" style={{ background: 'linear-gradient(120deg, rgba(232,193,90,0.22), rgba(244,238,226,0.06) 55%, rgba(255,255,255,0.02))' }} />
        <div className="-mt-8 px-5 pb-5">
          <span className="inline-block rounded-full ring-4 ring-[#111111]"><PersonAvatar uid={uid} name={name} size={64} /></span>
          <p className="mt-3 text-[17px] leading-tight text-[#F5F5F5]" style={SERIF}>{name}</p>
          <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">{role || 'Equipo ADOR'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-4">
            <div><p className="text-[20px] font-semibold text-[#F5F5F5]">{mine.length}</p><p className="text-[11.5px] text-[#8A8A8A]">Publicaciones</p></div>
            <div><p className="text-[20px] font-semibold text-[#F5F5F5]">{likes}</p><p className="text-[11.5px] text-[#8A8A8A]">Me gusta recibidos</p></div>
          </div>
        </div>
      </section>
      <section className="ador-glass rounded-[22px] p-2">
        <button type="button" onClick={() => onPick('todo')} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] ${on('todo')}`}>Todo el feed</button>
        {savedCount > 0 && (
          <button type="button" onClick={() => onPick('guardados')} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] ${on('guardados')}`}>
            <span className="flex items-center gap-2"><BookmarkIcon size={13} /> Guardados</span>
            <span className="text-[12px] text-[#8A8A8A]">{savedCount}</span>
          </button>
        )}
        {COMMUNITY_TYPES.map((t) => (
          <button key={t.id} type="button" onClick={() => onPick(t.id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] ${on(t.id)}`}>
            <span className="flex items-center gap-2"><t.Icon size={14} className="text-[#8A8A8A]" /> {t.plural}</span>
            <span className="text-[12px] text-[#8A8A8A]">{posts.filter((p) => (p.type || 'actualizacion') === t.id).length || ''}</span>
          </button>
        ))}
      </section>
    </aside>
  )
}

export function RightRail({ posts, onPick, onSearch }) {
  const now = Date.now()
  const events = posts
    .filter((p) => p.type === 'evento')
    .map((p) => ({ p, start: eventStart(p.event) }))
    .filter((x) => x.start && x.start.getTime() + 3 * 3600000 > now)
    .sort((a, b) => a.start - b.start)
    .slice(0, 3)
  const questions = posts.filter((p) => p.type === 'pregunta' && !p.acceptedCommentId).slice(0, 3)
  const tags = new Map()
  posts.forEach((p) => (p.text?.match(/#[\p{L}\p{N}_]+/gu) || []).forEach((t) => tags.set(t.toLowerCase(), (tags.get(t.toLowerCase()) || 0) + 1)))
  const topTags = [...tags].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const wins = posts.filter((p) => p.type === 'logro').slice(0, 3)

  return (
    <aside className="sticky top-6 flex flex-col gap-4 self-start">
      <Card title="Próximos encuentros" action={events.length ? <button type="button" onClick={() => onPick('evento')} className="text-[12px] text-[#8A8A8A] hover:text-[#F5F5F5]">Ver todos</button> : null}>
        {events.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-[#8A8A8A]">Aún no hay encuentros programados.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(({ p, start }) => (
              <button key={p.id} type="button" onClick={() => onSearch?.(p.title || '')} className="flex items-center gap-3 text-left">
                <span className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-white/[0.07]">
                  <span className="text-[9.5px] font-semibold tracking-wide text-[#E8C15A]">{MONTHS[start.getMonth()]}</span>
                  <span className="text-[16px] font-semibold leading-none text-[#F5F5F5]">{start.getDate()}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-[#F0F0F0]">{p.title || p.text?.slice(0, 40) || 'Encuentro'}</span>
                  <span className="block truncate text-[12px] text-[#8A8A8A]">{p.event.time ? `${p.event.time} · ` : ''}{p.event.place || 'ADOR'}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {questions.length > 0 && (
        <Card title="Preguntas sin responder" action={<button type="button" onClick={() => onPick('pregunta')} className="text-[12px] text-[#8A8A8A] hover:text-[#F5F5F5]">Ver</button>}>
          <div className="flex flex-col gap-2.5">
            {questions.map((p) => (
              <button key={p.id} type="button" onClick={() => onSearch?.(p.title || p.text?.slice(0, 30) || '')} className="text-left">
                <span className="line-clamp-2 text-[13.5px] leading-snug text-[#E4E4E4]">{p.title || p.text}</span>
                <span className="text-[11.5px] text-[#8A8A8A]">{p.authorName}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {wins.length > 0 && (
        <Card title="Logros recientes">
          <div className="flex flex-col gap-2.5">
            {wins.map((p) => (
              <p key={p.id} className="text-[13.5px] leading-snug text-[#E4E4E4]">🏆 {p.title || p.text?.slice(0, 60)}<span className="block text-[11.5px] text-[#8A8A8A]">{(p.honorees || []).map((h) => h.name).join(', ') || p.authorName}</span></p>
            ))}
          </div>
        </Card>
      )}

      {topTags.length > 0 && (
        <Card title="Temas del momento">
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(([t, n]) => (
              <button key={t} type="button" onClick={() => onSearch?.(t)} className="rounded-full bg-white/[0.06] px-3 py-1 text-[12.5px] text-[#D0D0D0] hover:bg-white/[0.12]">{t} <span className="text-[#767676]">{n}</span></button>
            ))}
          </div>
        </Card>
      )}
    </aside>
  )
}
