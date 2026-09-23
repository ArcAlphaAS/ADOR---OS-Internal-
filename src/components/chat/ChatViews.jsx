import Avatar from '../shell/Avatar'
import { InboxIcon, AtIcon, BookmarkIcon, FolderIcon, FileIcon, MicIcon, LockIcon } from '../icons'

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
          {unread && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#1E5FAD' }} />}
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

// Everything with activity, one list: DMs, groups and channels together,
// newest first, unread in bold — the "what happened while I was away"
// screen. Built from each conversation's `lastMessage` preview, so it
// never loads a single message history.
export function InboxView({ conversations, onOpen }) {
  const withActivity = conversations.filter((c) => c.lastMessage)
  const unreadCount = withActivity.filter((c) => c.unread).length
  return (
    <>
      <ViewHeader icon={<InboxIcon size={15} />} title="Inbox" subtitle={unreadCount ? `${unreadCount} ${unreadCount === 1 ? 'conversación con novedades' : 'conversaciones con novedades'}` : 'Todo leído'} />
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-3">
        {withActivity.length === 0 ? (
          <Empty icon={<InboxIcon size={22} />} text="Aquí aparecerá la actividad de todas tus conversaciones — mensajes directos, grupos y canales." />
        ) : (
          withActivity.map((c) => (
            <Row
              key={c.key}
              unread={c.unread}
              onClick={() => onOpen(c)}
              leading={<ConvGlyph conv={c} />}
              title={c.convType === 'dm' ? c.label : c.kind === 'group' ? c.label : `#${c.label}`}
              meta={timeAgo(c.lastAt)}
              preview={`${c.lastMessage.authorName ? `${c.lastMessage.authorName.split(' ')[0]}: ` : ''}${c.lastMessage.text}`}
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

export function SavedView({ saved, onOpen, onUnsave }) {
  return (
    <>
      <ViewHeader icon={<BookmarkIcon size={14} />} title="Mensajes guardados" subtitle="Solo tú ves esta lista" />
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-3">
        {saved.length === 0 ? (
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
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(30,95,173,0.16)', color: '#5B9BD9' }}>
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
