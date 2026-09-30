import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { applyTaskUpdate, deleteTask, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { STATUSES, PRIORITIES, withTimeout, workstreamId as buildWorkstreamId } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { SHEET } from '../../lib/motion'

// Floating bar for "Seleccionar" in Lista: change state, priority, owner,
// deadline or project for every selected task at once, or delete them.
// Each task still goes through applyTaskUpdate, so history, assignment
// confirmation and pushes behave exactly as if edited one by one.
function Menu({ children }) {
  return <div className="ador-glass ador-grain absolute bottom-full left-0 mb-2 flex max-h-[50vh] min-w-[190px] flex-col overflow-y-auto rounded-xl p-1.5">{children}</div>
}
function Opt({ onClick, children, color }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-white/[0.07]" style={{ color: color || '#E8E8E8' }}>
      {children}
    </button>
  )
}

export default function BulkBar({ tasks, users, workstreams, actorUserId, actorName, onClear }) {
  const showToast = useToast()
  const [open, setOpen] = useState(null) // 'status' | 'priority' | 'assign' | 'move' | 'due'
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (tasks.length === 0) return null

  const run = async (label, fn) => {
    setBusy(true)
    setOpen(null)
    try {
      await withTimeout(Promise.all(tasks.map(fn)), 20000)
      showToast(`${label} · ${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'}.`)
    } catch (e) {
      showToast(`No se pudo aplicar a todas: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }
  const update = (data) => (t) => applyTaskUpdate(t, data, actorUserId, actorName)

  const moveTo = async (id) => {
    const target = id || (await findOrCreateGeneralProyecto(actorName).then((pid) => buildWorkstreamId('proyecto', pid)))
    return run('Movidas', update({ workstreamId: target }))
  }

  const toggleMenu = (name) => setOpen((v) => (v === name ? null : name))
  const btn = 'rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-[#E8E8E8] transition-colors hover:bg-white/[0.08] disabled:opacity-50'

  return createPortal(
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={SHEET}
      className="fixed bottom-[92px] left-1/2 z-[60] -translate-x-1/2 lg:bottom-8"
    >
      <div className="ador-modal-surface ador-grain flex items-center gap-1 rounded-2xl px-3 py-2 shadow-2xl">
        <span className="px-2 text-[12.5px] font-semibold text-[#E8C15A]">{tasks.length} seleccionada{tasks.length === 1 ? '' : 's'}</span>
        <span className="mx-1 h-5 w-px bg-white/[0.1]" />

        <div className="relative">
          <button type="button" disabled={busy} onClick={() => toggleMenu('status')} className={btn}>Estado</button>
          {open === 'status' && <Menu>{STATUSES.map((s) => <Opt key={s.id} color={s.color === '#444444' ? '#BBBBBB' : s.color} onClick={() => run('Estado cambiado', update({ status: s.id }))}>{s.label}</Opt>)}</Menu>}
        </div>
        <div className="relative">
          <button type="button" disabled={busy} onClick={() => toggleMenu('priority')} className={btn}>Prioridad</button>
          {open === 'priority' && <Menu>{PRIORITIES.map((p) => <Opt key={p.id} color={p.color} onClick={() => run('Prioridad cambiada', update({ priority: p.id }))}>{p.label}</Opt>)}</Menu>}
        </div>
        <div className="relative">
          <button type="button" disabled={busy} onClick={() => toggleMenu('assign')} className={btn}>Asignar a</button>
          {open === 'assign' && (
            <Menu>
              {users.map((u) => (
                <Opt key={u.id} onClick={() => run('Asignadas', (t) => ((t.assignedTo || []).includes(u.id) ? Promise.resolve() : applyTaskUpdate(t, { assignedTo: [...(t.assignedTo || []), u.id] }, actorUserId, actorName)))}>
                  {u.displayName || u.email}
                </Opt>
              ))}
            </Menu>
          )}
        </div>
        <div className="relative">
          <button type="button" disabled={busy} onClick={() => toggleMenu('due')} className={btn}>Fecha límite</button>
          {open === 'due' && (
            <Menu>
              <input
                type="date"
                autoFocus
                onChange={(e) => e.target.value && run('Fecha límite cambiada', update({ dueDate: new Date(`${e.target.value}T00:00:00`) }))}
                className="rounded-lg border border-white/[0.14] bg-[#141414] px-2 py-1.5 text-[12px] text-[#F5F5F5] outline-none"
              />
              <Opt onClick={() => run('Fecha límite quitada', update({ dueDate: null }))} color="#999999">Quitar fecha</Opt>
            </Menu>
          )}
        </div>
        <div className="relative">
          <button type="button" disabled={busy} onClick={() => toggleMenu('move')} className={btn}>Mover a</button>
          {open === 'move' && (
            <Menu>
              <Opt onClick={() => moveTo(null)}>General</Opt>
              {workstreams.filter((w) => w.name !== 'General').map((w) => <Opt key={w.id} onClick={() => moveTo(w.id)}>{w.name}</Opt>)}
            </Menu>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => (confirmDelete ? (setConfirmDelete(false), run('Eliminadas', (t) => deleteTask(t.id)).then(onClear)) : setConfirmDelete(true))}
          onBlur={() => setConfirmDelete(false)}
          className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-[#EF5350] transition-colors hover:bg-[#EF5350]/10 disabled:opacity-50"
        >
          {confirmDelete ? '¿Seguro? Clic otra vez' : 'Eliminar'}
        </button>
        <span className="mx-1 h-5 w-px bg-white/[0.1]" />
        <button type="button" onClick={onClear} className="rounded-lg px-2.5 py-1.5 text-[12.5px] text-[#888888] hover:text-[#F5F5F5]">Cancelar</button>
      </div>
    </motion.div>,
    document.body
  )
}
