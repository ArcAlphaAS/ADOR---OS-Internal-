import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  STATUSES,
  PRIORITIES,
  statusMeta,
  priorityMeta,
  isOverdue,
  isDueToday,
  isPendingFor,
  pickFocusTask,
  withTimeout,
  workstreamId as buildWorkstreamId,
} from '../../lib/workspace'
import { weekRange } from '../../lib/weeklySummary'
import { applyTaskUpdate, toggleTaskComplete, createTask, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'
import { LayersIcon, CheckCircleIcon, ListViewIcon, PlayIcon, FlagIcon, BriefcaseIcon } from '../icons'
import { PillCell, EstimationCell } from './TaskCells'

// A richer "Personal" landing page, built from a reference image the user
// shared — replaces the plain filtered Lista table with a real dashboard:
// summary stats, a "Mis proyectos" grid, a tabbed task table, and a right
// rail. Lives only inside Lista's onlyMine scope (WorkspaceModule.jsx
// swaps it in for ListaView when view==='lista' && onlyMine) — Kanban/
// Timeline keep filtering as before, unchanged.
//
// Deliberately trimmed from the reference in three places, judgment calls
// made building this rather than re-asked: no per-task duration field (same
// "don't fabricate what we don't have" rule as everywhere else — Estimación
// is a date range, not minutes), no "Calendario de hoy" card in the rail
// (would mean a second independent useGoogleCalendar connection alongside
// Calendario's own — real fragility risk for a first pass, not worth it
// yet), and "Acciones rápidas" trimmed to the one action that isn't already
// one click away via the visible "+ Agregar tarea" row.

const ROW_GRID = '28px minmax(160px,1.4fr) minmax(120px,1fr) 92px 120px 104px'

const TABS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'proximas', label: 'Próximas' },
  { id: 'sinFecha', label: 'Sin fecha' },
  { id: 'completadas', label: 'Completadas' },
]

function StatCard({ Icon, value, label }) {
  return (
    <div className="ador-glass ador-grain flex flex-1 items-center gap-3 rounded-2xl px-4 py-3.5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#1E5FAD]">
        <Icon size={16} />
      </span>
      <div>
        <p className="text-[20px] font-semibold leading-none text-[#F5F5F5]">{value}</p>
        <p className="mt-1 text-[11px] text-[#888888]">{label}</p>
      </div>
    </div>
  )
}

function ProjectCard({ workstream, total, pending, pct }) {
  const accent = workstream.kind === 'intervencion' ? '#1E5FAD' : '#B8860B'
  return (
    <div className="ador-glass ador-grain flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${accent}22`, color: accent }}>
          <BriefcaseIcon size={15} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-[#F5F5F5]">{workstream.name}</p>
          <p className="text-[11px] text-[#666666]">{workstream.kind === 'intervencion' ? 'Intervención' : 'Proyecto Interno'}</p>
        </div>
      </div>
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: accent }} />
        </div>
        <p className="mt-1.5 text-[11px] text-[#888888]">{pct}%</p>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[#888888]">
        <span>{total} tarea{total === 1 ? '' : 's'}</span>
        <span>{pending} pendiente{pending === 1 ? '' : 's'}</span>
      </div>
    </div>
  )
}

function PersonalTaskRow({ task, workstream, onOpen, actorUserId, actorName }) {
  const completed = task.status === 'completado'
  const showToast = useToast()

  const applyUpdate = (data) => {
    withTimeout(applyTaskUpdate(task, data, actorUserId, actorName)).catch((error) => showToast(`No se pudo guardar: ${error.message}`))
  }
  const toggle = (e) => {
    e.stopPropagation()
    withTimeout(toggleTaskComplete(task, actorName)).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  }

  return (
    <div
      onClick={() => onOpen(task)}
      className="grid cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.035]"
      style={{ gridTemplateColumns: ROW_GRID }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.82 }}
        onClick={toggle}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
        style={{ color: completed ? '#4CAF50' : '#444444' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {completed ? (
            <motion.span key="done" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
              <CheckCircleIcon size={17} />
            </motion.span>
          ) : (
            <motion.span key="empty" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.12 }} className="h-[15px] w-[15px] rounded-full border" style={{ borderColor: '#444444' }} />
          )}
        </AnimatePresence>
      </motion.button>

      <span className="min-w-0 truncate text-[13.5px] font-medium text-[#F5F5F5]" style={{ textDecoration: completed ? 'line-through' : 'none', opacity: completed ? 0.5 : 1 }}>
        {task.title}
      </span>

      <span className="truncate text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: workstream?.kind === 'intervencion' ? '#1E5FAD' : '#B8860B' }}>
        {workstream?.name || '—'}
      </span>

      <PillCell options={PRIORITIES} value={task.priority} meta={task.priority ? priorityMeta(task.priority) : null} emptyLabel="Prioridad" onChange={(id) => applyUpdate({ priority: id })} />

      <EstimationCell
        startDate={task.startDate?.toDate?.() || null}
        dueDate={task.dueDate?.toDate?.() || null}
        overdue={isOverdue(task)}
        dueToday={isDueToday(task)}
        onChangeStart={(date) => applyUpdate({ startDate: date })}
        onChangeDue={(date) => applyUpdate({ dueDate: date })}
      />

      <PillCell options={STATUSES} value={task.status} meta={statusMeta(task.status)} onChange={(id) => applyUpdate({ status: id })} />
    </div>
  )
}

