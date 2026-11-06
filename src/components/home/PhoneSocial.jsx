import { useEffect, useState } from 'react'
import { subscribeNews, subscribeCommunityPosts } from '../../lib/firestore'
import { isPublished } from '../../lib/news'
import { ago } from '../../lib/chat'
import { Cover, SERIF } from '../news/NewsLayout'
import PersonAvatar from '../chat/PersonAvatar'
import HomePeople from './HomePeople'

// El lado "red social" de Inicio en el teléfono: lo último de News y lo último de
// Comunidad, solo cuando hay algo reciente (anuncio de la última semana o
// publicaciones de los últimos 5 días). Si no hay nada, no ocupa lugar.
const TYPE = { actualizacion: 'Actualización', idea: 'Idea', pregunta: 'Pregunta', logro: 'Logro', evento: 'Evento', recurso: 'Recurso' }
const DAY = 864e5

function likeCount(p) {
  return Object.values(p.reactions || {}).reduce((n, list) => n + (list?.length || 0), 0)
}

export default function PhoneSocial({ uid, onNavigate }) {
  const [news, setNews] = useState([])
  const [posts, setPosts] = useState([])
  useEffect(() => subscribeNews(setNews), [])
  useEffect(() => subscribeCommunityPosts(setPosts), [])

  const announcement = news
    .filter(isPublished)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .find((p) => Date.now() - (p.createdAt?.toMillis?.() || 0) < 7 * DAY)
  const recent = posts
    .filter((p) => Date.now() - (p.createdAt?.toMillis?.() || 0) < 5 * DAY)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, 3)
  if (!announcement && recent.length === 0) return null
  const mustAck = announcement && announcement.requireAck && announcement.createdByUid !== uid && !(announcement.acks || []).includes(uid)

  return (
    <HomePeople>
      <div className="flex flex-col gap-3">
        {announcement && (
          <button type="button" onClick={() => onNavigate?.('news', { type: 'news', id: announcement.id })} className="ador-wrap flex w-full flex-col overflow-hidden rounded-[26px] bg-[#1C1C1E] text-left active:bg-[#242426]">
            <span className="block h-[150px] w-full overflow-hidden"><Cover post={announcement} zoom /></span>
            <span className="px-5 pb-5 pt-4">
              <span className="flex items-center gap-2 text-[12.5px] text-[#8E8E93]">
                <span className="font-medium text-[#E8C15A]">Anuncio{announcement.category ? ` · ${announcement.category}` : ''}</span>
                <span>· {ago(Date.now() - (announcement.createdAt?.toMillis?.() || 0))}</span>
              </span>
              <span className="mt-1.5 block text-[20px] leading-snug text-[#F5F5F5]" style={SERIF}>{announcement.title}</span>
              {mustAck && <span className="mt-2 block text-[13px] font-medium text-[#F4EEE2]">Confirmar que lo leí →</span>}
            </span>
          </button>
        )}

        {recent.length > 0 && (
          <div className="rounded-[26px] bg-[#1C1C1E] px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#8E8E93]">En la comunidad</span>
              <button type="button" onClick={() => onNavigate?.('news', { type: 'community' })} className="text-[13px] font-medium text-[#F4EEE2]">Ver todo</button>
            </div>
            <ul className="mt-1 divide-y divide-white/[0.06]">
              {recent.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onNavigate?.('news', { type: 'community', id: p.id })} className="flex w-full items-start gap-3 py-3 text-left">
                    <PersonAvatar uid={p.authorUid} name={p.authorName} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13px]">
                        <span className="font-semibold text-[#F5F5F5]">{(p.authorName || 'Alguien').split(' ')[0]}</span>
                        <span className="text-[#8A8A8A]">· {TYPE[p.type] || 'Publicación'} · {ago(Date.now() - (p.createdAt?.toMillis?.() || 0))}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[14.5px] leading-snug text-[#D8D8D8]">{p.title || p.text}</span>
                      <span className="mt-1 flex items-center gap-3 text-[12.5px] text-[#8E8E93]">
                        {likeCount(p) > 0 && <span>❤ {likeCount(p)}</span>}
                        {p.commentCount > 0 && <span>💬 {p.commentCount}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </HomePeople>
  )
}
