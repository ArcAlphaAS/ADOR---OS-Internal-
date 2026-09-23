import { useState } from 'react'
import { useMessageSearch, normalize } from '../../hooks/useMessageSearch'
import { dayBucket, formatReminderTime } from '../../lib/chat'
import Avatar from '../shell/Avatar'
import { InboxIcon, AtIcon, BookmarkIcon, FolderIcon, FileIcon, MicIcon, LockIcon, SearchIcon } from '../icons'

function timeAgo(ts) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  const diff = (Date.now() - d.getTime()) / 60000
  if (diff < 1) return 'ahora'
  if (diff < 60) return `${Math.floor(diff)} min`
  if (diff < 60 * 24 && d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  if (diff < 60 * 48) return 'Ayer'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function ViewHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[#AAAAAA]">{icon}</span>
      <div>
        <p className="text-[15px] font-semibold text-[#F5F5F5]">{title}</p>
        <p className="text-[11.5px] text-[#555555]">{subtitle}</p>
      </div>
    </div>
  )
}

function Empty({ icon, text }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="text-[#333333]">{icon}</span>
      <p className="max-w-[320px] text-[13px] leading-relaxed text-[#444444]">{text}</p>
    </div>
  )
}

function Row({ unread, onClick, leading, title, meta, preview }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.04]"
    >
      <span className="mt-0.5 flex-shrink-0">{leading}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px]" style={{ color: unread ? '#F5F5F5' : '#BBBBBB', fontWeight: unread ? 600 : 500 }}>
            {title}
          </span>
          <span className="ml-auto flex-shrink-0 text-[11px] text-[#555555]">{meta}</span>
          {unread && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#B8860B' }} />}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-[#777777]">{preview}</span>
      </span>
    </button>
  )
}

