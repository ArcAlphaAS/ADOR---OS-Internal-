import { useRef } from 'react'
import { conversationKind, isPrivate, membersOf, userLabel, groupLabel, presenceOf } from '../../lib/chat'
import { LockIcon, InfoIcon, PhoneIcon, SearchIcon } from '../icons'
import PersonAvatar from './PersonAvatar'

// The strip above a conversation: who/what it is, presence, call buttons,
// Detalles, and the pinned-messages bar. Split out of ChatModule.jsx.

// Pinned messages bar under the conversation header: the latest pin in one
// line, click to expand the whole list (in normal flow, no popover). Each
// entry jumps to its message or can be unpinned.
export function PinnedBar({ pins, open, onToggle, onJump, onUnpin }) {
  return (
    <div className="mt-2 rounded-xl border border-[#B8860B]/25 bg-[#B8860B]/[0.05]">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <span className="text-[12.5px]">📌</span>
        <span className="flex-shrink-0 text-[12.5px] font-medium text-[#E8C15A]">
          {pins.length} {pins.length === 1 ? 'fijado' : 'fijados'}
        </span>
        {!open && (
          <span className="truncate text-[12.5px] text-[#AAAAAA]">
            {pins[0].authorName ? `${pins[0].authorName.split(' ')[0]}: ` : ''}
            {pins[0].text}
          </span>
        )}
        <span className="ml-auto flex-shrink-0 text-[11px] text-[#777777]">{open ? 'Cerrar' : 'Ver'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 border-t border-[#B8860B]/15 px-1.5 py-1.5">
          {pins.map((p) => (
            <div key={p.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
              <button type="button" onClick={() => onJump(p.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[12.5px] text-[#DDDDDD]">{p.text || 'Mensaje'}</span>
                <span className="block text-[11px] text-[#858585]">
                  {p.authorName} · fijado por {(p.pinnedBy || '').split(' ')[0]}
                </span>
              </button>
              <button type="button" onClick={() => onUnpin(p.id)} className="flex-shrink-0 text-[11px] text-[#858585] opacity-0 transition-opacity hover:text-[#F5F5F5] group-hover:opacity-100">
                Desfijar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Icon-only round buttons for calls, the way every messaging app's header
// does it — labeled buttons crowded out the person's name once the
// profile panel was open beside the thread. The tooltip still names them.
function IconButton({ title, onClick, active, busy, children, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[#AAAAAA] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
      style={{ ...(active ? { background: 'rgba(255,255,255,0.08)', color: '#F5F5F5' } : {}), ...(busy ? { color: '#E8C15A', animation: 'ador-pulse 1s ease-in-out infinite' } : {}) }}
    >
      {children}
    </button>
  )
}

// Llamar / Videollamada both hand off to Google Meet — ADOR OS is where the
// call starts, Meet is the call's infrastructure. No in-app video. The
// popover's open state lives in ChatModule so the same flow can be started
// from here or from the profile panel's buttons.
function CallButtons({ openCall, onCall, busy }) {
  const callRef = useRef(null)
  return (
    <IconButton title={busy ? 'Creando reunión…' : 'Llamar (Google Meet)'} busy={busy === 'video'} buttonRef={callRef} active={openCall?.anchorRef === callRef} onClick={() => onCall('video', callRef)}>
      <PhoneIcon size={15} />
    </IconButton>
  )
}

// "Buscar en esta conversación" — every conversation has it in the header
// now (it used to be reachable only from a person's profile panel).
function SearchButton({ active, onClick }) {
  return (
    <IconButton title="Buscar en esta conversación" active={active} onClick={onClick}>
      <SearchIcon size={15} />
    </IconButton>
  )
}

export default function ConversationHeader({ selected, conversation, dmUser, dmEntry, dmPresence, users, currentUid, infoOpen, profileOpen, onToggleInfo, onToggleProfile, openCall, onCall, callBusy, searching, onToggleSearch }) {
  if (selected.type === 'dm') {
    const presence = presenceOf(dmPresence)
    const role = [dmEntry?.role, dmEntry?.area].filter(Boolean).join(' · ')
    return (
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <button
          type="button"
          onClick={onToggleProfile}
          title="Ver perfil"
          className="-ml-2 flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-1 text-left transition-colors duration-150 hover:bg-white/[0.04]"
          style={profileOpen ? { background: 'rgba(255,255,255,0.05)' } : undefined}
        >
          <PersonAvatar uid={dmUser?.id} name={dmEntry?.name || userLabel(dmUser)} size={30} showPresence />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[#F5F5F5]">{dmEntry?.name || userLabel(dmUser)}</p>
            {(presence.label || role) && (
              <p className="truncate text-[12.5px] text-[#7A7A7A]">
                {presence.label && <span style={{ color: presence.color || undefined }}>{presence.label}</span>}
                {presence.label && role ? ' · ' : ''}
                {role}
              </p>
            )}
          </div>
        </button>
        <div className="flex flex-shrink-0 items-center gap-1">
          <SearchButton active={searching} onClick={onToggleSearch} />
          <CallButtons openCall={openCall} onCall={onCall} busy={callBusy} />
        </div>
      </div>
    )
  }

  const kind = conversationKind(conversation)
  const priv = isPrivate(conversation)
  const memberCount = membersOf(conversation, users).length
  const title = kind === 'group' ? groupLabel(conversation, users, currentUid) : conversation.name
  const subtitle =
    kind === 'group'
      ? `Grupo privado · ${memberCount} personas`
      : priv
        ? `Canal privado · ${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'}`
        : 'Canal de toda la empresa'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-[#F5F5F5]">
          {kind === 'channel' && (priv ? <LockIcon size={13} className="text-[#888888]" /> : <span className="text-[#858585]">#</span>)}
          <span className="truncate">{title}</span>
        </p>
        <p className="truncate text-[12.5px] text-[#7A7A7A]" title={conversation.description || undefined}>
          {conversation.description ? <span className="text-[#AAAAAA]">{conversation.description}</span> : subtitle}
          {conversation.description ? ` · ${subtitle}` : ''}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <SearchButton active={searching} onClick={onToggleSearch} />
        {kind === 'group' && <CallButtons openCall={openCall} onCall={onCall} busy={callBusy} />}
        <IconButton title="Detalles y permisos" onClick={onToggleInfo} active={infoOpen}>
          <InfoIcon size={16} />
        </IconButton>
      </div>
    </div>
  )
}
