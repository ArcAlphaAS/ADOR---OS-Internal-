import { useEffect, useRef, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { subscribeNews, createNewsPost, updateNewsPost, deleteNewsPost, subscribeCommunityPosts, subscribeUserProfile, subscribeUsers, markNewsRead, ackNewsPost } from '../../lib/firestore'
import { isPublished, notifyNewsPublished } from '../../lib/news'
import PersonAvatar, { ChatPeopleContext } from '../chat/PersonAvatar'
import { NEWS_CATEGORIES } from './NewsLayout'
import { renderMarkdown } from '../../lib/knowledge'
import { isAdmin } from '../../lib/permissions'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import NewsEditor from './NewsEditor'
import { FeaturedStory, LatestList, EditorialRow, SERIF, Cover } from './NewsLayout'
import CommunityFeed from './CommunityFeed'
import Avatar from '../shell/Avatar'
import { GlobeIcon, PlusIcon, EditIcon, ArrowLeftIcon, SearchIcon } from '../icons'

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

// An opened announcement, laid out like the user's reference (a travel-app
// detail card): the photo inset in a rounded card with the category and a
// glass button on it, then the serif headline, a short stats row
// (Categoría · Lectura · Publicado), the author in a soft tile on the
// right, the article, and a ^ back to the top.
function readingMinutes(body) {
  const words = (body || '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function PostDetail({ post, user, users = [], related = [], onOpenPost, isAdminUser, onBack, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const topRef = useRef(null)
  const edited = post.updatedAt?.toMillis?.() && post.updatedAt.toMillis() - (post.createdAt?.toMillis?.() || 0) > 60_000

  const copyLink = () => {
    const url = `${window.location.origin}/?open=news&nid=${post.id}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const stats = [
    { value: post.category || 'General', label: 'Categoría' },
    { value: `${readingMinutes(post.body)} min`, label: 'Lectura' },
    { value: post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '') : '—', label: 'Publicado' },
  ]

  return (
    <div ref={topRef} className="mx-auto flex w-full max-w-[780px] flex-col gap-4">
      <button type="button" onClick={onBack} className="flex w-fit items-center gap-1.5 text-[12.5px] text-[#8A8A8A] hover:text-[#F5F5F5]">
        <ArrowLeftIcon size={12} /> Volver a Anuncios
      </button>

      <article className="ador-wrap ador-glass overflow-hidden rounded-[32px] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:p-3">
        {/* Photo, inset with its own radius */}
        <div className="relative h-[260px] overflow-hidden rounded-[24px] md:h-[380px]">
          <Cover post={post} />
          <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(8,8,9,0.35) 45%, rgba(8,8,9,0.85) 100%)' }} />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-6">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-white">{post.category || 'Anuncio oficial'}</p>
              <p className="truncate text-[12.5px] text-white/65">ADOR · News{post.pinned ? ' · Destacado' : ''}</p>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="flex-shrink-0 rounded-2xl border border-white/20 bg-white/15 px-5 py-3 text-[14px] font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/25 md:px-7"
            >
              {copied ? 'Enlace copiado ✓' : 'Copiar enlace'}
            </button>
          </div>
        </div>

        <div className="px-3 pb-2 pt-6 md:px-6">
          {/* Headline + stats, author tile on the right */}
          <div className="flex items-start gap-5">
            <div className="min-w-0 flex-1">
              <h1 className="text-[28px] leading-[1.12] text-[#F5F5F5] md:text-[34px]" style={SERIF}>
                {post.title}
              </h1>
              <p className="mt-1.5 text-[13px] text-[#8A8A8A]">
                {formatDate(post.createdAt)} · Por {post.createdBy || 'ADOR'}
                {edited ? ' · editado' : ''}
              </p>
              <div className="mt-4 h-px bg-white/[0.08]" />
              <div className="mt-4 flex gap-8">
                {stats.map((st) => (
                  <div key={st.label}>
                    <p className="text-[16px] font-semibold text-[#F5F5F5]">{st.value}</p>
                    <p className="text-[11.5px] text-[#7A7A7A]">{st.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden w-[130px] flex-shrink-0 flex-col items-center justify-center gap-2 rounded-[22px] bg-white/[0.05] px-3 py-5 sm:flex">
              <Avatar displayName={post.createdBy} size={46} />
              <p className="max-w-full truncate text-center text-[12.5px] font-medium text-[#DDDDDD]">{post.createdBy || 'ADOR'}</p>
              <p className="text-[11px] text-[#7A7A7A]">Autor</p>
            </div>
          </div>

          {!isPublished(post) && (
            <p className="mt-4 inline-block rounded-full bg-[#E8C15A]/15 px-3 py-1 text-[12px] text-[#E8C15A]">
              {post.status === 'scheduled' ? `Programado para ${post.publishAt?.toDate?.().toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}` : 'Borrador — solo lo ven los administradores'}
            </p>
          )}
          {post.subtitle && <p className="mt-6 text-[16px] leading-relaxed text-[#CFCFCF]">{post.subtitle}</p>}

          <div className="mt-5 text-[15px] leading-[1.75] text-[#BDBDBD]">{renderMarkdown(post.body)}</div>

          {isPublished(post) && <ReadReceipts post={post} user={user} users={users} />}

          {isAdminUser && (
            <div className="mt-8 flex items-center gap-2 border-t border-white/[0.06] pt-5">
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.1] px-3.5 py-1.5 text-[12.5px] text-[#AAAAAA] transition-colors hover:border-white/[0.2] hover:text-[#F5F5F5]"
              >
                <EditIcon size={12} /> Editar
              </button>
              {confirmDelete ? (
                <button type="button" onClick={() => onDelete(post)} className="rounded-full bg-[#EF5350]/15 px-3.5 py-1.5 text-[12.5px] font-medium text-[#EF5350]">
                  ¿Confirmar borrado?
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full px-3.5 py-1.5 text-[12.5px] text-[#8A8A8A] hover:text-[#EF5350]">
                  Eliminar
                </button>
              )}
            </div>
          )}

          {related.length > 0 && (
            <div className="mt-10 border-t border-white/[0.06] pt-6">
              <p className="text-[20px] text-[#F5F5F5]" style={SERIF}>
                Sigue leyendo
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {related.map((r) => (
                  <button key={r.id} type="button" onClick={() => onOpenPost(r.id)} className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] text-left hover:border-white/[0.16]">
                    <span className="block h-[90px] overflow-hidden">
                      <Cover post={r} zoom />
                    </span>
                    <span className="p-3">
                      {r.category && <span className="block text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">{r.category}</span>}
                      <span className="mt-0.5 line-clamp-2 block text-[14px] leading-snug text-[#EDEDED]" style={SERIF}>
                        {r.title}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center pb-2">
            <button
              type="button"
              onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              aria-label="Volver arriba"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#8A8A8A] hover:bg-white/[0.06] hover:text-[#F5F5F5]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 15 6-6 6 6" />
              </svg>
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}

// "Leído por" faces + "Confirmar lectura" when the author asked for it.
function ReadReceipts({ post, user, users }) {
  const uid = user?.uid
  const team = users.filter((u) => u.id !== post.createdByUid)
  const readers = (post.readBy || []).filter((r) => r !== post.createdByUid)
  const acks = post.acks || []
  const iAmAuthor = uid && uid === post.createdByUid
  const needMyAck = post.requireAck && !iAmAuthor && !acks.includes(uid)
  const missing = post.requireAck ? team.filter((u) => !acks.includes(u.id)) : []
  const nameOf = (u) => (u.displayName || u.email || '').split(' ')[0]
  return (
    <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex -space-x-2">
            {readers.slice(0, 6).map((r) => (
              <span key={r} className="rounded-full ring-2 ring-[#141414]">
                <PersonAvatar uid={r} size={26} />
              </span>
            ))}
          </span>
          <span className="text-[13px] text-[#AAAAAA]">
            {readers.length === 0 ? 'Nadie lo ha leído todavía' : `Leído por ${readers.length}${team.length ? ` de ${team.length}` : ''}`}
          </span>
        </div>
        {post.requireAck && (
          <span className="text-[12.5px] text-[#8A8A8A]">
            Confirmado por {acks.filter((a) => a !== post.createdByUid).length} de {team.length}
          </span>
        )}
      </div>
      {needMyAck && (
        <button
          type="button"
          onClick={() => ackNewsPost(post.id, uid).catch(() => {})}
          className="self-start rounded-full bg-[#E8C15A] px-5 py-2 text-[13.5px] font-semibold text-[#1C1A16]"
        >
          Confirmar que lo leí
        </button>
      )}
      {post.requireAck && acks.includes(uid) && !iAmAuthor && <p className="text-[12.5px] text-[#8FD19A]">✓ Confirmaste que lo leíste</p>}
      {iAmAuthor && post.requireAck && missing.length > 0 && <p className="text-[12.5px] text-[#8A8A8A]">Falta confirmar: {missing.map(nameOf).join(', ')}</p>}
    </div>
  )
}

// Every word must appear somewhere in the post (accent/case-insensitive).
const fold = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
function matches(post, query) {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = fold([post.title, post.subtitle, post.body, post.category, post.createdBy].join(' '))
  return words.every((w) => hay.includes(w))
}

function AnunciosTab({ user, isAdminUser, focusPostId, posts, query, composeRequest, users }) {
  const [openPostId, setOpenPostId] = useState(focusPostId || null)
  useEffect(() => {
    if (focusPostId) setOpenPostId(focusPostId)
  }, [focusPostId])
  const [composing, setComposing] = useState(false) // false | true (editing open post) | 'new'
  const [saving, setSaving] = useState(false)
  const showToast = useToast()
  const actorName = actorNameFor(user)

  // "Nueva publicación" lives in the page header (NewsModule).
  useEffect(() => {
    if (composeRequest) setComposing('new')
  }, [composeRequest])

  const [category, setCategory] = useState(null)
  const live = sortPosts(posts.filter(isPublished))
  const unpublished = isAdminUser ? posts.filter((p) => !isPublished(p)) : []
  const usedCategories = NEWS_CATEGORIES.filter((c) => live.some((p) => p.category === c))
  const sorted = live.filter((p) => matches(p, query) && (!category || p.category === category))
  const openPost = posts.find((p) => p.id === openPostId && (isPublished(p) || isAdminUser)) || null

  // Opening an announcement counts as reading it ("Leído por").
  useEffect(() => {
    if (openPost && isPublished(openPost) && user?.uid && user.uid !== 'preview' && !(openPost.readBy || []).includes(user.uid)) markNewsRead(openPost.id, user.uid).catch(() => {})
  }, [openPost?.id, user?.uid])

  const handleSave = async (data) => {
    setSaving(true)
    try {
      const sender = { uid: user?.uid, name: actorName }
      if (composing === 'new') {
        const ref = await withTimeout(createNewsPost(data, actorName, user?.uid))
        if (data.status === 'published') notifyNewsPublished({ id: ref.id, ...data }, sender)
        setOpenPostId(ref.id)
      } else {
        const wasLive = isPublished(openPost)
        // A draft/scheduled post going live now: date it now and notify.
        const patch = !wasLive && data.status === 'published' ? { ...data, createdAt: serverTimestamp() } : data
        await withTimeout(updateNewsPost(openPost.id, patch, actorName))
        if (!wasLive && data.status === 'published') notifyNewsPublished({ id: openPost.id, ...data }, sender)
      }
      showToast(data.status === 'draft' ? 'Borrador guardado' : data.status === 'scheduled' ? 'Programado — se publicará solo' : 'Publicado — el equipo recibirá un aviso')
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
      {composing ? (
        <NewsEditor initial={composing === 'new' ? null : openPost} onSave={handleSave} onCancel={() => setComposing(false)} saving={saving} />
      ) : openPost ? (
        <AnimatePresence mode="wait">
          <motion.div key={openPost.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
            <PostDetail
              post={openPost}
              user={user}
              users={users}
              related={live.filter((p) => p.id !== openPost.id).sort((a, b) => (b.category === openPost.category) - (a.category === openPost.category)).slice(0, 3)}
              onOpenPost={setOpenPostId}
              isAdminUser={isAdminUser}
              onBack={() => setOpenPostId(null)}
              onEdit={() => setComposing(true)}
              onDelete={handleDelete}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="flex flex-col gap-6">
          {unpublished.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-white/[0.12] p-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Borradores y programados · solo administradores</p>
              {unpublished.map((p) => (
                <button key={p.id} type="button" onClick={() => setOpenPostId(p.id)} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/[0.04]">
                  <span className="min-w-0 truncate text-[14px] text-[#EDEDED]">{p.title || 'Sin título'}</span>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] ${p.status === 'scheduled' ? 'bg-[#E8C15A]/15 text-[#E8C15A]' : 'bg-white/[0.07] text-[#AAAAAA]'}`}>
                    {p.status === 'scheduled' ? `Programado · ${p.publishAt?.toDate?.().toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Borrador'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {usedCategories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {[null, ...usedCategories].map((c) => (
                <button
                  key={c || 'all'}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors"
                  style={{ borderColor: category === c ? '#E8C15A' : 'rgba(255,255,255,0.1)', color: category === c ? '#E8C15A' : '#AAAAAA', background: category === c ? 'rgba(232,193,90,0.1)' : 'transparent' }}
                >
                  {c || 'Todas'}
                </button>
              ))}
            </div>
          )}
      {sorted.length === 0 ? (
        <div className="ador-glass ador-grain flex flex-col items-center gap-2 rounded-2xl px-6 py-16 text-center">
          <GlobeIcon size={20} className="text-[#5A5A5A]" />
          <p className="text-[14px] font-medium text-[#AAAAAA]">{query || category ? 'Nada coincide' : 'Sin anuncios todavía'}</p>
          <p className="text-[13px] text-[#7A7A7A]">
            {query || category ? 'Prueba con otras palabras o categoría.' : isAdminUser ? 'Usa "Nueva publicación" para publicar el primero.' : 'El equipo todavía no ha publicado ningún anuncio.'}
          </p>
        </div>
      ) : (
        // Featured (pinned or newest) + "Lo último" (next 4) + Editorial (the rest).
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
            <FeaturedStory post={sorted[0]} onOpen={() => setOpenPostId(sorted[0].id)} />
            <LatestList posts={sorted.slice(1, 5)} onOpen={setOpenPostId} />
          </div>
          {sorted.length > 5 && <EditorialRow posts={sorted.slice(5)} onOpen={setOpenPostId} />}
        </div>
      )}
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

  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])
  useEffect(() => subscribeUsers(setUsers), [])
  const [query, setQuery] = useState('')
  const [composeRequest, setComposeRequest] = useState(0)
  useEffect(() => subscribeNews(setPosts), [])
  useEffect(() => subscribeUserProfile(user?.uid, setProfile), [user?.uid])
  useEffect(() => subscribeCommunityPosts(setCommunityPosts), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`mx-auto flex w-full flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10 ${tab === 'comunidad' ? 'max-w-[1040px]' : 'max-w-[1440px]'}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8A8A8A]">
            {tab === 'anuncios' ? 'Anuncios oficiales' : 'Pulso del equipo'}
          </p>
          <h1 className="mt-1 text-[38px] leading-none text-[#F5F5F5] md:text-[46px]" style={SERIF}>
            {tab === 'anuncios' ? 'News' : 'Comunidad ADOR'}
          </h1>
          <p className="mt-2 text-[13.5px] text-[#9A9A9A]">
            {tab === 'anuncios'
              ? 'Decisiones, hitos y anuncios de ADOR, escritos por el equipo.'
              : 'Personas, ideas y conversaciones que impulsan lo que construimos.'}
          </p>
        </div>
        {(
          <div className="flex items-center gap-2.5">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 md:w-[260px] md:flex-none">
              <SearchIcon size={15} className="flex-shrink-0 text-[#8A8A8A]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'anuncios' ? 'Buscar noticias…' : 'Buscar en la comunidad…'}
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[#F5F5F5] placeholder:text-[#777777] outline-none"
              />
            </label>
            {isAdminUser && tab === 'anuncios' && (
              <button
                type="button"
                onClick={() => setComposeRequest((n) => n + 1)}
                className="flex h-11 flex-shrink-0 items-center gap-1.5 rounded-full bg-[#F2EDE4] px-5 text-[13px] font-medium text-[#141414] transition-colors hover:bg-white"
              >
                <PlusIcon size={14} /> <span className="hidden sm:inline">Nueva publicación</span>
              </button>
            )}
          </div>
        )}
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
              {(t.id === 'comunidad' ? communityPosts.length : posts.filter(isPublished).length) > 0 && (
                <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] leading-none">{t.id === 'comunidad' ? communityPosts.length : posts.filter(isPublished).length}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {tab === 'anuncios' ? (
        <ChatPeopleContext.Provider value={{ users, directory: [], presence: {} }}>
          <AnunciosTab user={user} isAdminUser={isAdminUser} focusPostId={focusPostId} posts={posts} query={query} composeRequest={composeRequest} users={users} />
        </ChatPeopleContext.Provider>
      ) : (
        <CommunityFeed user={user} posts={communityPosts} isAdminUser={isAdminUser} profile={profile} query={query} onSearch={setQuery} />
      )}
    </motion.div>
  )
}
