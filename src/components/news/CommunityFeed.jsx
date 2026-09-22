import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createCommunityPost, setCommunityReaction, deleteCommunityPost } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'
import { UsersIcon, CloseIcon } from '../icons'

// LinkedIn's actual 6-reaction set, redone with emoji instead of custom
// icon art — a person has at most one active reaction per post (see
// setCommunityReaction in lib/firestore.js), not a free-for-all tally per
// emoji like the first pass of this feed.
const REACTIONS = [
  { emoji: '👍', label: 'Me gusta' },
  { emoji: '🎉', label: 'Celebrar' },
  { emoji: '❤️', label: 'Me encanta' },
  { emoji: '💡', label: 'Interesante' },
  { emoji: '🤝', label: 'Apoyo' },
  { emoji: '😂', label: 'Divertido' },
]
const REACTION_BY_EMOJI = Object.fromEntries(REACTIONS.map((r) => [r.emoji, r]))

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
      <Avatar displayName={actorName} size={40} />
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

// The small overlapping-emoji + count strip above the action bar — e.g.
// "👍❤️🎉  12" — same idea as LinkedIn's reaction summary. Shows only the
// (up to 3) distinct emojis actually used, by how many people used them.
function ReactionSummary({ reactions }) {
  const entries = Object.entries(reactions)
    .map(([emoji, uids]) => [emoji, uids?.length || 0])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  if (total === 0) return null

  return (
    <div className="flex items-center gap-1.5 text-[12px] text-[#888888]">
      <span className="flex -space-x-1">
        {entries.slice(0, 3).map(([emoji]) => (
          <span key={emoji} className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#141414] text-[11px] ring-1 ring-[#0A0A0A]">
            {emoji}
          </span>
        ))}
      </span>
      {total}
    </div>
  )
}

// The "Me gusta" button — clicking it directly toggles 👍 (or removes your
// current reaction if you click it while already reacted). Hovering
// (same 150ms delay as Sidebar's tooltip, CLAUDE.md §1) reveals the full
// 6-reaction picker above it, LinkedIn-style, to pick something other than
// a plain like without a second click-through.
function LikeButton({ post, uid }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const timerRef = useRef(null)

  const myReaction = Object.entries(post.reactions || {}).find(([, uids]) => uid && uids?.includes(uid))?.[0] || null
  const active = REACTION_BY_EMOJI[myReaction]

  const openPicker = () => {
    timerRef.current = setTimeout(() => setPickerOpen(true), 150)
  }
  const closePicker = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPickerOpen(false)
  }
  const pick = (emoji) => {
    setCommunityReaction(post.id, emoji, uid, myReaction).catch(() => {})
    closePicker()
  }

  return (
    <div className="relative" onMouseEnter={openPicker} onMouseLeave={closePicker}>
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="ador-glass ador-grain absolute bottom-full left-0 mb-2 flex items-center gap-1 rounded-full p-1.5"
          >
            {REACTIONS.map((r) => (
              <button
                key={r.emoji}
                type="button"
                title={r.label}
                onClick={() => pick(r.emoji)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[17px] transition-transform duration-100 hover:scale-125"
              >
                {r.emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => pick(myReaction || '👍')}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150 hover:bg-white/[0.05]"
        style={{ color: active ? '#5B9BD9' : '#888888' }}
      >
        <span>{active?.emoji || '👍'}</span>
        {active?.label || 'Me gusta'}
      </button>
    </div>
  )
}

function PostCard({ post, uid, canDelete, onDelete }) {
  return (
    <div className="ador-glass flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <Avatar displayName={post.authorName} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[13.5px] font-semibold text-[#F5F5F5]">{post.authorName}</p>
              <p className="text-[11.5px] text-[#666666]">
                Asociado ADOR · {timeAgo(post.createdAt)}
              </p>
            </div>
            {canDelete && (
              <button type="button" onClick={() => onDelete(post)} className="flex-shrink-0 text-[#555555] hover:text-[#EF5350]">
                <CloseIcon size={12} />
              </button>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#DDDDDD]">{post.text}</p>
        </div>
      </div>

      <ReactionSummary reactions={post.reactions || {}} />

      <div className="-mx-1 border-t border-white/[0.06] pt-1">
        <LikeButton post={post} uid={uid} />
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
