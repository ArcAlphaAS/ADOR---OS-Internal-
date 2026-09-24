import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { subscribeNews, createNewsPost, updateNewsPost, deleteNewsPost, subscribeCommunityPosts, subscribeUserProfile } from '../../lib/firestore'
import { renderMarkdown } from '../../lib/knowledge'
import { isAdmin } from '../../lib/permissions'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import NewsEditor from './NewsEditor'
import NewsHeroCard from './NewsHeroCard'
import CommunityFeed from './CommunityFeed'
import Avatar from '../shell/Avatar'
import { GlobeIcon, PlusIcon, EditIcon, ArrowLeftIcon } from '../icons'

// One module, two tabs — direct user request to merge News and Comunidad:
// the only real difference between them was ever tone (formal press-
// release vs. casual team pulse), not audience, so two separate nav
// entries was more navigation than the distinction was worth at
// 3-founder scale. Kept as genuinely different collections/write models
// underneath (see lib/firestore.js: News is admin-gated with edit/delete
// history-free but structured; Comunidad is open-write with reactions) —
// only the shell (header, tab switcher) is shared.
const TABS = [
  { id: 'anuncios', label: 'Anuncios' },
  { id: 'comunidad', label: 'Comunidad' },
]

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

function formatDate(ts) {
  if (!ts?.toDate) return null
  return ts.toDate().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Pinned posts first (a manual editorial call — see lib/firestore.js),
// then reverse-chronological within each group.
function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
  })
}

