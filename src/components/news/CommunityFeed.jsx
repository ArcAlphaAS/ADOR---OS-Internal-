import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  createCommunityPost,
  setCommunityReaction,
  deleteCommunityPost,
  subscribeCommunityComments,
  addCommunityComment,
  deleteCommunityComment,
  setCommunitySaved,
  subscribeUsers,
  subscribeDirectoryPeople,
} from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { resizeImageToDataUrl } from '../../lib/image'
import { useToast } from '../../hooks/useToast'
import PersonAvatar, { ChatPeopleContext } from '../chat/PersonAvatar'
import { SERIF } from './NewsLayout'
import { UsersIcon, CalendarIcon, FileIcon, ImageIcon, BookmarkIcon, MessageIcon, CloseIcon } from '../icons'

// Comunidad — the informal side of News (from the user's reference image):
// a type filter row, a composer that picks a type and can carry photos,
// and post cards with the author's area, an optional serif title, a photo
// grid, likes, comments and "Guardar". Anyone with app access posts here.

const LIKE = '❤️'

function stroke(d) {
  return function Icon({ size = 15 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {d}
      </svg>
    )
  }
}
const UpdateIcon = stroke(<path d="M4 20l4-1 10-10-3-3L5 16l-1 4ZM13 7l3 3M19 3v3M17.5 4.5h3" />)
const IdeaIcon = stroke(<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />)
const QuestionIcon = stroke(<><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></>)
const StarIcon = stroke(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />)
function HeartIcon({ size = 18, filled }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
    </svg>
  )
}

export const COMMUNITY_TYPES = [
  { id: 'actualizacion', label: 'Actualización', plural: 'Actualizaciones', Icon: UpdateIcon },
  { id: 'idea', label: 'Idea', plural: 'Ideas', Icon: IdeaIcon },
  { id: 'pregunta', label: 'Pregunta', plural: 'Preguntas', Icon: QuestionIcon },
  { id: 'logro', label: 'Logro', plural: 'Logros', Icon: StarIcon },
  { id: 'evento', label: 'Evento', plural: 'Eventos', Icon: ({ size }) => <CalendarIcon size={size} /> },
  { id: 'recurso', label: 'Recurso', plural: 'Recursos', Icon: ({ size }) => <FileIcon size={size} /> },
]
const TYPE_BY_ID = Object.fromEntries(COMMUNITY_TYPES.map((t) => [t.id, t]))

