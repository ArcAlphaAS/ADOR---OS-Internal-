import { useEffect, useState } from 'react'
import { subscribeNews } from '../../lib/firestore'
import { isPublished } from '../../lib/news'
import { ago } from '../../lib/chat'
import { Cover, SERIF } from '../news/NewsLayout'
import PersonAvatar from '../chat/PersonAvatar'

// The newest announcement on Inicio, as a small editorial piece: a wide cover,
// serif headline, two lines of text and who published it and when (last 30
// days; nothing shown otherwise). Gold edge + "Confirmar que lo leí" when it
// asks for a confirmation you haven't given.
function excerptOf(post) {
  if (post.subtitle) return post.subtitle
  return (post.body || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function LatestNewsCard({ uid, onNavigate }) {
  const [posts, setPosts] = useState([])
  useEffect(() => subscribeNews(setPosts), [])
  const post = posts
    .filter(isPublished)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0]
  const at = post?.createdAt?.toMillis?.() || 0
  if (!post || Date.now() - at > 30 * 864e5) return null
  const unread = uid && post.createdByUid !== uid && !(post.readBy || []).includes(uid)
  const mustAck = post.requireAck && post.createdByUid !== uid && !(post.acks || []).includes(uid)
  const excerpt = excerptOf(post)

  return (
    <button
      type="button"
      onClick={() => onNavigate?.('news', { type: 'news', id: post.id })}
      className={`ador-glass ador-grain ador-card-hover ador-wrap group flex h-full w-full flex-col overflow-hidden rounded-[24px] text-left ${mustAck ? 'ador-card-attention' : ''}`}
    >
      <span className="block h-[180px] w-full overflow-hidden sm:h-[220px]">
        <Cover post={post} zoom />
      </span>
      <span className="flex flex-1 flex-col px-7 pb-6 pt-5 sm:px-8">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7A7A7A]">
          Último anuncio{post.category ? ` · ${post.category}` : ''}
          {unread && <span className="h-1.5 w-1.5 rounded-full bg-[#E8C15A]" />}
        </span>
        <span className="mt-2 line-clamp-2 block text-[24px] leading-[1.2] text-[#F5F5F5] sm:text-[26px]" style={SERIF}>
          {post.title}
        </span>
        {excerpt && <span className="mt-2 line-clamp-2 block text-[14px] leading-relaxed text-[#9A9A9A]">{excerpt}</span>}
        <span className="mt-auto flex items-center gap-2.5 pt-4">
          <PersonAvatar uid={post.createdByUid} name={post.createdBy} size={26} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#8A8A8A]">
            {post.createdBy || 'ADOR'}
            {at ? ` · ${ago(Date.now() - at)}` : ''}
          </span>
          {mustAck && <span className="flex-shrink-0 text-[12.5px] font-medium text-[#E8C15A]">Confirmar que lo leí →</span>}
        </span>
      </span>
    </button>
  )
}