function PostDetail({ post, isAdminUser, onBack, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onBack} className="flex w-fit items-center gap-1.5 text-[12px] text-[#666666] hover:text-[#F5F5F5]">
        <ArrowLeftIcon size={12} /> Volver a Anuncios
      </button>

      <NewsHeroCard post={post} />

      <div className="ador-glass ador-grain flex flex-col gap-5 rounded-2xl p-7">
        <div className="flex items-start justify-between gap-4">
          <p className="flex items-center gap-2 text-[12.5px] text-[#666666]">
            <Avatar displayName={post.createdBy} size={20} />
            {post.createdBy} · {formatDate(post.createdAt)}
            {post.updatedAt?.toMillis?.() !== post.createdAt?.toMillis?.() ? ' (editado)' : ''}
          </p>
          {isAdminUser && (
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.1] px-3.5 py-1.5 text-[12px] text-[#888888] transition-colors duration-150 hover:border-white/[0.2] hover:text-[#F5F5F5]"
              >
                <EditIcon size={12} /> Editar
              </button>
              {confirmDelete ? (
                <button type="button" onClick={() => onDelete(post)} className="rounded-full bg-[#EF5350]/15 px-3.5 py-1.5 text-[12px] font-medium text-[#EF5350]">
                  ¿Confirmar borrado?
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full px-3.5 py-1.5 text-[12px] text-[#666666] hover:text-[#EF5350]">
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
        <div className="h-px bg-white/[0.06]" />
        {renderMarkdown(post.body)}
      </div>
    </div>
  )
}

function AnunciosTab({ user, isAdminUser, focusPostId }) {
  const [posts, setPosts] = useState([])
  const [openPostId, setOpenPostId] = useState(focusPostId || null)
  useEffect(() => {
    if (focusPostId) setOpenPostId(focusPostId)
  }, [focusPostId])
  const [composing, setComposing] = useState(false) // false | true (editing open post) | 'new'
  const [saving, setSaving] = useState(false)
  const showToast = useToast()
  const actorName = actorNameFor(user)

  useEffect(() => subscribeNews(setPosts), [])

  const sorted = sortPosts(posts)
  const openPost = posts.find((p) => p.id === openPostId) || null

  const handleSave = async (data) => {
    setSaving(true)
    try {
      if (composing === 'new') {
        const ref = await withTimeout(createNewsPost(data, actorName))
        setOpenPostId(ref.id)
      } else {
        await withTimeout(updateNewsPost(openPost.id, data, actorName))
      }
      setComposing(false)
    } catch (error) {
      showToast(`No se pudo publicar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (post) => {
    withTimeout(deleteNewsPost(post.id))
      .then(() => setOpenPostId((id) => (id === post.id ? null : id)))
      .catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
  }

  return (
    <>
      {isAdminUser && !composing && !openPost && (
        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={() => setComposing('new')}
            className="ador-btn-primary flex flex-shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-medium"
          >
            <PlusIcon size={14} /> Nuevo anuncio
          </button>
        </div>
      )}

      {composing ? (
        <NewsEditor initial={composing === 'new' ? null : openPost} onSave={handleSave} onCancel={() => setComposing(false)} saving={saving} />
      ) : openPost ? (
        <AnimatePresence mode="wait">
          <motion.div key={openPost.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
            <PostDetail
              post={openPost}
              isAdminUser={isAdminUser}
              onBack={() => setOpenPostId(null)}
              onEdit={() => setComposing(true)}
              onDelete={handleDelete}
            />
          </motion.div>
        </AnimatePresence>
      ) : sorted.length === 0 ? (
        <div className="ador-glass ador-grain flex flex-col items-center gap-2 rounded-2xl px-6 py-16 text-center">
          <GlobeIcon size={20} className="text-[#333333]" />
          <p className="text-[14px] font-medium text-[#888888]">Sin anuncios todavía</p>
          <p className="text-[13px] text-[#444444]">
            {isAdminUser ? 'Usa "+ Nuevo anuncio" para publicar el primero.' : 'El equipo todavía no ha publicado ningún anuncio.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {sorted.map((post) => (
            <NewsHeroCard key={post.id} post={post} onOpen={() => setOpenPostId(post.id)} />
          ))}
        </div>
      )}
    </>
  )
}

// `focus` (from the top-bar search): {type:'news', id} opens that post,
// {type:'community'} opens the Comunidad tab.
export default function NewsModule({ user, focus, onFocusHandled }) {
  const [tab, setTab] = useState(focus?.type === 'community' ? 'comunidad' : 'anuncios')
  const [focusPostId, setFocusPostId] = useState(focus?.type === 'news' ? focus.id : null)
  useEffect(() => {
    if (!focus) return
    setTab(focus.type === 'community' ? 'comunidad' : 'anuncios')
    if (focus.type === 'news') setFocusPostId(focus.id)
    onFocusHandled?.()
  }, [focus])
  const [profile, setProfile] = useState(null)
  const [communityPosts, setCommunityPosts] = useState([])
  const isAdminUser = isAdmin(profile)

  useEffect(() => subscribeUserProfile(user?.uid, setProfile), [user?.uid])
  useEffect(() => subscribeCommunityPosts(setCommunityPosts), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-12 pb-16 pt-10"
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">
          {tab === 'anuncios' ? 'Anuncios oficiales' : 'Pulso del equipo'}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold text-[#F5F5F5]">News</h1>
        <p className="mt-1 text-[13px] text-[#888888]">
          {tab === 'anuncios'
            ? 'Lo formal — decisiones, hitos y anuncios de ADOR, escritos por el equipo.'
            : 'Lo informal — avances, ideas y momentos que el equipo quiere compartir.'}
        </p>
      </div>

      <div className="ador-glass flex w-fit items-center gap-1 rounded-full p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="relative rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors duration-150"
            style={{ color: tab === t.id ? '#F5F5F5' : '#888888' }}
          >
            {tab === t.id && (
              <motion.div
                layoutId="news-tab-indicator"
                className="absolute inset-0 rounded-full"
                style={{ background: '#1E5FAD' }}
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {t.label}
              {t.id === 'comunidad' && communityPosts.length > 0 && (
                <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] leading-none">{communityPosts.length}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {tab === 'anuncios' ? (
        <AnunciosTab user={user} isAdminUser={isAdminUser} focusPostId={focusPostId} />
      ) : (
        <CommunityFeed user={user} posts={communityPosts} isAdminUser={isAdminUser} />
      )}
    </motion.div>
  )
}
