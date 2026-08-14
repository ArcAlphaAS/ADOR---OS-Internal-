import { useRef, useState } from 'react'
import AvatarStack from './AvatarStack'
import CellPopover from './CellPopover'

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

// "Estimación" — start and due date together, matching Timeline's own
// startDate/dueDate fields (see TimelineView.jsx) so a duration set here is
// the exact same duration that draws as a bar there. A due-date-only task
// still shows just its due date; adding a start date is optional.
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
        {label || 'Agregar fecha'}
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)} width={210}>
          <div className="flex flex-col gap-2 p-1">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#444444]">Inicio</span>
              <input
                type="date"
                defaultValue={startDate ? startDate.toISOString().slice(0, 10) : ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChangeStart(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
                className="rounded-lg border border-white/[0.14] bg-[#141414] px-2 py-1 text-[12px] text-[#F5F5F5] outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#444444]">Fin</span>
              <input
                type="date"
                defaultValue={dueDate ? dueDate.toISOString().slice(0, 10) : ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChangeDue(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
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

export function AssigneeCell({ assignedTo = [], userById, users = [], onChange }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)

  const toggle = (uid) => {
    const next = assignedTo.includes(uid) ? assignedTo.filter((id) => id !== uid) : [...assignedTo, uid]
    onChange(next)
  }

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
        className="flex items-center transition-opacity duration-150 hover:opacity-80"
      >
        <AvatarStack userIds={assignedTo} userById={userById} size={22} />
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)} width={200}>
          {users.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[12px] text-[#444444]">Sin asociados</p>
          ) : (
            users.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors duration-150 hover:bg-white/[0.06]"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={assignedTo.includes(u.id)}
                  onChange={() => toggle(u.id)}
                  className="h-3.5 w-3.5 accent-[#1E5FAD]"
                />
                <span className="text-[#F5F5F5]">{u.displayName || u.email}</span>
              </label>
            ))
          )}
        </CellPopover>
      )}
    </div>
  )
}