function timeAgo(ts) {
  if (!ts?.toDate) return 'Ahora'
  const mins = Math.floor((Date.now() - ts.toDate().getTime()) / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`
  return ts.toDate().toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function Composer({ user, actorName }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [type, setType] = useState('actualizacion')
  const [images, setImages] = useState([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const showToast = useToast()

  const addImages = async (files) => {
    const room = 3 - images.length
    const picked = [...(files || [])].filter((f) => f.type.startsWith('image/')).slice(0, room)
    try {
      const urls = await Promise.all(picked.map((f) => resizeImageToDataUrl(f, 1000, 0.72)))
      setImages((cur) => [...cur, ...urls].slice(0, 3))
      setOpen(true)
    } catch {
      showToast('No se pudo leer esa imagen.')
    }
  }

  const reset = () => {
    setTitle('')
    setText('')
    setImages([])
    setType('actualizacion')
    setOpen(false)
  }

  const submit = async () => {
    if ((!text.trim() && !title.trim()) || saving) return
    // Firestore documents top out at 1MB — keep photos comfortably under it.
    if (images.reduce((n, u) => n + u.length, 0) > 850_000) return showToast('Las fotos pesan demasiado juntas — quita alguna.')
    setSaving(true)
    try {
      await withTimeout(createCommunityPost({ text: text.trim(), title: title.trim(), type, images }, user.uid, actorName))
      reset()
    } catch (error) {
      showToast(`No se pudo publicar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ador-glass ador-grain flex flex-col gap-3 rounded-[22px] p-4 md:p-5">
      <div className="flex items-start gap-3">
        <PersonAvatar uid={user?.uid} name={actorName} size={44} />
        <div className="min-w-0 flex-1">
          {open && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título (opcional)"
              className="mb-2 w-full bg-transparent px-1 text-[19px] text-[#F5F5F5] placeholder:text-[#5A5A5A] outline-none"
              style={SERIF}
            />
          )}
          <textarea
            value={text}
            onFocus={() => setOpen(true)}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
            }}
            placeholder="¿Qué quieres compartir con el equipo?"
            rows={open ? 3 : 1}
            className="w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[14px] text-[#F5F5F5] placeholder:text-[#777777] outline-none"
          />
          {images.length > 0 && (
            <div className="mt-2 flex gap-2">
              {images.map((src, i) => (
                <span key={i} className="relative h-20 w-24 overflow-hidden rounded-xl">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white" aria-label="Quitar foto">
                    <CloseIcon size={8} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] md:pl-[56px] [&::-webkit-scrollbar]:hidden">
        {COMMUNITY_TYPES.map((t) => {
          const active = open && type === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setType(t.id)
                setOpen(true)
              }}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors"
              style={{ color: active ? '#E8C15A' : '#AAAAAA', background: active ? 'rgba(232,193,90,0.1)' : 'transparent' }}
            >
              <t.Icon size={15} /> {t.label}
            </button>
          )
        })}
        <button type="button" onClick={() => fileRef.current?.click()} title="Añadir fotos (hasta 3)" className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#AAAAAA] hover:bg-white/[0.06]">
          <ImageIcon size={16} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
      </div>

      {open && (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={reset} className="rounded-full px-4 py-2 text-[13px] text-[#8A8A8A] hover:text-[#F5F5F5]">
            Cancelar
          </button>
          <button
            type="button"
            disabled={(!text.trim() && !title.trim()) || saving}
            onClick={submit}
            className="rounded-full bg-[#F2EDE4] px-5 py-2 text-[13px] font-medium text-[#141414] disabled:opacity-40"
          >
            {saving ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      )}
    </div>
  )
}

function Photos({ images, onOpen }) {
  if (!images?.length) return null
  const img = (src, i, cls) => (
    <button key={i} type="button" onClick={() => onOpen(src)} className={`overflow-hidden rounded-2xl ${cls}`}>
      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
    </button>
  )
  if (images.length === 1) return <div className="h-[220px] md:h-[300px]">{img(images[0], 0, 'block h-full w-full')}</div>
  if (images.length === 2) return <div className="grid h-[180px] grid-cols-2 gap-2 md:h-[240px]">{images.map((s, i) => img(s, i, 'h-full w-full'))}</div>
  return (
    <div className="grid h-[200px] grid-cols-[2fr_1fr] gap-2 md:h-[260px]">
      {img(images[0], 0, 'h-full w-full')}
      <div className="grid grid-rows-2 gap-2">{images.slice(1, 3).map((s, i) => img(s, i + 1, 'h-full w-full'))}</div>
    </div>
  )
}

