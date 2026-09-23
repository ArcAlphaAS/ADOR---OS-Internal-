import { useState } from 'react'
import { conversationKind, isPrivate, membersOf, userLabel, groupLabel, normalizeChannelName } from '../../lib/chat'
import Avatar from '../shell/Avatar'
import { CloseIcon, LockIcon, GlobeIcon } from '../icons'
import { MemberPicker, VisibilityToggle } from './NewConversationModal'

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-[12px] text-[#666666]">{label}</span>
      <span className="text-right text-[12px] font-medium text-[#DDDDDD]">{value}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="border-t border-white/[0.06] pt-4">
      <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#444444]">{title}</p>
      {children}
    </div>
  )
}

// The permission model made visible: who can find this, who can join, who
// is in it. Rendered as a column beside the thread (normal layout flow,
// not a floating panel) so it never needs a portal.
export default function ConversationInfoPanel({ conversation, users, currentUid, existingNames, onClose, onUpdate, onAddMembers, onRemoveMember, onConvert }) {
  const kind = conversationKind(conversation)
  const priv = isPrivate(conversation)
  const memberUids = membersOf(conversation, users)
  const [adding, setAdding] = useState(false)
  const [toAdd, setToAdd] = useState([])
  const [converting, setConverting] = useState(false)
  const [newName, setNewName] = useState('')
  const [newVisibility, setNewVisibility] = useState('private')
  const [confirmLeave, setConfirmLeave] = useState(false)

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
    <aside className="flex w-[280px] flex-shrink-0 flex-col overflow-y-auto">
      <div className="ador-glass ador-grain flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#F5F5F5]">{title}</p>
            {conversation.description && <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#666666]">{conversation.description}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex-shrink-0 text-[#666666] hover:text-[#F5F5F5]">
            <CloseIcon size={12} />
          </button>
        </div>

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
                    <Avatar displayName={userLabel(u)} photoURL={u?.photoDataUrl} size={22} />
                    <span className="truncate text-[12.5px] text-[#DDDDDD]">{userLabel(u)}</span>
                    {uid === currentUid ? (
                      <span className="ml-auto text-[10.5px] text-[#555555]">tú</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(uid)}
                        title="Quitar del canal"
                        className="ml-auto text-[11px] text-[#666666] opacity-0 transition-opacity hover:text-[#EF5350] group-hover:opacity-100"
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
                    <p className="text-[11.5px] text-[#555555]">Todos los usuarios de ADOR OS ya están aquí.</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setAdding(false)} className="text-[12px] text-[#666666] hover:text-[#F5F5F5]">
                      Cancelar
                    </button>
                    <button type="button" disabled={!toAdd.length} onClick={addSelected} className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12px] font-medium">
                      Invitar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="mt-1 rounded-lg px-1.5 py-1.5 text-left text-[12.5px] text-[#5B9BD9] hover:bg-white/[0.04]">
                  + Invitar personas
                </button>
              )}
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-[#666666]">
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
                  className="w-full rounded-lg border border-white/[0.1] bg-[#141414] px-3 py-2 text-[12.5px] text-[#F5F5F5] placeholder:text-[#555555] outline-none"
                />
                {nameTaken && <p className="text-[11px] text-[#EF5350]">Ya existe #{normalized}.</p>}
                <VisibilityToggle value={newVisibility} onChange={setNewVisibility} />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setConverting(false)} className="text-[12px] text-[#666666] hover:text-[#F5F5F5]">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!normalized || nameTaken}
                    onClick={() => onConvert(normalized, newVisibility)}
                    className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12px] font-medium"
                  >
                    Convertir
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[12px] leading-relaxed text-[#666666]">Si este grupo ya es un espacio fijo de trabajo, conviértelo en canal — se conservan los mensajes.</p>
                <button type="button" onClick={() => setConverting(true)} className="mt-2 text-[12.5px] text-[#5B9BD9] hover:underline">
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
              className="text-[12px] transition-colors"
              style={{ color: confirmLeave ? '#EF5350' : '#666666' }}
            >
              {confirmLeave ? 'Clic otra vez para salir' : kind === 'group' ? 'Salir del grupo' : 'Salir del canal'}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
