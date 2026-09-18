import { useRef, useState } from 'react'
import AvatarStack from './AvatarStack'
import CellPopover from './CellPopover'
import Avatar from '../shell/Avatar'
import { CloseIcon } from '../icons'

// Shared, presentational cell editors — used by both TaskRow (an existing
// task, writes straight to Firestore) and ListaView's NewTaskRow (a draft
// that only exists in local state until the title is saved). Every cell
// here works off plain values in/out, never a Firestore doc or Timestamp
// directly, so both callers can reuse them as-is.

export function formatShort(date) {
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// Click-to-open dropdown for a pill-style field (Estado/Prioridad) — stops
// the row's own onClick (which opens the full Task Detail Panel) so editing
// a single cell never yanks the user into the side panel.
export function PillCell({ options, value, meta, onChange, emptyLabel }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)

  const openMenu = (e) => {
    e.stopPropagation()
    setRect(triggerRef.current.getBoundingClientRect())
    setOpen(true)
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="w-fit rounded-full px-2.5 py-1 text-[11px] font-medium transition-opacity duration-150 hover:opacity-80"
        style={meta ? { background: `${meta.color}22`, color: meta.color } : { color: '#444444', border: '1px dashed rgba(255,255,255,0.14)' }}
      >
        {meta ? meta.label : emptyLabel}
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)}>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(opt.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors duration-150 hover:bg-white/[0.06]"
              style={{ color: opt.id === value ? opt.color : '#F5F5F5' }}
            >
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: opt.color }} />
              {opt.label}
            </button>
          ))}
        </CellPopover>
      )}
    </div>
  )
}

// Workstream ("Proyecto") picker. Two looks share the same popover: the
// default bordered-button trigger for the draft add-rows in Hoy/Personal
// (replacing a native <select> so it doesn't read as the one control still
// wearing the browser's own default styling), and a plain colored-label
// trigger (`variant="label"`) for existing rows in ProjectTaskRow — those
// already show the project name as a small uppercase accent-colored label,
// and swapping in the bordered button there would look like a new field
// appeared rather than the same one becoming editable.
export function WorkstreamCell({ workstreams = [], value, onChange, variant = 'button', accentColor }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)

  const selected = workstreams.find((w) => w.id === value)

  const openMenu = (e) => {
    e.stopPropagation()
    setRect(triggerRef.current.getBoundingClientRect())
    setOpen(true)
  }

  return (
    <div>
      {variant === 'label' ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={openMenu}
          className="min-w-0 max-w-full truncate text-left text-[10.5px] font-medium uppercase tracking-[0.05em] transition-opacity duration-150 hover:opacity-80"
          style={{ color: accentColor }}
        >
          {selected ? selected.name : 'General'}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={openMenu}
          className="w-fit max-w-full truncate rounded-lg border border-white/[0.14] bg-[#141414] px-2.5 py-1.5 text-left text-[12px] text-[#F5F5F5] transition-opacity duration-150 hover:opacity-80"
        >
          {selected ? selected.name : 'General'}
        </button>
      )}

      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)} width={200}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors duration-150 hover:bg-white/[0.06]"
            style={{ color: !value ? '#F5F5F5' : '#888888', fontWeight: !value ? 500 : 400 }}
          >
            General
          </button>
          {workstreams.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(w.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors duration-150 hover:bg-white/[0.06]"
              style={{ color: w.id === value ? '#F5F5F5' : '#888888', fontWeight: w.id === value ? 500 : 400 }}
            >
              <span className="min-w-0 truncate">{w.name}</span>
            </button>
          ))}
        </CellPopover>
      )}
    </div>
  )
}

// "Estimación" — a due date ("Vencimiento") drives Vencidas/Para hoy/Mis
// Pendientes placement everywhere it's read (see isOverdue/isDueToday in
// lib/workspace.js), with an optional start date on top of it purely for
// Timeline's duration bars (see TimelineView.jsx). Labeled around the due
// date since that's what most editing here is actually about — the start
// date is a secondary, clearly-optional field in the popover, not implied
// by the trigger's own label.
export function EstimationCell({ startDate, dueDate, overdue, dueToday, onChangeStart, onChangeDue }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)

  const label = dueDate ? (startDate ? `${formatShort(startDate)} – ${formatShort(dueDate)}` : formatShort(dueDate)) : null

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setRect(triggerRef.current.getBoundingClientRect())
          setOpen(true)
        }}
        className="w-fit truncate text-left text-[12px] transition-opacity duration-150 hover:opacity-80"
        style={{ color: label ? (overdue ? '#EF5350' : dueToday ? '#FFC107' : '#888888') : '#444444' }}
      >
        {label || 'Agregar vencimiento'}
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)} width={210}>
          <div className="flex flex-col gap-2 p-1">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#444444]">Vencimiento</span>
              <input
                type="date"
                defaultValue={dueDate ? dueDate.toISOString().slice(0, 10) : ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChangeDue(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
                className="rounded-lg border border-white/[0.14] bg-[#141414] px-2 py-1 text-[12px] text-[#F5F5F5] outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#444444]">Inicio (opcional, para Timeline)</span>
              <input
                type="date"
                defaultValue={startDate ? startDate.toISOString().slice(0, 10) : ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChangeStart(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
                className="rounded-lg border border-white/[0.14] bg-[#141414] px-2 py-1 text-[12px] text-[#F5F5F5] outline-none"
              />
            </label>
          </div>
        </CellPopover>
      )}
    </div>
  )
}

