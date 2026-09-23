import { useState } from 'react'
import { conversationKind, isPrivate, membersOf, userLabel, groupLabel, normalizeChannelName, NOTIFY_LEVELS } from '../../lib/chat'
import { LockIcon, GlobeIcon } from '../icons'
import { MemberPicker, VisibilityToggle } from './NewConversationModal'
import PersonAvatar from './PersonAvatar'
import SidePanel from './SidePanel'

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-[12.5px] text-[#858585]">{label}</span>
      <span className="text-right text-[12.5px] font-medium text-[#DDDDDD]">{value}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="border-t border-white/[0.06] pt-4 first:border-t-0 first:pt-0">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">{title}</p>
      {children}
    </div>
  )
}

// The permission model made visible: who can find this, who can join, who
// is in it. Rendered as a column beside the thread (normal layout flow,
// not a floating panel) so it never needs a portal.
export default function ConversationInfoPanel({ conversation, users, currentUid, existingNames, notify, onSetNotify, onClose, onUpdate, onAddMembers, onRemoveMember, onConvert }) {
  const kind = conversationKind(conversation)
  const priv = isPrivate(conversation)
  const memberUids = membersOf(conversation, users)
  const [adding, setAdding] = useState(false)
  const [toAdd, setToAdd] = useState([])
  const [converting, setConverting] = useState(false)
  const [newName, setNewName] = useState('')
  const [newVisibility, setNewVisibility] = useState('private')
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [desc, setDesc] = useState(conversation.description || '')

  const title = kind === 'group' ? groupLabel(conversation, users, currentUid) : `#${conversation.name}`
  const candidates = users.filter((u) => !memberUids.includes(u.id))
  const normalized = normalizeChannelName(newName)
  const nameTaken = existingNames.includes(normalized)

  const addSelected = () => {
    if (toAdd.length) onAddMembers(toAdd)
    setToAdd([])
    setAdding(false)
  }

  return (
    <SidePanel title={title} onClose={onClose}>

        {/* One line on what goes here — shown under the name in the header,
            so a new person knows where to post what. */}
        <Section title="Descripción">
          {editingDesc ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                rows={2}
                maxLength={160}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onUpdate({ description: desc.trim() })
                    setEditingDesc(false)
                  }
                  if (e.key === 'Escape') {
                    setDesc(conversation.description || '')
                    setEditingDesc(false)
                  }
                }}
                placeholder={kind === 'group' ? '¿Para qué es este grupo?' : '¿De qué se habla en este canal?'}
                className="w-full resize-none rounded-lg border border-white/[0.1] bg-[#141414] px-3 py-2 text-[12.5px] text-[#F5F5F5] placeholder:text-[#7A7A7A] outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDesc(conversation.description || '')
                    setEditingDesc(false)
                  }}
                  className="text-[12.5px] text-[#858585] hover:text-[#F5F5F5]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ description: desc.trim() })
                    setEditingDesc(false)
                  }}
                  className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12.5px] font-medium"
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : conversation.description ? (
            <button type="button" onClick={() => setEditingDesc(true)} title="Editar descripción" className="w-full rounded-lg px-1.5 py-1 text-left text-[12.5px] leading-relaxed text-[#CCCCCC] hover:bg-white/[0.04]">
              {conversation.description}
            </button>
          ) : (
            <button type="button" onClick={() => setEditingDesc(true)} className="rounded-lg px-1.5 py-1 text-left text-[12.5px] text-[#E8C15A] hover:bg-white/[0.04]">
              + Añadir descripción
            </button>
          )}
        </Section>

        <Section title="Avisos para ti">
          <div className="flex flex-col gap-0.5">
            {NOTIFY_LEVELS.map((l) => {
              const active = notify === l.id
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => !active && onSetNotify(l.id)}
                  className="flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                  style={active ? { background: 'rgba(184,134,11,0.12)' } : undefined}
                >
                  <span
                    className="mt-[3px] flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border"
                    style={{ borderColor: active ? '#E8C15A' : 'rgba(255,255,255,0.25)' }}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-[#E8C15A]" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium" style={{ color: active ? '#E8C15A' : '#DDDDDD' }}>
                      {l.label}
                    </span>
                    <span className="block text-[11px] text-[#858585]">{l.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Permisos">
          <Row
            label="Visibilidad"
            value={
              <span className="inline-flex items-center gap-1.5">
                {priv ? <LockIcon size={11} /> : <GlobeIcon size={11} />}
                {priv ? 'Privado' : 'Toda ADOR'}
              </span>
            }
          />
          <Row label="¿Quién lo encuentra?" value={priv ? 'Solo miembros' : 'Todos en ADOR'} />
          <Row label="¿Quién entra?" value={priv ? 'Por invitación' : 'Automático'} />
          <Row label="Miembros" value={priv ? memberUids.length : 'Toda ADOR'} />

          {kind === 'channel' && (
            <div className="mt-2">
              <VisibilityToggle
                value={priv ? 'private' : 'public'}
                onChange={(v) => {
                  if (v === (priv ? 'private' : 'public')) return
                  // Going private keeps whoever's already listed plus you,
                  // so the channel never ends up with nobody who can see it.
                  onUpdate(v === 'private' ? { visibility: 'private', memberUids: Array.from(new Set([...(conversation.memberUids || []), currentUid])) } : { visibility: 'public' })
                }}
              />
            </div>
          )}
        </Section>

        <Section title={priv ? `Miembros (${memberUids.length})` : 'Miembros'}>
          {priv ? (
            <div className="flex flex-col gap-0.5">
              {memberUids.map((uid) => {
                const u = users.find((x) => x.id === uid)
                return (
                  <div key={uid} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
                    <PersonAvatar uid={uid} name={userLabel(u)} size={22} showPresence />
                    <span className="truncate text-[12.5px] text-[#DDDDDD]">{userLabel(u)}</span>
                    {uid === currentUid ? (
                      <span className="ml-auto text-[11px] text-[#7A7A7A]">tú</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(uid)}
                        title="Quitar del canal"
                        className="ml-auto text-[11px] text-[#858585] opacity-0 transition-opacity hover:text-[#EF5350] group-hover:opacity-100"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                )
              })}

              {adding ? (
                <div className="mt-2 flex flex-col gap-2">
                  {candidates.length ? (
                    <MemberPicker users={candidates} currentUid={null} selected={toAdd} onToggle={(uid) => setToAdd((m) => (m.includes(uid) ? m.filter((x) => x !== uid) : [...m, uid]))} />
                  ) : (
                    <p className="text-[12.5px] text-[#7A7A7A]">Todos los usuarios de ADOR OS ya están aquí.</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setAdding(false)} className="text-[12.5px] text-[#858585] hover:text-[#F5F5F5]">
                      Cancelar
                    </button>
                    <button type="button" disabled={!toAdd.length} onClick={addSelected} className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12.5px] font-medium">
                      Invitar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="mt-1 rounded-lg px-1.5 py-1.5 text-left text-[12.5px] text-[#E8C15A] hover:bg-white/[0.04]">
                  + Invitar personas
                </button>
              )}
            </div>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-[#858585]">
              Todos en ADOR están en este canal automáticamente — incluida cualquier persona que entre a ADOR OS en el futuro.
            </p>
          )}
        </Section>

        {kind === 'group' && (
          <Section title="¿Se volvió recurrente?">
            {converting ? (
              <div className="flex flex-col gap-2.5">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre del canal"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#141414] px-3 py-2 text-[12.5px] text-[#F5F5F5] placeholder:text-[#7A7A7A] outline-none"
                />
                {nameTaken && <p className="text-[11px] text-[#EF5350]">Ya existe #{normalized}.</p>}
                <VisibilityToggle value={newVisibility} onChange={setNewVisibility} />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setConverting(false)} className="text-[12.5px] text-[#858585] hover:text-[#F5F5F5]">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!normalized || nameTaken}
                    onClick={() => onConvert(normalized, newVisibility)}
                    className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12.5px] font-medium"
                  >
                    Convertir
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[12.5px] leading-relaxed text-[#858585]">Si este grupo ya es un espacio fijo de trabajo, conviértelo en canal — se conservan los mensajes.</p>
                <button type="button" onClick={() => setConverting(true)} className="mt-2 text-[12.5px] text-[#E8C15A] hover:underline">
                  Convertir en canal
                </button>
              </>
            )}
          </Section>
        )}

        {priv && (
          <div className="border-t border-white/[0.06] pt-3">
            <button
              type="button"
              onClick={() => (confirmLeave ? onRemoveMember(currentUid) : setConfirmLeave(true))}
              onBlur={() => setConfirmLeave(false)}
              className="text-[12.5px] transition-colors"
              style={{ color: confirmLeave ? '#EF5350' : '#858585' }}
            >
              {confirmLeave ? 'Clic otra vez para salir' : kind === 'group' ? 'Salir del grupo' : 'Salir del canal'}
            </button>
          </div>
        )}
    </SidePanel>
  )
}