function Comments({ post, user, actorName, canModerate }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const showToast = useToast()
  useEffect(() => subscribeCommunityComments(post.id, setComments), [post.id])

  const send = () => {
    if (!text.trim()) return
    const value = text.trim()
    setText('')
    withTimeout(addCommunityComment(post.id, value, user.uid, actorName)).catch((e) => showToast(`No se pudo comentar: ${e.message}`))
  }

  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4">
      {comments.map((c) => (
        <div key={c.id} className="group flex items-start gap-2.5">
          <PersonAvatar uid={c.authorUid} name={c.authorName} size={28} />
          <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.04] px-3.5 py-2">
            <p className="text-[12.5px] font-semibold text-[#E5E5E5]">
              {c.authorName} <span className="font-normal text-[#7A7A7A]">· {timeAgo(c.createdAt)}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#DDDDDD]">{c.text}</p>
          </div>
          {(canModerate || c.authorUid === user?.uid) && (
            <button type="button" onClick={() => withTimeout(deleteCommunityComment(post.id, c.id)).catch(() => {})} className="mt-2 text-[#5A5A5A] opacity-0 hover:text-[#EF5350] group-hover:opacity-100" aria-label="Eliminar comentario">
              <CloseIcon size={10} />
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2.5">
        <PersonAvatar uid={user?.uid} name={actorName} size={28} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe un comentario…"
          className="min-w-0 flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[13.5px] text-[#F5F5F5] placeholder:text-[#777777] outline-none"
        />
        {text.trim() && (
          <button type="button" onClick={send} className="text-[13px] font-medium text-[#E8C15A]">
            Enviar
          </button>
        )}
      </div>
    </div>
  )
}

function PostCard({ post, user, actorName, saved, canDelete, isAdminUser, onDelete, onOpenImage }) {
  const { directory } = useMemoPeople()
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const uid = user?.uid

  const entry = directory.find((p) => p.linkedUserId === post.authorUid)
  const area = entry?.isDirectivo ? 'Dirección' : entry?.area || null
  const type = TYPE_BY_ID[post.type]

  // Everyone who reacted (any emoji — older posts used a 6-reaction set).
  const reactors = [...new Set(Object.values(post.reactions || {}).flat())]
  const myReaction = Object.entries(post.reactions || {}).find(([, uids]) => uids?.includes(uid))?.[0] || null
  const liked = Boolean(myReaction)
  const toggleLike = () => setCommunityReaction(post.id, myReaction || LIKE, uid, myReaction).catch(() => {})

  return (
    <article className="ador-glass flex flex-col gap-4 rounded-[22px] p-5 md:p-6">
      <header className="flex items-center gap-3">
        <PersonAvatar uid={post.authorUid} name={post.authorName} size={44} />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-[14.5px] font-semibold text-[#F5F5F5]">{post.authorName}</span>
          {area && <span className="rounded-full bg-white/[0.07] px-2.5 py-0.5 text-[12px] text-[#CCCCCC]">{area}</span>}
          <span className="text-[12.5px] text-[#7A7A7A]">{timeAgo(post.createdAt)}</span>
        </div>
        {canDelete && (
          <div className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] leading-none text-[#AAAAAA] hover:bg-white/[0.06]" aria-label="Más opciones">
              ⋯
            </button>
            {menu && (
              <div className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-xl border border-white/[0.1] bg-[#1C1C1E] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <button
                  type="button"
                  onClick={() => (confirm ? onDelete(post) : setConfirm(true))}
                  className="w-full px-4 py-2.5 text-left text-[13px] text-[#FF6B63] hover:bg-white/[0.05]"
                >
                  {confirm ? '¿Seguro? Eliminar' : 'Eliminar publicación'}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {post.title && (
        <h3 className="text-[22px] leading-snug text-[#F5F5F5] md:text-[26px]" style={SERIF}>
          {post.title}
        </h3>
      )}
      {post.text && <p className="-mt-1 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#D5D5D5]">{post.text}</p>}

      <Photos images={post.images} onOpen={onOpenImage} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {type && <span className="rounded-full border border-white/[0.1] px-3 py-1 text-[12px] text-[#BBBBBB]">{type.label}</span>}
        </div>
        {reactors.length > 0 && (
          <div className="flex items-center gap-1.5" title={`Les gusta a ${reactors.length}`}>
            <span className="flex -space-x-2">
              {reactors.slice(0, 3).map((r) => (
                <span key={r} className="rounded-full ring-2 ring-[#111111]">
                  <PersonAvatar uid={r} size={24} />
                </span>
              ))}
            </span>
            {reactors.length > 3 && <span className="text-[12px] text-[#8A8A8A]">+{reactors.length - 3}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-white/[0.06] pt-3">
        <button type="button" onClick={toggleLike} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/[0.05]" style={{ color: liked ? '#FF5A6E' : '#AAAAAA' }}>
          <motion.span key={String(liked)} initial={{ scale: liked ? 0.6 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
            <HeartIcon filled={liked} />
          </motion.span>
          {reactors.length > 0 && <span className="text-[13.5px] font-medium">{reactors.length}</span>}
        </button>
        <button type="button" onClick={() => setShowComments((v) => !v)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[#AAAAAA] transition-colors hover:bg-white/[0.05]">
          <MessageIcon size={17} />
          {post.commentCount > 0 && <span className="text-[13.5px]">{post.commentCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => setCommunitySaved(uid, post.id, !saved).catch(() => {})}
          className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors hover:bg-white/[0.05]"
          style={{ color: saved ? '#E8C15A' : '#AAAAAA' }}
        >
          <BookmarkIcon size={15} filled={saved} /> {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {showComments && <Comments post={post} user={user} actorName={actorName} canModerate={isAdminUser} />}
    </article>
  )
}

// People data for avatars and author areas ("Dirección" for directivos,
// else their Directorio area) — shared through the chat's context so
// PersonAvatar resolves real photos here too.
function useMemoPeople() {
  return useContext(ChatPeopleContext)
}

function ImageViewer({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <img src={src} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
    </motion.div>,
    document.body
  )
}

export default function CommunityFeed({ user, posts, isAdminUser, profile, query = '' }) {
  const actorName = user?.displayName || user?.email?.split('@')[0] || 'Usuario'
  const showToast = useToast()
  const [filter, setFilter] = useState('todo')
  const [users, setUsers] = useState([])
  const [directory, setDirectory] = useState([])
  const [viewing, setViewing] = useState(null)
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeDirectoryPeople(setDirectory), [])

  const saved = profile?.communitySaved || {}
  const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const words = fold(query).split(/\s+/).filter(Boolean)
  const visible = posts.filter((p) => {
    if (filter === 'guardados' ? !saved[p.id] : filter !== 'todo' && (p.type || 'actualizacion') !== filter) return false
    if (!words.length) return true
    const hay = fold([p.title, p.text, p.authorName, TYPE_BY_ID[p.type]?.label].join(' '))
    return words.every((w) => hay.includes(w))
  })

  const handleDelete = (post) => {
    withTimeout(deleteCommunityPost(post.id)).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
  }

  const tabs = [{ id: 'todo', plural: 'Todo' }, ...COMMUNITY_TYPES, ...(Object.keys(saved).length ? [{ id: 'guardados', plural: 'Guardados' }] : [])]

  return (
    <ChatPeopleContext.Provider value={{ users, directory, presence: {} }}>
      <div className="flex flex-col gap-5">
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className="relative flex-shrink-0 px-3.5 pb-3 pt-1 text-[14px] transition-colors"
              style={{ color: filter === t.id ? '#F5F5F5' : '#8A8A8A' }}
            >
              {t.plural}
              {filter === t.id && <motion.span layoutId="community-filter" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[#E8C15A]" />}
            </button>
          ))}
        </div>

        <Composer user={user} actorName={actorName} />

        {visible.length === 0 ? (
          <div className="ador-glass ador-grain flex flex-col items-center gap-2 rounded-[22px] px-6 py-14 text-center">
            <UsersIcon size={20} className="text-[#5A5A5A]" />
            <p className="text-[14px] font-medium text-[#AAAAAA]">{posts.length ? 'Nada por aquí con este filtro' : 'Todavía no hay nada por aquí'}</p>
            <p className="text-[13px] text-[#7A7A7A]">{posts.length ? 'Prueba con otra categoría o búsqueda.' : 'Sé el primero en compartir algo con el equipo.'}</p>
          </div>
        ) : (
          visible.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              actorName={actorName}
              saved={Boolean(saved[post.id])}
              isAdminUser={isAdminUser}
              canDelete={isAdminUser || post.authorUid === user?.uid}
              onDelete={handleDelete}
              onOpenImage={setViewing}
            />
          ))
        )}
      </div>
      <AnimatePresence>{viewing && <ImageViewer src={viewing} onClose={() => setViewing(null)} />}</AnimatePresence>
    </ChatPeopleContext.Provider>
  )
}