export function DescriptionCell({ description, onChange }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const [draft, setDraft] = useState(description || '')
  const triggerRef = useRef(null)

  const save = () => {
    if (draft !== (description || '')) onChange(draft.trim())
    setOpen(false)
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setDraft(description || '')
          setRect(triggerRef.current.getBoundingClientRect())
          setOpen(true)
        }}
        className="w-full truncate text-left text-[13px] transition-opacity duration-150 hover:opacity-80"
        style={{ color: description ? '#888888' : '#444444' }}
      >
        {description || 'Agregar descripción'}
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={save} width={260}>
          <div className="p-1">
            <textarea
              autoFocus
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Agregar descripción..."
              className="w-full resize-none rounded-lg border border-white/[0.14] bg-[#141414] px-2.5 py-2 text-[12px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
            />
          </div>
        </CellPopover>
      )}
    </div>
  )
}

// Combobox-style assignee picker, matching how Linear/Asana/Notion handle a
// multi-person field: selected people show as removable chips above a
// search input, the list below narrows to unselected matches as you type,
// and Enter/click on the top match adds them without closing the popover
// (so picking 2-3 people is one continuous flow, not repeated open/close).
export function AssigneeCell({ assignedTo = [], userById, users = [], pendingIds = [], onChange }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const triggerRef = useRef(null)
  const inputRef = useRef(null)

  const add = (uid) => {
    if (!assignedTo.includes(uid)) onChange([...assignedTo, uid])
    setQuery('')
    setHighlight(0)
    inputRef.current?.focus()
  }

  const remove = (uid) => {
    onChange(assignedTo.filter((id) => id !== uid))
  }

  const selectedUsers = assignedTo.map((uid) => userById[uid]).filter(Boolean)
  const q = query.trim().toLowerCase()
  const available = users.filter((u) => !assignedTo.includes(u.id))
  const filtered = q ? available.filter((u) => (u.displayName || u.email || '').toLowerCase().includes(q)) : available

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setQuery('')
          setHighlight(0)
          setRect(triggerRef.current.getBoundingClientRect())
          setOpen(true)
        }}
        className="flex items-center transition-opacity duration-150 hover:opacity-80"
      >
        <AvatarStack userIds={assignedTo} userById={userById} pendingIds={pendingIds} size={22} />
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)} width={230}>
          <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 px-1">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="flex items-center gap-1 rounded-full py-0.5 pl-1 pr-1.5 text-[11px]"
                    style={{ background: 'rgba(30,95,173,0.15)', color: '#F5F5F5' }}
                  >
                    <Avatar displayName={u.displayName} email={u.email} size={16} />
                    {u.displayName || u.email}
                    <button
                      type="button"
                      onClick={() => remove(u.id)}
                      className="ml-0.5 flex items-center justify-center rounded-full text-[#888888] hover:text-[#F5F5F5]"
                    >
                      <CloseIcon size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {users.length > 0 && (
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHighlight(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setHighlight((h) => Math.min(h + 1, filtered.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setHighlight((h) => Math.max(h - 1, 0))
                  } else if (e.key === 'Enter' && filtered[highlight]) {
                    e.preventDefault()
                    add(filtered[highlight].id)
                  } else if (e.key === 'Backspace' && !query && selectedUsers.length > 0) {
                    remove(selectedUsers[selectedUsers.length - 1].id)
                  }
                }}
                placeholder="Escribe un nombre..."
                className="mx-1 rounded-lg border border-white/[0.14] bg-[#141414] px-2.5 py-1.5 text-[12px] text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-[#1E5FAD]/50"
              />
            )}

            {users.length === 0 ? (
              <p className="px-2.5 py-1.5 text-[12px] text-[#444444]">Sin asociados</p>
            ) : filtered.length === 0 ? (
              <p className="px-2.5 py-1.5 text-[12px] text-[#444444]">{available.length === 0 ? 'Todos ya están asignados' : 'Sin resultados'}</p>
            ) : (
              <div className="max-h-[180px] overflow-y-auto">
                {filtered.map((u, i) => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => add(u.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors duration-150"
                    style={{ background: i === highlight ? 'rgba(255,255,255,0.06)' : 'transparent' }}
                  >
                    <Avatar displayName={u.displayName} email={u.email} size={20} />
                    <span className="text-[#F5F5F5]">{u.displayName || u.email}</span>
                    {pendingIds.includes(u.id) && <span className="ml-auto text-[10px]" style={{ color: '#B8860B' }}>pendiente</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CellPopover>
      )}
    </div>
  )
}
