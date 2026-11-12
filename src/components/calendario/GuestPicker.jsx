import { useMemo, useState } from 'react'
import PersonAvatar from '../chat/PersonAvatar'

// Invitados como en Google Calendar / Apple Calendar: escribes un nombre y eliges a alguien de
// la organización (con su foto, cargo y correo), o escribes un correo externo. Las sugerencias
// salen en el flujo normal debajo del campo (no flotan), porque el modal hace scroll.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STATUS = { accepted: '#7FC98F', declined: '#EF5350', tentative: '#E8C15A' }
const STATUS_LABEL = { accepted: 'Aceptó', declined: 'Rechazó', tentative: 'Tal vez' }

export default function GuestPicker({ guests, people, draft, setDraft, onAdd, onAddRaw, onRemove, onRemoveLast, hasError, showChips = true, inputRef }) {
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const byEmail = useMemo(() => Object.fromEntries(people.map((p) => [p.email, p])), [people])

  const taken = new Set(guests.map((g) => g.email))
  const q = fold(draft.trim())
  const matches = people
    .filter((p) => !taken.has(p.email))
    .filter((p) => !q || fold(`${p.name} ${p.email} ${p.role || ''} ${p.area || ''}`).includes(q))
    .slice(0, 5)
  const typedEmail = draft.trim().toLowerCase()
  const offerExternal = EMAIL_RE.test(typedEmail) && !taken.has(typedEmail) && !byEmail[typedEmail]
  const rows = [...matches.map((p) => ({ type: 'person', p })), ...(offerExternal ? [{ type: 'email', email: typedEmail }] : [])]
  const open = focused && rows.length > 0
  const idx = Math.min(active, Math.max(0, rows.length - 1))

  const pick = (row) => {
    onAdd(row.type === 'person' ? row.p.email : row.email)
    setDraft('')
    setActive(0)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-[#1A1A1A] px-2.5 py-2 transition-colors" style={{ borderColor: hasError ? 'rgba(239,83,80,0.6)' : focused ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)' }}>
        {showChips && guests.map((g) => {
          const p = byEmail[g.email]
          return (
            <span key={g.email} title={`${p?.name ? p.name + ' · ' : ''}${g.email}${STATUS_LABEL[g.responseStatus] ? ' · ' + STATUS_LABEL[g.responseStatus] : ''}`} className="flex items-center gap-1.5 rounded-full bg-white/[0.1] py-0.5 pl-0.5 pr-2 text-[12.5px] text-[#E4E4E4]">
              <span className="relative">
                <PersonAvatar name={p?.name || g.email} photo={p?.photo} size={20} />
                {STATUS[g.responseStatus] && <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full ring-2 ring-[#2A2A2A]" style={{ background: STATUS[g.responseStatus] }} />}
              </span>
              <span className="max-w-[150px] truncate">{p ? p.name : g.email}</span>
              <button type="button" aria-label={`Quitar ${g.email}`} onClick={() => onRemove(g.email)} className="text-[#8A8A8A] hover:text-[#F5F5F5]">×</button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            const v = e.target.value
            setActive(0)
            if (/[\s,;]$/.test(v) && EMAIL_RE.test(v.trim().replace(/[,;]$/, ''))) onAddRaw(v)
            else setDraft(v)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            if (EMAIL_RE.test(draft.trim())) onAddRaw(draft)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && rows.length) { e.preventDefault(); setActive((i) => (i + 1) % rows.length) }
            else if (e.key === 'ArrowUp' && rows.length) { e.preventDefault(); setActive((i) => (i - 1 + rows.length) % rows.length) }
            else if (e.key === 'Enter') {
              e.preventDefault()
              if (open && q && rows[idx]) pick(rows[idx])
              else if (EMAIL_RE.test(draft.trim())) onAddRaw(draft)
            } else if (e.key === 'Tab' && open && q && rows[idx]) { e.preventDefault(); pick(rows[idx]) }
            else if (e.key === 'Escape' && open) { e.stopPropagation(); e.currentTarget.blur() }
            else if (e.key === 'Backspace' && !draft && guests.length) onRemoveLast()
          }}
          placeholder={guests.length ? 'Añadir más…' : 'Añadir personas o correos'}
          autoComplete="off"
          className="min-w-[150px] flex-1 bg-transparent py-0.5 text-[13px] text-[#F5F5F5] placeholder:text-[#767676] outline-none"
        />
      </div>

      {open && (
        <ul role="listbox" className="mt-1.5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414]">
          {!q && <li className="px-3.5 pb-1 pt-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#767676]">Tu organización</li>}
          {rows.map((row, i) => (
            <li key={row.type === 'person' ? row.p.email : row.email} role="option" aria-selected={i === idx}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(row)}
                className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors"
                style={{ background: i === idx ? 'rgba(255,255,255,0.07)' : 'transparent' }}
              >
                {row.type === 'person' ? (
                  <>
                    <PersonAvatar name={row.p.name} photo={row.p.photo} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-[#F0F0F0]">{row.p.name}</span>
                      <span className="block truncate text-[12px] text-[#8A8A8A]">{[row.p.role, row.p.email].filter(Boolean).join(' · ')}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[#C9C9C9]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-[#F0F0F0]">Invitar a {row.email}</span>
                      <span className="block text-[12px] text-[#8A8A8A]">Correo externo</span>
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
