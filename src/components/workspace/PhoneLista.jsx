import { useState } from 'react'
import { createTask, createProyectoInterno } from '../../lib/firestore'
import { workstreamId as buildWorkstreamId, withTimeout, workstreamHealth } from '../../lib/workspace'
import { sortTasks, groupTasks } from '../../lib/workspaceFilters'
import { useToast } from '../../hooks/useToast'
import PhoneTaskCard from './PhoneTaskCard'
import { BriefcaseIcon, UsersIcon } from '../icons'

// La vista Lista en el teléfono: no una tabla de siete columnas, sino un
// grupo por proyecto con sus tareas como tarjetas (las mismas que en Hoy y en la
// línea de tiempo), un encabezado que se pliega y una fila para agregar tareas con
// el teclado ya abierto. Lo editable (estado, fechas, descripción…) vive en el
// panel que se abre al tocar una tarjeta.
const GENERAL = { id: null, kind: 'proyecto_interno', name: 'General' }

function AddRow({ workstreamId, actorUserId, actorName }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const submit = async () => {
    const t = title.trim()
    if (!t || saving) return
    setSaving(true)
    try {
      let target = workstreamId
      if (!target) {
        const ref = await withTimeout(createProyectoInterno({ name: 'General' }, actorName))
        target = buildWorkstreamId('proyecto', ref.id)
      }
      await withTimeout(createTask({ title: t, description: '', assignedTo: actorUserId ? [actorUserId] : [], priority: 'media', startDate: null, endDate: null, dueDate: null, workstreamId: target }, actorName, actorUserId))
      setTitle('')
    } catch (e) {
      showToast(`No se pudo crear la tarea: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-[48px] w-full items-center gap-2 rounded-[18px] px-4 text-left text-[15px] text-[#8E8E93] active:bg-white/[0.04]">
        <span className="text-[19px] leading-none">+</span> Agregar tarea
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-[18px] bg-[#1C1C1E] py-1.5 pl-4 pr-1.5">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="¿Qué hay que hacer?"
        className="min-w-0 flex-1 bg-transparent text-[16px] text-[#F5F5F5] outline-none placeholder:text-[#767676]"
      />
      <button type="button" onClick={submit} disabled={!title.trim() || saving} className="rounded-full bg-[#F5F5F5] px-4 py-2 text-[14px] font-semibold text-[#0A0A0A] disabled:opacity-40">
        {saving ? '…' : 'Añadir'}
      </button>
      <button type="button" aria-label="Cancelar" onClick={() => { setTitle(''); setOpen(false) }} className="flex h-9 w-9 items-center justify-center rounded-full text-[#8E8E93]">✕</button>
    </div>
  )
}

function Group({ group, workstreams, userById, actorUserId, actorName, onOpenTask, workstreamById }) {
  const [collapsed, setCollapsed] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const open = group.tasks.filter((t) => t.status !== 'completado')
  const done = group.tasks.filter((t) => t.status === 'completado')
  const virtual = group.kind === 'virtual'
  const accent = virtual ? group.accent : group.kind === 'intervencion' ? '#0A84FF' : '#FF9F0A'
  const health = workstreamHealth(group.tasks)
  const pct = group.tasks.length ? Math.round((done.length / group.tasks.length) * 100) : 0
  const card = (t) => (
    <PhoneTaskCard key={t.id} task={t} workstream={workstreamById?.[t.workstreamId]} workstreams={workstreams} userById={userById} actorUserId={actorUserId} actorName={actorName} onOpen={onOpenTask} />
  )
  return (
    <section className="flex flex-col gap-2">
      <button type="button" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} className="flex min-h-[44px] items-center gap-2.5 px-1 text-left">
        {virtual ? (
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: accent || '#888' }} />
        ) : (
          <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
            {group.kind === 'intervencion' ? <UsersIcon size={15} /> : <BriefcaseIcon size={15} />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold text-[#F5F5F5]">{group.name}</span>
          <span className="block text-[12.5px] text-[#8E8E93]">
            {group.tasks.length ? `${done.length} de ${group.tasks.length} completadas` : 'Sin tareas todavía'}
            {health === false && <span className="text-[#D98A86]"> · Atrasado</span>}
          </span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {group.tasks.length > 0 && (
        <div className="mx-1 h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent || 'var(--mod, #F4EEE2)' }} />
        </div>
      )}
      {!collapsed && (
        <>
          {open.map(card)}
          {done.length > 0 && (
            <>
              <button type="button" onClick={() => setShowDone((v) => !v)} className="min-h-[40px] px-1 text-left text-[13px] text-[#8E8E93]">
                {showDone ? 'Ocultar' : 'Ver'} {done.length} {done.length === 1 ? 'completada' : 'completadas'}
              </button>
              {showDone && done.map(card)}
            </>
          )}
          {!virtual && <AddRow workstreamId={group.id} actorUserId={actorUserId} actorName={actorName} />}
        </>
      )}
    </section>
  )
}

export default function PhoneLista({ workstreams, tasksByWorkstream, workstreamById, userById, onOpenTask, actorUserId, actorName, emptyLabel = 'General', sort, groupBy = 'proyecto', filtersActive = false }) {
  let groups
  if (groupBy !== 'proyecto') {
    const all = []
    for (const list of tasksByWorkstream.values()) all.push(...list)
    groups = groupTasks(all, groupBy, { userById }).map((g) => ({ ...g, tasks: sortTasks(g.tasks, sort) }))
  } else {
    const real = filtersActive ? workstreams.filter((w) => (tasksByWorkstream.get(w.id) || []).length > 0) : workstreams
    groups = (real.length > 0 ? real : filtersActive ? [] : [{ ...GENERAL, name: emptyLabel }]).map((w) => ({ ...w, tasks: sortTasks((w.id && tasksByWorkstream.get(w.id)) || [], sort) }))
  }
  if (groups.length === 0) return <p className="rounded-[24px] bg-[#1C1C1E] px-5 py-8 text-center text-[14px] text-[#8E8E93]">Ninguna tarea coincide con los filtros.</p>
  return (
    <div className="flex flex-col gap-7">
      {groups.map((g) => (
        <Group key={g.id ?? g.name} group={g} workstreams={workstreams} workstreamById={workstreamById} userById={userById} actorUserId={actorUserId} actorName={actorName} onOpenTask={onOpenTask} />
      ))}
    </div>
  )
}