function AddTaskRow({ workstreams, actorUserId, actorName, forceOpen, onOpenChange }) {
  const [adding, setAdding] = useState(false)
  const open = forceOpen || adding
  const [title, setTitle] = useState('')
  const [workstreamId, setWorkstreamId] = useState('')
  const [priority, setPriority] = useState('media')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const reset = () => {
    setTitle('')
    setWorkstreamId('')
    setPriority('media')
    setAdding(false)
    onOpenChange?.(false)
  }

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const targetId = workstreamId || (await findOrCreateGeneralProyecto(actorName).then((id) => buildWorkstreamId('proyecto', id)))
      await createTask({ title: title.trim(), workstreamId: targetId, assignedTo: [actorUserId], priority, status: 'por_hacer' }, actorName, actorUserId)
      reset()
    } catch (error) {
      showToast(`No se pudo crear la tarea: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-[13px] text-[#444444] transition-colors duration-150 hover:bg-white/[0.03] hover:text-[#888888]">
        <span className="text-[15px] leading-none">+</span> Agregar tarea
      </button>
    )
  }

  return (
    <div className="grid items-center gap-3 rounded-lg px-2 py-2" style={{ gridTemplateColumns: ROW_GRID }} onKeyDown={(e) => e.key === 'Escape' && reset()}>
      <span />
      <input
        autoFocus
        type="text"
        disabled={saving}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={saving ? 'Guardando...' : 'Título — Enter para guardar'}
        className="min-w-0 rounded-lg border border-white/[0.14] bg-[#141414] px-2.5 py-1.5 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-[#1E5FAD]/50 disabled:opacity-50"
      />
      <select
        value={workstreamId}
        onChange={(e) => setWorkstreamId(e.target.value)}
        className="min-w-0 rounded-lg border border-white/[0.14] bg-[#141414] px-2 py-1.5 text-[12px] text-[#F5F5F5] outline-none"
      >
        <option value="">General</option>
        {workstreams.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      <PillCell options={PRIORITIES} value={priority} meta={priorityMeta(priority)} onChange={setPriority} />
      <span />
      <span />
    </div>
  )
}

export default function PersonalOverview({ user, tasks, workstreams, workstreamById, onOpenTask, actorUserId, actorName, onToggleOnlyMine }) {
  const [tab, setTab] = useState('hoy')
  const [addingTask, setAddingTask] = useState(false)

  const mine = tasks.filter((t) => (t.assignedTo || []).includes(user?.uid) && !isPendingFor(t, user?.uid))
  const openMine = mine.filter((t) => t.status !== 'completado')
  const { start, end } = weekRange()
  const completedThisWeek = mine.filter((t) => {
    const c = t.completedAt?.toDate?.()
    return c && c >= start && c <= end
  })

  const activeWorkstreamIds = new Set(openMine.map((t) => t.workstreamId))
  const projectCards = workstreams
    .filter((w) => activeWorkstreamIds.has(w.id))
    .map((w) => {
      const wsTasks = mine.filter((t) => t.workstreamId === w.id)
      const completed = wsTasks.filter((t) => t.status === 'completado').length
      return { workstream: w, total: wsTasks.length, pending: wsTasks.length - completed, pct: wsTasks.length ? Math.round((completed / wsTasks.length) * 100) : 0 }
    })

  const vencidas = openMine.filter(isOverdue)
  const hoy = openMine.filter((t) => isDueToday(t) && !isOverdue(t))
  const proximas = openMine.filter((t) => t.dueDate && !isOverdue(t) && !isDueToday(t))
  const sinFecha = openMine.filter((t) => !t.dueDate)
  const completadas = mine.filter((t) => t.status === 'completado').sort((a, b) => (b.completedAt?.toDate?.() || 0) - (a.completedAt?.toDate?.() || 0))

  const rows = { hoy: [...vencidas, ...hoy], proximas, sinFecha, completadas }[tab]

  const focusTask = pickFocusTask(vencidas, hoy, [...proximas, ...sinFecha])
  const totalWeek = openMine.length + completedThisWeek.length
  const pctWeek = totalWeek ? Math.round((completedThisWeek.length / totalWeek) * 100) : 0

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap gap-3">
          <StatCard Icon={LayersIcon} value={projectCards.length} label="Proyectos activos" />
          <StatCard Icon={ListViewIcon} value={openMine.length} label="Tareas pendientes" />
          <StatCard Icon={CheckCircleIcon} value={completedThisWeek.length} label="Completadas esta semana" />
        </div>

        {projectCards.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#F5F5F5]">Mis proyectos</span>
              <button type="button" onClick={onToggleOnlyMine} className="text-[12px] font-medium text-[#1E5FAD] hover:underline">
                Ver todos →
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projectCards.map(({ workstream, ...stats }) => (
                <ProjectCard key={workstream.id} workstream={workstream} {...stats} />
              ))}
            </div>
          </div>
        )}

        <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
          <div className="flex items-center gap-1 border-b border-white/[0.06] px-3 pt-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="rounded-t-lg px-3 pb-2.5 text-[13px] font-medium transition-colors duration-150"
                style={{ color: tab === t.id ? '#F5F5F5' : '#888888', borderBottom: tab === t.id ? '2px solid #1E5FAD' : '2px solid transparent' }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04] px-3 py-2">
            {rows.length === 0 && !(tab === 'hoy' && !addingTask) && <p className="px-2 py-4 text-[13px] text-[#444444]">Nada aquí.</p>}
            {rows.map((task) => (
              <PersonalTaskRow key={task.id} task={task} workstream={workstreamById[task.workstreamId]} onOpen={onOpenTask} actorUserId={actorUserId} actorName={actorName} />
            ))}
            {tab !== 'completadas' && (
              <div className="pt-1">
                <AddTaskRow workstreams={workstreams} actorUserId={actorUserId} actorName={actorName} forceOpen={addingTask} onOpenChange={setAddingTask} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="ador-glass ador-grain rounded-2xl p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[#888888]">Enfoque actual</p>
          {focusTask ? (
            <>
              <p className="truncate text-[14px] font-semibold text-[#F5F5F5]">{focusTask.title}</p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-[#666666]">
                <span>{workstreamById[focusTask.workstreamId]?.name}</span>
                {focusTask.priority && (
                  <span className="flex items-center gap-1" style={{ color: priorityMeta(focusTask.priority).color }}>
                    <FlagIcon size={10} /> {priorityMeta(focusTask.priority).label}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenTask(focusTask)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2 text-[13px] font-medium text-[#F5F5F5] transition-opacity duration-150 hover:opacity-90"
                style={{ background: '#1E5FAD' }}
              >
                <PlayIcon size={12} /> Continuar
              </button>
            </>
          ) : (
            <p className="text-[13px] text-[#666666]">Nada urgente — buen momento para adelantar algo de tu lista.</p>
          )}
        </div>

        <div className="ador-glass ador-grain rounded-2xl p-4">
          <p className="mb-3 text-[13px] font-semibold text-[#F5F5F5]">Progreso semanal</p>
          <div className="flex items-center gap-4">
            <svg width="64" height="64" viewBox="0 0 64 64" className="flex-shrink-0 -rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="#1E5FAD"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 26}
                strokeDashoffset={2 * Math.PI * 26 * (1 - pctWeek / 100)}
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>
            <div>
              <p className="text-[20px] font-semibold text-[#F5F5F5]">{pctWeek}%</p>
              <p className="text-[11px] text-[#888888]">
                {totalWeek} totales · {openMine.length} pendientes · {completedThisWeek.length} completadas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
