import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { SUGGESTED_CHANNELS, normalizeChannelName, userLabel } from '../../lib/chat'
import { LockIcon, GlobeIcon } from '../icons'
import PersonAvatar from './PersonAvatar'
import { SPRING, SHEET, swipeToClose } from '../../lib/motion'
import usePhone from '../../hooks/usePhone'

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
            <input type="checkbox" checked={checked} disabled={locked} onChange={() => onToggle(u.id)} className="accent-[#F4EEE2]" />
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
              borderColor: value === id ? 'rgba(244,238,226,0.4)' : 'rgba(255,255,255,0.08)',
              background: value === id ? 'rgba(244,238,226,0.1)' : 'transparent',
              color: value === id ? '#F4EEE2' : '#888888',
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

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="relative h-[28px] w-[48px] flex-shrink-0 rounded-full" style={{ background: on ? '#34C759' : 'rgba(255,255,255,0.18)' }}>
      <span className="absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white shadow transition-all duration-200" style={{ left: on ? 22 : 2 }} />
    </button>
  )
}

export default function NewConversationModal({ kind, users, currentUid, existingNames, onClose, onCreate }) {
  const isGroup = kind === 'group'
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const phone = usePhone()

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

  if (phone) {
    const needMembers = isGroup || visibility === 'private'
    return createPortal(
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-50 flex items-end bg-black/55 backdrop-blur-[6px]" onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={SHEET}
          onClick={(e) => e.stopPropagation()}
          {...swipeToClose('y', onClose)}
          className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[32px] bg-[#1C1C1E] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/[0.22]" />
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2C2C2E] text-[#F5F5F5]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <div className="text-center">
              <h2 className="text-[18px] font-semibold text-[#F5F5F5]">{isGroup ? 'Nuevo grupo' : 'Nuevo canal'}</h2>
              <p className="text-[12.5px] text-[#8E8E93]">{isGroup ? 'Privado, entre algunas personas' : 'Un espacio permanente'}</p>
            </div>
            <span className="h-11 w-11" />
          </div>

          <div className="mt-5 overflow-hidden rounded-[22px] bg-[#2C2C2E]">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isGroup ? 'Nombre (opcional)' : 'Nombre del canal'}
              className="w-full bg-transparent px-5 py-4 text-[16px] text-[#F5F5F5] placeholder:text-[#8E8E93] outline-none"
            />
            {!isGroup && (
              <>
                <div className="mx-5 h-px bg-white/[0.08]" />
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Añadir descripción" className="w-full bg-transparent px-5 py-4 text-[16px] text-[#F5F5F5] placeholder:text-[#8E8E93] outline-none" />
              </>
            )}
          </div>
          {!isGroup && name && normalized !== name.trim() && !duplicate && <p className="mt-2 px-2 text-[12.5px] text-[#8E8E93]">Se creará como #{normalized}</p>}
          {duplicate && <p className="mt-2 px-2 text-[12.5px] text-[#EF5350]">Ya existe #{normalized}.</p>}

          {!isGroup && suggestions.length > 0 && (
            <div className="-mx-5 mt-4 overflow-x-auto px-5 [scrollbar-width:none]">
              <div className="flex gap-2">
                {suggestions.map((s) => (
                  <button key={s.name} type="button" onClick={() => applySuggestion(s)} className="flex flex-shrink-0 items-center gap-1 rounded-full bg-[#2C2C2E] px-3.5 py-2 text-[13.5px] text-[#D5D5D5]" style={normalized === s.name ? { background: '#F4EEE2', color: '#1C1A16' } : undefined}>
                    {s.visibility === 'private' ? <LockIcon size={11} /> : '#'} {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {needMembers && (
            <div className="mt-6">
              <p className="mb-3 px-1 text-[14px] font-medium text-[#8E8E93]">Miembros {isGroup && <span className="text-[#F4EEE2]">*</span>}</p>
              <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
                <div className="flex gap-4">
                  {users.map((u) => {
                    const me = u.id === currentUid
                    const on = me || members.includes(u.id)
                    return (
                      <button key={u.id} type="button" disabled={me} onClick={() => toggle(u.id)} className="flex w-[64px] flex-shrink-0 flex-col items-center gap-1.5">
                        <span className="relative rounded-full p-[3px]" style={{ boxShadow: on ? '0 0 0 2px #F4EEE2' : '0 0 0 2px transparent', opacity: on ? 1 : 0.55 }}>
                          <PersonAvatar uid={u.id} name={userLabel(u)} size={56} />
                        </span>
                        <span className="w-full truncate text-center text-[12.5px] text-[#D5D5D5]">{me ? 'Tú' : userLabel(u).split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {!isGroup && (
            <div className="mt-6">
              <p className="mb-3 px-1 text-[14px] font-medium text-[#8E8E93]">Ajustes</p>
              <div className="flex items-center gap-4 rounded-[22px] bg-[#2C2C2E] px-5 py-4">
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-medium text-[#F5F5F5]">Privado</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-[#8E8E93]">{visibility === 'private' ? 'Solo lo ven sus miembros. Se entra por invitación.' : 'Toda la empresa lo ve y entra automáticamente.'}</span>
                </span>
                <Switch on={visibility === 'private'} onChange={(v) => setVisibility(v ? 'private' : 'public')} label="Canal privado" />
              </div>
            </div>
          )}

          <button type="button" disabled={!canSave || saving} onClick={save} className="ador-btn-primary mt-7 w-full rounded-full py-4 text-[16px] font-semibold disabled:opacity-40">
            {saving ? 'Creando…' : isGroup ? 'Crear grupo' : 'Crear canal'}
          </button>
        </motion.div>
      </motion.div>,
      document.body
    )
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
                      style={normalized === s.name ? { borderColor: 'rgba(244,238,226,0.4)', color: '#F4EEE2' } : undefined}
                    >
                      {s.visibility === 'private' ? <LockIcon size={10} /> : '#'} {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={labelClass} style={labelStyle}>
                Nombre {!isGroup && <span style={{ color: '#F4EEE2' }}>*</span>}
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
                  Miembros {isGroup && <span style={{ color: '#F4EEE2' }}>*</span>}
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
