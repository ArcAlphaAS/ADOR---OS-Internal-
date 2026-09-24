import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { SUGGESTED_CHANNELS, normalizeChannelName, userLabel } from '../../lib/chat'
import { LockIcon, GlobeIcon } from '../icons'
import PersonAvatar from './PersonAvatar'
import { SPRING } from '../../lib/motion'

const labelClass = 'mb-1.5 block font-medium text-[#767676]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13.5px] text-[#F5F5F5] placeholder:text-[#767676] outline-none transition-colors duration-150 focus:border-white/[0.2]'

export function MemberPicker({ users, currentUid, selected, onToggle, lockedUids = [] }) {
  return (
    <div className="flex max-h-[180px] flex-col gap-0.5 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-1.5">
      {users.map((u) => {
        const locked = u.id === currentUid || lockedUids.includes(u.id)
        const checked = locked || selected.includes(u.id)
        return (
          <label
            key={u.id}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] ${locked ? 'text-[#888888]' : 'cursor-pointer text-[#DDDDDD] hover:bg-white/[0.04]'}`}
          >
            <input type="checkbox" checked={checked} disabled={locked} onChange={() => onToggle(u.id)} className="accent-[#B8860B]" />
            <PersonAvatar uid={u.id} name={userLabel(u)} size={20} />
            <span className="truncate">{userLabel(u)}</span>
            {u.id === currentUid && <span className="ml-auto text-[11px] text-[#7A7A7A]">tú</span>}
          </label>
        )
      })}
    </div>
  )
}

export function VisibilityToggle({ value, onChange }) {
  const options = [
    { id: 'public', label: 'Toda la empresa', Icon: GlobeIcon, hint: 'Todos en ADOR lo ven y están dentro automáticamente.' },
    { id: 'private', label: 'Privado', Icon: LockIcon, hint: 'Solo lo ven sus miembros. Se entra por invitación.' },
  ]
  const current = options.find((o) => o.id === value)
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition-colors duration-150"
            style={{
              borderColor: value === id ? 'rgba(184,134,11,0.6)' : 'rgba(255,255,255,0.08)',
              background: value === id ? 'rgba(184,134,11,0.14)' : 'transparent',
              color: value === id ? '#E8C15A' : '#888888',
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[12.5px] text-[#858585]">{current.hint}</p>
    </div>
  )
}

export default function NewConversationModal({ kind, users, currentUid, existingNames, onClose, onCreate }) {
  const isGroup = kind === 'group'
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)

  const normalized = normalizeChannelName(name)
  const duplicate = !isGroup && existingNames.includes(normalized)
  const suggestions = SUGGESTED_CHANNELS.filter((s) => !existingNames.includes(s.name))
  const others = members.filter((uid) => uid !== currentUid)

  const canSave = isGroup ? others.length > 0 : normalized && !duplicate
  const toggle = (uid) => setMembers((m) => (m.includes(uid) ? m.filter((x) => x !== uid) : [...m, uid]))

  const applySuggestion = (s) => {
    setName(s.name)
    setDescription(s.description)
    setVisibility(s.visibility)
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onCreate(
        isGroup
          ? { kind: 'group', name: name.trim(), memberUids: members }
          : { kind: 'channel', name: normalized, description: description.trim(), visibility, memberUids: visibility === 'private' ? members : [] }
      )
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="ador-modal-surface ador-grain w-[460px] rounded-[28px] p-8">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">{isGroup ? 'Nuevo grupo privado' : 'Nuevo canal'}</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#858585]">
            {isGroup
              ? 'Una conversación entre algunas personas, sin ser un área fija. Si se vuelve recurrente, puedes convertirla en canal.'
              : 'Un espacio permanente para un área, función o asunto.'}
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {!isGroup && suggestions.length > 0 && (
              <div>
                <label className={labelClass} style={labelStyle}>
                  Sugeridos
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="flex items-center gap-1 rounded-full border border-white/[0.08] px-2.5 py-1 text-[12.5px] text-[#AAAAAA] transition-colors hover:border-white/[0.2] hover:text-[#F5F5F5]"
                      style={normalized === s.name ? { borderColor: 'rgba(184,134,11,0.6)', color: '#E8C15A' } : undefined}
                    >
                      {s.visibility === 'private' ? <LockIcon size={10} /> : '#'} {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={labelClass} style={labelStyle}>
                Nombre {!isGroup && <span style={{ color: '#B8860B' }}>*</span>}
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder={isGroup ? 'Opcional — ej. Propuesta ACME' : 'ej. estrategia'}
                className={inputClass}
              />
              {!isGroup && name && normalized !== name.trim() && !duplicate && <p className="mt-1 text-[11px] text-[#858585]">Se creará como #{normalized}</p>}
              {duplicate && <p className="mt-1 text-[11px] text-[#EF5350]">Ya existe #{normalized}.</p>}
            </div>

            {!isGroup && (
              <>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Descripción
                  </label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿De qué se habla aquí?" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Visibilidad
                  </label>
                  <VisibilityToggle value={visibility} onChange={setVisibility} />
                </div>
              </>
            )}

            {(isGroup || visibility === 'private') && (
              <div>
                <label className={labelClass} style={labelStyle}>
                  Miembros {isGroup && <span style={{ color: '#B8860B' }}>*</span>}
                </label>
                <MemberPicker users={users} currentUid={currentUid} selected={members} onToggle={toggle} />
              </div>
            )}
          </div>

          <div className="mt-7 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[13.5px] text-[#888888] transition-colors hover:text-[#F5F5F5]">
              Cancelar
            </button>
            <button type="button" disabled={!canSave || saving} onClick={save} className="ador-btn-primary rounded-xl px-5 py-2 text-[13.5px] font-medium">
              {isGroup ? 'Crear grupo' : 'Crear canal'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