function ConvGlyph({ conv }) {
  if (conv.convType === 'dm') return <Avatar displayName={conv.label} photoURL={conv.photo} size={30} />
  return (
    <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white/[0.06] text-[13px] text-[#888888]">
      {conv.kind === 'group' ? (conv.memberCount ?? '·') : conv.private ? <LockIcon size={12} /> : '#'}
    </span>
  )
}

// Inbox works like an email client: it opens on "No leídos" — only the
// conversations with something you haven't seen, each with how many
// messages are new — grouped by day. "Todos" shows every conversation with
// activity. Hover a row to mark it read / unread; "Marcar todo como leído"
// clears the list in one write. Built from each conversation's
// `lastMessage` + `messageCount`, so it never loads a message history.
export function InboxView({ conversations, onOpen, onMarkRead, onMarkUnread, onMarkAllRead }) {
  const [tab, setTab] = useState('unread')
  const withActivity = conversations.filter((c) => c.lastMessage)
  const unread = withActivity.filter((c) => c.unread)
  const list = tab === 'unread' ? unread : withActivity
  const groups = []
  for (const c of list) {
    const bucket = dayBucket(c.lastAt)
    const g = groups.find((x) => x.bucket === bucket)
    if (g) g.items.push(c)
    else groups.push({ bucket, items: [c] })
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[#AAAAAA]">
          <InboxIcon size={15} />
        </span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-[#F5F5F5]">Inbox</p>
          <p className="text-[11.5px] text-[#555555]">{unread.length ? `${unread.length} ${unread.length === 1 ? 'conversación sin leer' : 'conversaciones sin leer'}` : 'Todo leído'}</p>
        </div>
        {unread.length > 0 && (
          <button type="button" onClick={() => onMarkAllRead(unread)} className="rounded-full border border-white/[0.1] px-3 py-1.5 text-[11.5px] text-[#AAAAAA] hover:text-[#F5F5F5]">
            Marcar todo como leído
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-1">
        {[
          { id: 'unread', label: `No leídos${unread.length ? ` · ${unread.length}` : ''}` },
          { id: 'all', label: 'Todos' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="rounded-full px-3 py-1 text-[12px] transition-colors"
            style={tab === t.id ? { background: 'rgba(255,255,255,0.09)', color: '#F5F5F5' } : { color: '#777777' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-2">
        {list.length === 0 ? (
          <Empty
            icon={<InboxIcon size={22} />}
            text={tab === 'unread' ? 'Bandeja al día — no hay mensajes sin leer.' : 'Aquí aparecerá la actividad de todas tus conversaciones.'}
          />
        ) : (
          groups.map((g) => (
            <div key={g.bucket} className="mb-2">
              <p className="px-3 pt-2 pb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#444444]">{g.bucket}</p>
              {g.items.map((c) => (
                <InboxRow key={c.key} c={c} onOpen={onOpen} onMarkRead={onMarkRead} onMarkUnread={onMarkUnread} />
              ))}
            </div>
          ))
        )}
      </div>
    </>
  )
}

function InboxRow({ c, onOpen, onMarkRead, onMarkUnread }) {
  const sender = c.lastMessage.authorName || ''
  const where = c.convType === 'dm' ? 'Mensaje directo' : c.kind === 'group' ? `Grupo · ${c.label}` : `#${c.label}`
  return (
    <div className="group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.04]">
      <span className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-full" style={{ background: c.unread ? '#B8860B' : 'transparent' }} />
      <button type="button" onClick={() => onOpen(c)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className="mt-0.5 flex-shrink-0">
          <ConvGlyph conv={c} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[13px]" style={{ color: c.unread ? '#F5F5F5' : '#AAAAAA', fontWeight: c.unread ? 600 : 500 }}>
              {c.convType === 'dm' ? c.label : sender}
            </span>
            <span className="truncate text-[11.5px] text-[#555555]">{c.convType === 'dm' ? '' : where}</span>
            <span className="ml-auto flex-shrink-0 text-[11px]" style={{ color: c.unread ? '#CCCCCC' : '#555555' }}>
              {timeAgo(c.lastAt)}
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="truncate text-[12.5px]" style={{ color: c.unread ? '#BBBBBB' : '#666666' }}>
              {c.lastMessage.text}
            </span>
            {c.unread && (
              <span className="ml-auto flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold text-[#0A0A0A]" style={{ background: '#E8C15A' }}>
                {c.unreadCount || '•'}
              </span>
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => (c.unread ? onMarkRead(c) : onMarkUnread(c))}
        title={c.unread ? 'Marcar como leído' : 'Marcar como no leído'}
        className="mt-0.5 flex-shrink-0 rounded-full px-2 py-1 text-[11px] text-[#666666] opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-[#F5F5F5] group-hover:opacity-100"
      >
        {c.unread ? 'Leído' : 'No leído'}
      </button>
    </div>
  )
}

// Slack's "Hilos": every thread you're part of (you wrote the original or
// replied), latest reply first, bold when there's something new.
export function ThreadsView({ threads, onOpen }) {
  return (
    <>
      <ViewHeader icon={<AtIcon size={15} />} title="Hilos" subtitle="Conversaciones en hilo en las que participas" />
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-3">
        {threads.length === 0 ? (
          <Empty icon={<InboxIcon size={22} />} text="Cuando respondas en un hilo, o alguien responda a un mensaje tuyo, lo seguirás aquí." />
        ) : (
          threads.map((t) => (
            <Row
              key={t.threadParentId}
              unread={t.unread}
              onClick={() => onOpen(t)}
              leading={<Avatar displayName={t.fromName} size={30} />}
              title={`Hilo en ${t.conversationLabel}`}
              meta={timeAgo(t.createdAt)}
              preview={`${t.fromName.split(' ')[0]}: ${t.text || 'respondió'}`}
            />
          ))
        )}
      </div>
    </>
  )
}

export function MentionsView({ mentions, onOpen }) {
  return (
    <>
      <ViewHeader icon={<AtIcon size={15} />} title="Menciones" subtitle="Mensajes donde alguien te mencionó con @" />
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-3">
        {mentions.length === 0 ? (
          <Empty icon={<AtIcon size={22} />} text="Cuando alguien escriba @tu nombre en un canal o grupo, aparecerá aquí y en la campana." />
        ) : (
          mentions.map((m) => (
            <Row
              key={m.id}
              unread={m.unread}
              onClick={() => onOpen(m)}
              leading={<Avatar displayName={m.fromName} size={30} />}
              title={`${m.fromName} · ${m.conversationLabel}`}
              meta={timeAgo(m.createdAt)}
              preview={m.text}
            />
          ))
        )}
      </div>
    </>
  )
}

export function SavedView({ saved, reminders = [], onOpen, onUnsave, onCancelReminder }) {
  return (
    <>
      <ViewHeader icon={<BookmarkIcon size={14} />} title="Mensajes guardados" subtitle="Solo tú ves esta lista" />
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-3">
        {reminders.length > 0 && (
          <div className="mb-3">
            <p className="px-3 pb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#444444]">Recordatorios pendientes</p>
            {reminders.map((r) => (
              <div key={r.id} className="group flex items-start gap-1">
                <div className="min-w-0 flex-1">
                  <Row
                    onClick={() => onOpen(r)}
                    leading={
                      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[#E8C15A]" style={{ background: 'rgba(184,134,11,0.14)' }}>
                        ⏰
                      </span>
                    }
                    title={`${r.authorName || 'Mensaje'} · ${r.conversationLabel}`}
                    meta={formatReminderTime(r.remindAt)}
                    preview={r.text}
                  />
                </div>
                <button type="button" onClick={() => onCancelReminder(r)} className="mt-3 flex-shrink-0 rounded-full px-2 py-1 text-[11px] text-[#666666] opacity-0 transition-opacity hover:text-[#F5F5F5] group-hover:opacity-100">
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        )}
        {saved.length === 0 && reminders.length === 0 ? (
          <Empty icon={<BookmarkIcon size={22} />} text="Pasa el cursor sobre cualquier mensaje y pulsa el marcador para guardarlo aquí." />
        ) : (
          saved.map((s) => (
            <div key={s.id} className="group flex items-start gap-1">
              <div className="min-w-0 flex-1">
                <Row
                  onClick={() => onOpen(s)}
                  leading={<Avatar displayName={s.authorName} size={30} />}
                  title={`${s.authorName} · ${s.conversationLabel}`}
                  meta={timeAgo(s.messageCreatedAt)}
                  preview={s.text || 'Archivo o llamada'}
                />
              </div>
              <button
                type="button"
                onClick={() => onUnsave(s)}
                title="Quitar de guardados"
                className="mt-3 flex-shrink-0 rounded-full px-2 py-1 text-[11px] text-[#666666] opacity-0 transition-opacity hover:text-[#F5F5F5] group-hover:opacity-100"
              >
                Quitar
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}

// Two groups, keeping the same distinction as the rest of Comunicación:
// conversation files (images, voice notes) vs. official documents (Drive
// links). Only files from conversations you can currently see are listed.
export function FilesView({ files, onOpen, onOpenImage }) {
  const media = files.filter((f) => f.kind === 'image' || f.kind === 'voice')
  const docs = files.filter((f) => f.kind === 'drive')
  return (
    <>
      <ViewHeader icon={<FolderIcon size={15} />} title="Archivos" subtitle="Todo lo compartido en tus conversaciones" />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto py-4">
        {files.length === 0 && <Empty icon={<FolderIcon size={22} />} text="Las imágenes, notas de voz y documentos de Drive que se compartan en el chat aparecerán aquí." />}

        {docs.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#444444]">Documentos oficiales · Google Drive</p>
            <div className="flex flex-col gap-0.5">
              {docs.map((f) => (
                <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.04]">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(184,134,11,0.14)', color: '#E8C15A' }}>
                    <FileIcon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-[#DDDDDD]">{f.name}</span>
                    <span className="block truncate text-[11px] text-[#555555]">
                      {f.authorName} · {f.conversationLabel} · {timeAgo(f.createdAt)}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {media.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#444444]">Archivos de conversación</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
              {media.map((f) =>
                f.kind === 'image' ? (
                  <button key={f.id} type="button" onClick={() => onOpenImage(f)} className="group text-left">
                    <img src={f.thumbUrl} alt={f.name} loading="lazy" className="aspect-square w-full rounded-xl border border-white/[0.08] object-cover transition-opacity group-hover:opacity-80" />
                    <span className="mt-1 block truncate px-0.5 text-[11px] text-[#666666]">{f.conversationLabel}</span>
                  </button>
                ) : (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onOpen(f)}
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#888888] hover:text-[#F5F5F5]"
                  >
                    <MicIcon size={20} />
                    <span className="text-[11px]">Nota de voz</span>
                    <span className="max-w-[90%] truncate text-[10.5px] text-[#555555]">{f.conversationLabel}</span>
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Marks every searched word inside the text (gold), matching the same
// accent/case-insensitive way the search does. NFD-stripping keeps
// precomposed letters the same length, so indices line up with the original.
function Highlight({ text, words }) {
  const norm = normalize(text)
  const marks = []
  for (const w of words) {
    let i = norm.indexOf(w)
    while (i !== -1) {
      marks.push([i, i + w.length])
      i = norm.indexOf(w, i + w.length)
    }
  }
  if (!marks.length) return text
  marks.sort((a, b) => a[0] - b[0])
  const parts = []
  let last = 0
  marks.forEach(([a, b], k) => {
    if (a < last) return
    if (a > last) parts.push(<span key={`t${k}`}>{text.slice(last, a)}</span>)
    parts.push(
      <mark key={`m${k}`} className="rounded bg-[#B8860B]/30 px-0.5 text-[#F2EBDD]">
        {text.slice(a, b)}
      </mark>
    )
    last = b
  })
  if (last < text.length) parts.push(<span key="end">{text.slice(last)}</span>)
  return parts
}

// Long messages show the part around the first match, not the beginning.
function snippetAround(text, words) {
  const norm = normalize(text)
  const first = Math.min(...words.map((w) => norm.indexOf(w)).filter((i) => i >= 0))
  if (!Number.isFinite(first) || text.length <= 160) return text
  const start = Math.max(0, first - 60)
  return `${start > 0 ? '…' : ''}${text.slice(start, start + 160)}${start + 160 < text.length ? '…' : ''}`
}

// Search across every conversation you can see (see useMessageSearch for
// how, and its limits). Filter by who wrote it and where; click a result to
// open the conversation scrolled to that message.
export function SearchView({ query, onQueryChange, conversations, onOpen }) {
  const { loading, results, searched } = useMessageSearch(conversations, query)
  const [author, setAuthor] = useState('')
  const [where, setWhere] = useState('')
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const authors = [...new Set(results.map((r) => r.message.authorName).filter(Boolean))]
  const places = [...new Map(results.map((r) => [r.conv.convId, r.conv])).values()]
  const shown = results.filter((r) => (!author || r.message.authorName === author) && (!where || r.conv.convId === where))

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[#AAAAAA]">
          <SearchIcon size={14} />
        </span>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar en todos los mensajes…"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#F5F5F5] placeholder:font-normal placeholder:text-[#555555] outline-none"
        />
        {loading && <span className="text-[11.5px] text-[#777777]">Buscando…</span>}
      </div>

      {results.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
          <select value={author} onChange={(e) => setAuthor(e.target.value)} className="rounded-full border border-white/[0.1] bg-[#141414] px-3 py-1 text-[#CCCCCC] outline-none">
            <option value="">De: cualquiera</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                De: {a}
              </option>
            ))}
          </select>
          <select value={where} onChange={(e) => setWhere(e.target.value)} className="rounded-full border border-white/[0.1] bg-[#141414] px-3 py-1 text-[#CCCCCC] outline-none">
            <option value="">En: todas</option>
            {places.map((c) => (
              <option key={c.convId} value={c.convId}>
                En: {c.label}
              </option>
            ))}
          </select>
          <span className="ml-auto text-[11.5px] text-[#666666]">
            {shown.length} {shown.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-3">
        {!words.length ? (
          <Empty icon={<SearchIcon size={22} />} text="Escribe una palabra, un nombre o una frase. Busca en mensajes directos, grupos y canales a los que perteneces." />
        ) : !loading && searched && !shown.length ? (
          <Empty icon={<SearchIcon size={22} />} text={`Nada coincide con “${searched}”. Se buscan los últimos 400 mensajes de cada conversación; las respuestas dentro de hilos no se incluyen.`} />
        ) : (
          shown.map(({ message, conv }) => (
            <button
              key={`${conv.convId}-${message.id}`}
              type="button"
              onClick={() => onOpen({ ...conv, messageId: message.id, deep: true })}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.04]"
            >
              <span className="mt-0.5 flex-shrink-0">
                <Avatar displayName={message.authorName} size={30} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium text-[#DDDDDD]">{message.authorName}</span>
                  <span className="truncate text-[11.5px] text-[#555555]">{conv.label}</span>
                  <span className="ml-auto flex-shrink-0 text-[11px] text-[#555555]">{timeAgo(message.createdAt)}</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[#999999]">
                  <Highlight text={snippetAround(message.text || message.attachment?.name || '', words)} words={words} />
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </>
  )
}
