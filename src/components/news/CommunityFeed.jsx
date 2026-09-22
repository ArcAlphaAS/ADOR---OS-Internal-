import { useState } from 'react'
import { createCommunityPost, toggleCommunityReaction, deleteCommunityPost } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'
import { UsersIcon, CloseIcon } from '../icons'

// Fixed, small reaction set — a full emoji picker is more chrome than an
// informal "team pulse" feed needs at 3-founder scale (same "don't build
// for a hypothetical" rule as everywhere else in this app).
const REACTIONS = ['👍', '🎉', '❤️', '💡', '🔥']

function timeAgo(ts) {
  if (!ts?.toDate) return 'Ahora'
  const diffMs = Date.now() - ts.toDate().getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `Hace ${days} d`
}

function Composer({ user, actorName, onPosted }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const submit = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      await withTimeout(createCommunityPost(text.trim(), user.uid, actorName))
      setText('')
      onPosted?.()
    } catch (error) {
      showToast(`No se pudo publicar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ador-glass ador-grain flex gap-3 rounded-2xl p-4">
      <Avatar displayName={actorName} size={32} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
          placeholder="¿Qué está pasando en ADOR? Comparte un avance, una idea, un logro..."
          rows={2}
          className="w-full resize-none bg-transparent text-[13.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!text.trim() || saving}
            onClick={submit}
            className="ador-btn-primary rounded-full px-4 py-1.5 text-[12.5px] font-medium disabled:opacity-50"
          >
            {saving ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReactionBar({ post, uid }) {
  const reactions = post.reactions || {}
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map((emoji) => {
        const uids = reactions[emoji] || []
        const mine = uid && uids.includes(uid)
        if (uids.length === 0 && !mine) {
          // Collapsed/inactive state: a plain, low-emphasis pill so the bar
          // doesn't read as 5 already-used reactions before anyone's clicked.
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => toggleCommunityReaction(post.id, emoji, uid, false).catch(() => {})}
              className="rounded-full px-2 py-1 text-[13px] opacity-40 transition-opacity duration-150 hover:opacity-90"
            >
              {emoji}
            </button>
          )
        }
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggleCommunityReaction(post.id, emoji, uid, mine).catch(() => {})}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] transition-colors duration-150"
            style={{ background: mine ? 'rgba(30,95,173,0.18)' : 'rgba(255,255,255,0.05)', color: mine ? '#5B9BD9' : '#888888' }}
          >
            <span>{emoji}</span>
            <span className="font-medium">{uids.length}</span>
          </button>
        )
      })}
    </div>
  )
}

function PostCard({ post, uid, canDelete, onDelete }) {
  return (
    <div className="ador-glass flex gap-3 rounded-2xl p-4">
      <Avatar displayName={post.authorName} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-[#F5F5F5]">
            {post.authorName} <span className="ml-1.5 font-normal text-[#555555]">{timeAgo(post.createdAt)}</span>
          </p>
          {canDelete && (
            <button type="button" onClick={() => onDelete(post)} className="flex-shrink-0 text-[#555555] hover:text-[#EF5350]">
              <CloseIcon size={12} />
            </button>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#DDDDDD]">{post.text}</p>
        <div className="mt-2.5">
          <ReactionBar post={post} uid={uid} />
        </div>
      </div>
    </div>
  )
}

export default function CommunityFeed({ user, posts, isAdminUser }) {
  const actorName = user?.displayName || user?.email?.split('@')[0] || 'Usuario'
  const showToast = useToast()

  const handleDelete = (post) => {
    withTimeout(deleteCommunityPost(post.id)).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
  }

  return (
    <div className="flex flex-col gap-4">
      <Composer user={user} actorName={actorName} />

      {posts.length === 0 ? (
        <div className="ador-glass ador-grain flex flex-col items-center gap-2 rounded-2xl px-6 py-14 text-center">
          <UsersIcon size={20} className="text-[#333333]" />
          <p className="text-[14px] font-medium text-[#888888]">Todavía no hay nada por aquí</p>
          <p className="text-[13px] text-[#444444]">Sé el primero en compartir algo con el equipo.</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} uid={user?.uid} canDelete={isAdminUser || post.authorUid === user?.uid} onDelete={handleDelete} />
        ))
      )}
    </div>
  )
}
