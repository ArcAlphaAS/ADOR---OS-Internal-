import { useEffect, useState } from 'react'
import { subscribeNews } from '../../lib/firestore'
import { isPublished } from '../../lib/news'
import { Cover, SERIF } from '../news/NewsLayout'

// The newest announcement on Inicio, so nobody misses it (last 30 days;
// nothing shown otherwise). Gold edge + "Confirma que lo leíste" when it
// asks for a confirmation you haven't given.
export default function LatestNewsCard({ uid, onNavigate }) {
  const [posts, setPosts] = useState([])
  useEffect(() => subscribeNews(setPosts), [])
  const post = posts
    .filter(isPublished)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0]
  if (!post || Date.now() - (post.createdAt?.toMillis?.() || 0) > 30 * 864e5) return null
  const unread = uid && post.createdByUid !== uid && !(post.readBy || []).includes(uid)
  const mustAck = post.requireAck && post.createdByUid !== uid && !(post.acks || []).includes(uid)

  return (
    <button
      type="button"
      onClick={() => onNavigate?.('news', { type: 'news', id: post.id })}
      className={`ador-glass ador-grain ador-card-hover ador-wrap group flex w-full items-center gap-4 overflow-hidden rounded-[20px] p-3 pr-5 text-left ${mustAck ? 'ador-card-attention' : ''}`}
    >
      <span className="h-[84px] w-[120px] flex-shrink-0 overflow-hidden rounded-2xl">
        <Cover post={post} zoom />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#7A7A7A]">
          Último anuncio{post.category ? ` · ${post.category}` : ''}
          {unread && <span className="h-1.5 w-1.5 rounded-full bg-[#E8C15A]" />}
        </span>
        <span className="mt-1 line-clamp-2 block text-[18px] leading-snug text-[#F5F5F5]" style={SERIF}>
          {post.title}
        </span>
        <span className="mt-1 block text-[12.5px] text-[#8A8A8A]">{mustAck ? 'Confirma que lo leíste →' : `Por ${post.createdBy || 'ADOR'} · Leer →`}</span>
      </span>
    </button>
  )
}
