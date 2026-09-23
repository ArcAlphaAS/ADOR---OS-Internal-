import { useRef, useState } from 'react'
import { sharedInConversation, userLabel } from '../../lib/chat'
import Avatar from '../shell/Avatar'
import { CloseIcon, PhoneIcon, VideoIcon, SearchIcon, MessageIcon, FileIcon, GlobeIcon } from '../icons'

function shortDate(ts) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function ActionButton({ icon, label, onClick, active, buttonRef }) {
  return (
    <button ref={buttonRef} type="button" onClick={onClick} className="group flex w-[64px] flex-col items-center gap-1.5">
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.1] text-[#BBBBBB] transition-colors duration-150 group-hover:border-white/[0.2] group-hover:text-[#F5F5F5]"
        style={active ? { background: 'rgba(255,255,255,0.08)', color: '#F5F5F5' } : undefined}
      >
        {icon}
      </span>
      <span className="text-[11px] text-[#888888]">{label}</span>
    </button>
  )
}

function ListSection({ title, items, render, empty }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, 4)
  return (
    <div className="border-t border-white/[0.06] pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12.5px] font-semibold text-[#DDDDDD]">{title}</p>
        {items.length > 4 && (
          <button type="button" onClick={() => setAll((v) => !v)} className="text-[11.5px] text-[#5B9BD9] hover:underline">
            {all ? 'Ver menos' : `Ver todos (${items.length})`}
          </button>
        )}
      </div>
      {items.length === 0 ? <p className="text-[11.5px] leading-relaxed text-[#555555]">{empty}</p> : <div className="flex flex-col gap-1">{shown.map(render)}</div>}
    </div>
  )
}

// The "tap the name, see the person" panel every messaging app has. Who
// they are comes from Directorio when their account is linked to a
// Directorio entry (linkedUserId, CLAUDE.md §30) — role, area, "sobre mí"
// — falling back to just the account's name. Shared files/links are
// derived from this DM's own loaded messages (lib/chat.js), and only shown
// when you're actually in a DM with them: opening someone's profile from a
// channel shows who they are plus a way into the DM, not a list of files
// from a conversation you're not looking at.
//
// No online/offline dot: ADOR OS has no presence tracking, and a green dot
// that isn't real would be worse than none.
export default function ProfilePanel({ person, directoryEntry, inDm, messages, muted, searching, onClose, onMessage, onCall, onToggleSearch, onToggleMute, onOpenImage }) {
  const audioRef = useRef(null)
  const videoRef = useRef(null)
  const name = directoryEntry?.name || userLabel(person)
  const photo = directoryEntry?.photoDataUrl || person?.photoDataUrl
  const subtitle = [directoryEntry?.role, directoryEntry?.area].filter(Boolean).join(' · ')
  const { files, links } = inDm ? sharedInConversation(messages) : { files: [], links: [] }

  return (
    <aside className="flex w-[290px] flex-shrink-0 flex-col overflow-y-auto">
      <div className="ador-glass ador-grain flex flex-col gap-5 rounded-2xl p-5">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="text-[#666666] hover:text-[#F5F5F5]">
            <CloseIcon size={12} />
          </button>
        </div>

        <div className="-mt-3 flex flex-col items-center text-center">
          <Avatar displayName={name} photoURL={photo} size={84} />
          <p className="mt-3 text-[16px] font-semibold text-[#F5F5F5]">{name}</p>
          {subtitle && <p className="mt-0.5 text-[12px] text-[#888888]">{subtitle}</p>}
          {directoryEntry?.about && <p className="mt-2 text-[12px] leading-relaxed text-[#666666]">{directoryEntry.about}</p>}
          {person?.email && <p className="mt-2 text-[11px] text-[#555555]">{person.email}</p>}
        </div>

        <div className="flex justify-center gap-1">
          {!inDm && <ActionButton icon={<MessageIcon size={16} />} label="Mensaje" onClick={onMessage} />}
          <ActionButton icon={<PhoneIcon size={15} />} label="Llamar" buttonRef={audioRef} onClick={() => onCall('audio', audioRef)} />
          <ActionButton icon={<VideoIcon size={16} />} label="Video" buttonRef={videoRef} onClick={() => onCall('video', videoRef)} />
          {inDm && <ActionButton icon={<SearchIcon size={15} />} label="Buscar" active={searching} onClick={onToggleSearch} />}
        </div>

        {inDm && (
          <>
            <ListSection
              title="Archivos compartidos"
              items={files}
              empty="Las imágenes que se envíen aquí aparecerán en esta lista."
              render={(f) => (
                <button key={f.id} type="button" onClick={() => onOpenImage(f.attachment)} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-left hover:bg-white/[0.04]">
                  <img src={f.src} alt="" className="h-9 w-9 flex-shrink-0 rounded-md object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] text-[#DDDDDD]">{f.name}</span>
                    <span className="block text-[11px] text-[#555555]">Archivo de conversación · {shortDate(f.createdAt)}</span>
                  </span>
                </button>
              )}
            />

            <ListSection
              title="Documentos y enlaces"
              items={links}
              empty="Los documentos de Drive y enlaces que compartan aparecerán aquí."
              render={(l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-white/[0.04]">
                  <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md"
                    style={l.drive ? { background: 'rgba(30,95,173,0.16)', color: '#5B9BD9' } : { background: 'rgba(255,255,255,0.05)', color: '#888888' }}
                  >
                    {l.drive ? <FileIcon size={15} /> : <GlobeIcon size={15} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] text-[#DDDDDD]">{l.label}</span>
                    <span className="block truncate text-[11px]" style={{ color: l.drive ? '#B8860B' : '#555555' }}>
                      {l.drive ? 'Documento oficial' : l.url.replace(/^https?:\/\/(www\.)?/, '')} · {shortDate(l.createdAt)}
                    </span>
                  </span>
                </a>
              )}
            />

            <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
              <div>
                <p className="text-[12.5px] font-semibold text-[#DDDDDD]">Silenciar</p>
                <p className="text-[11px] text-[#555555]">Sin punto de no leído en la barra</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={muted}
                onClick={onToggleMute}
                className="relative h-[22px] w-[38px] flex-shrink-0 rounded-full transition-colors duration-200"
                style={{ background: muted ? '#1E5FAD' : 'rgba(255,255,255,0.12)' }}
              >
                <span className="absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all duration-200" style={{ left: muted ? 19 : 3 }} />
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
