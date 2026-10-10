import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createTask, createProyectoInterno, applyInterventionTemplate, subscribeInterventionTemplate } from '../../lib/firestore'
import {
  LAYERS,
  currentLayer,
  workstreamId as buildWorkstreamId,
  TASK_ROW_GRID,
  withTimeout,
  PRIORITIES,
  STATUSES,
  priorityMeta,
  workstreamHealth,
} from '../../lib/workspace'
import { ChevronDownIcon } from '../icons'
import { useToast } from '../../hooks/useToast'
import { PillCell, DueDateCell, TimelineCell, AssigneeCell } from './TaskCells'
import TaskRow from './TaskRow'
import { sortTasks, groupTasks } from '../../lib/workspaceFilters'

// Shown instead of a real workstream when there's nothing to group by yet —
// never persisted itself. The first task added through it silently
// provisions a real "General" Proyecto Interno and attaches the task there,
// so Workspace is usable from the very first click instead of gating
// everything behind "create a project first." Reused for the Personal
// filter's empty state too (label swapped to "Personal" via `emptyLabel`,
// same "General" storage underneath) — Todo already got this rich table
// treatment when empty; Personal used to fall back to a bare centered
// sentence instead, which read as a lesser, half-built version of the same
// screen. Now both look and behave like the same real system.
const GENERAL_WORKSTREAM = { id: null, kind: 'proyecto_interno', name: 'General' }

const COLUMN_HEADERS = ['', 'Tarea', 'Asignado', 'Prioridad', 'Vencimiento', 'Timeline', 'Estado']

function LayerIndicator({ week, totalWeeks }) {
  const active = currentLayer(week, totalWeeks)
  return (
    <div className="flex items-center gap-1.5">
      {LAYERS.map((name, i) => {
        const layerNum = i + 1
        const done = layerNum < active
        const isActive = layerNum === active
        return (
          <div
            key={name}
            title={name}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
            style={{
              background: done ? 'rgba(244,238,226,0.9)' : isActive ? 'transparent' : 'rgba(255,255,255,0.08)',
              border: isActive ? '1px solid #F4EEE2' : 'none',
              color: done ? '#0A0A0A' : isActive ? '#F4EEE2' : '#444444',
            }}
          >
            {isActive ? (
              <span className="h-1.5 w-1.5 rounded-full bg-[#F4EEE2]" style={{ animation: 'ador-pulse 2s ease-in-out infinite' }} />
            ) : (
              layerNum
            )}
          </div>
        )
      })}
    </div>
  )
}

function emptyDraft(actorUserId) {
  return { title: '', description: '', assignedTo: actorUserId ? [actorUserId] : [], priority: 'media', startDate: null, endDate: null, dueDate: null }
}

// Renders as a full grid row (same TASK_ROW_GRID as TaskRow) so Asignado,
// Prioridad, Estimación, and Descripción can each be set independently
// *before* the task exists — reusing the exact same cell components
// TaskRow uses, just against local draft state instead of a Firestore doc.
// Only the title input's Enter key saves; there's deliberately no onBlur
// auto-submit here, since clicking into any of the other cells (they're all
// separate popover triggers) would otherwise blur the title and submit
// early with whatever was typed so far.
function InlineAddTask({ workstreamId, actorUserId, actorName, userById, users }) {
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(() => emptyDraft(actorUserId))
  const showToast = useToast()

  const submit = async () => {
    if (!draft.title.trim()) return
    setSaving(true)
    try {
      let targetWorkstreamId = workstreamId
      if (!targetWorkstreamId) {
        const ref = await withTimeout(createProyectoInterno({ name: 'General' }, actorName))
        targetWorkstreamId = buildWorkstreamId('proyecto', ref.id)
      }
      await withTimeout(
        createTask(
          { ...draft, title: draft.title.trim(), description: draft.description.trim(), workstreamId: targetWorkstreamId },
          actorName,
          actorUserId
        )
      )
      setDraft(emptyDraft(actorUserId))
    } catch (error) {
      showToast(`No se pudo crear la tarea: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-[13px] text-[#444444] transition-colors duration-150 hover:bg-white/[0.03] hover:text-[#888888]"
      >
        <span className="text-[15px] leading-none">+</span> Agregar tarea
      </button>
    )
  }

  const firstStatus = STATUSES[0]

  return (
    <div
      className="grid items-center gap-3 rounded-lg px-2 py-2"
      style={{ gridTemplateColumns: TASK_ROW_GRID }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setDraft(emptyDraft(actorUserId))
          setAdding(false)
        }
      }}
    >
      <span className="h-[15px] w-[15px] flex-shrink-0 rounded-full border" style={{ borderColor: '#444444' }} />

      <input
        autoFocus
        type="text"
        disabled={saving}
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={saving ? 'Guardando...' : 'Título de la tarea — Enter para guardar'}
        className="min-w-0 rounded-lg border border-white/[0.14] bg-[#141414] px-2.5 py-1.5 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-white/30 disabled:opacity-50"
      />

      <AssigneeCell
        assignedTo={draft.assignedTo}
        userById={userById}
        users={users}
        onChange={(next) => setDraft((d) => ({ ...d, assignedTo: next }))}
      />

      <PillCell
        options={PRIORITIES}
        value={draft.priority}
        meta={priorityMeta(draft.priority)}
        onChange={(id) => setDraft((d) => ({ ...d, priority: id }))}
      />

      <DueDateCell dueDate={draft.dueDate} overdue={false} dueToday={false} onChange={(date) => setDraft((d) => ({ ...d, dueDate: date }))} />

      <TimelineCell
        startDate={draft.startDate}
        endDate={draft.endDate}
        onChangeStart={(date) => setDraft((d) => ({ ...d, startDate: date }))}
        onChangeEnd={(date) => setDraft((d) => ({ ...d, endDate: date }))}
      />

      <span
        className="w-fit rounded-full px-2.5 py-1 text-[11px] font-medium"
        style={{ background: `${firstStatus.color}22`, color: firstStatus.color }}
      >
        {firstStatus.label}
      </span>
    </div>
  )
}

function WorkstreamGroup({ workstream, allWorkstreams = [], tasks, userById, users, onOpenTask, actorUserId, actorName, selectMode, selectedIds, onToggleSelect }) {
  const [collapsed, setCollapsed] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const completedCount = tasks.filter((t) => t.status === 'completado').length
  const pct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const showToast = useToast()
  const [template, setTemplate] = useState(null)
  const [applying, setApplying] = useState(false)
  const canApplyTemplate = workstream.kind === 'intervencion' && !workstream.templateApplied
  useEffect(() => {
    if (!canApplyTemplate) return
    return subscribeInterventionTemplate(setTemplate)
  }, [canApplyTemplate])
  const templateHasTasks = Object.values(template?.layers || {}).some((l) => l.some((t) => t.title?.trim()))
  const applyTemplate = async () => {
    setApplying(true)
    try {
      const r = await withTimeout(applyInterventionTemplate(workstream.clientId, actorName), 20000)
      showToast(r.applied ? `Plantilla aplicada: ${r.applied} tareas creadas.` : 'La plantilla está vacía o ya se aplicó.')
    } catch (e) {
      showToast(`No se pudo aplicar la plantilla: ${e.message}`)
    } finally {
      setApplying(false)
    }
  }
  const virtual = workstream.kind === 'virtual' // grouped by estado/prioridad/responsable, not a real project
  // Finished tasks fold into one quiet line ("N completadas · ver") so the list
  // shows what is still open, but what was done stays one click away.
  const openTasks = virtual ? tasks : tasks.filter((t) => t.status !== 'completado')
  const doneTasks = virtual
    ? []
    : tasks.filter((t) => t.status === 'completado').sort((a, b) => (b.completedAt?.toMillis?.() || 0) - (a.completedAt?.toMillis?.() || 0))
  const accent = virtual ? workstream.accent : workstream.kind === 'intervencion' ? '#1E5FAD' : '#B8860B'
  // Real, live-derived status pill (never a manually-set field) — see
  // workstreamHealth's own comment for the reference this was adapted from.
  const health = workstreamHealth(tasks)

  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-l-2 px-5 py-3.5" style={{ borderColor: accent }}>
        <button type="button" onClick={() => setCollapsed((v) => !v)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <ChevronDownIcon
            size={14}
            className="flex-shrink-0"
            style={{ color: '#444444', transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms ease-out' }}
          />
          {/* min-w-0 + truncate is the element that gives ground when the row
              runs out of space — without it, flexbox's default min-width:auto
              on this span forces the fixed-size badge/progress siblings below
              to wrap mid-word instead (confirmed via getBoundingClientRect at
              narrow widths: the badge wraps to "PROYECTO"/"INTERNO" the moment
              the progress stat is also present). The title is the one thing
              here that's fine to ellipsize; the badge and stat never should. */}
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#F5F5F5]">{workstream.name}</span>
          {tasks.length > 0 && (
            <span className="flex-shrink-0 whitespace-nowrap text-[12px] text-[#444444]">
              {completedCount} de {tasks.length} completadas
            </span>
          )}
          <span
            className="flex-shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-medium"
            style={{
              fontSize: 10,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: accent,
              background: `${accent}1F`,
            }}
          >
            {virtual ? 'Grupo' : workstream.kind === 'intervencion' ? 'Intervención' : 'Proyecto Interno'}
          </span>
          {/* Salud del proyecto — adapted from a project-pipeline reference
              the user shared (colored Schedule/Budget Health columns), but
              computed live from real overdue tasks rather than a manual
              status field, matching this project's "never a hand-entered
              cross-module signal" rule (§7 in CLAUDE.md and everywhere else). */}
          {health && (
            <span className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 font-medium" style={{ fontSize: 10, color: health.color, background: `${health.color}1A` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: health.color }} />
              {health.label}
            </span>
          )}
        </button>
        {workstream.kind === 'intervencion' && (
          <span className="flex-shrink-0 text-[11px] text-[#888888]">
            Semana {workstream.interventionWeek} de {workstream.interventionTotalWeeks}
          </span>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="relative h-[3px] w-full overflow-visible" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
          {/* The small scrubber dot at the progress edge is the one detail
              borrowed directly from the widget reference — it's what turns a
              flat fill bar into something that reads as "a position on a
              track," not just a percentage. */}
          <span
            className="absolute top-1/2 h-2.5 w-2.5 rounded-full border-2 border-[#000000]"
            style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)', background: accent }}
          />
        </div>
      )}

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {/* The "En curso" badge that used to sit here was a hardcoded
                string, never actually reflecting whether the Intervención
                was on track — the real, live status now lives in the header
                as the Salud pill above. Kept just the layer indicator. */}
            {workstream.kind === 'intervencion' && (
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
                <LayerIndicator week={workstream.interventionWeek} totalWeeks={workstream.interventionTotalWeeks} />
              </div>
            )}

            {canApplyTemplate && templateHasTasks && (
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
                <p className="min-w-0 flex-1 text-[12px] leading-snug text-[#888888]">Esta Intervención no tiene las tareas de la metodología.</p>
                <button type="button" onClick={applyTemplate} disabled={applying} className="flex-shrink-0 rounded-lg border border-white/30 px-3 py-1.5 text-[12px] font-medium text-[#F4EEE2] transition-colors hover:bg-white/10 disabled:opacity-50">
                  {applying ? 'Aplicando…' : 'Aplicar plantilla'}
                </button>
              </div>
            )}

            <div className="overflow-x-auto px-3 pb-3">
              <div style={{ minWidth: 780 }}>
                <div className="grid gap-3 border-b border-white/[0.06] px-2 pb-1.5 pt-3" style={{ gridTemplateColumns: TASK_ROW_GRID }}>
                  {COLUMN_HEADERS.map((h, i) => (
                    <span
                      key={h || i}
                      className="font-medium text-[#444444]"
                      style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col divide-y divide-white/[0.04]">
                  {openTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      userById={userById}
                      users={users}
                      workstreams={allWorkstreams}
                      onOpen={onOpenTask}
                      actorUserId={actorUserId}
                      actorName={actorName}
                      selectMode={selectMode}
                      selected={selectedIds?.has(task.id)}
                      onSelect={onToggleSelect}
                    />
                  ))}
                </div>

                {doneTasks.length > 0 && (
                  <div className="border-t border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => setShowDone((v) => !v)}
                      className="flex w-full items-center gap-2 px-2 py-2.5 text-left text-[12px] text-[#767676] transition-colors hover:text-[#C9C9C9]"
                    >
                      <ChevronDownIcon size={12} style={{ transform: showDone ? 'none' : 'rotate(-90deg)', transition: 'transform 150ms ease-out' }} />
                      <span className="text-[#4CAF50]">✓</span>
                      {doneTasks.length} completada{doneTasks.length === 1 ? '' : 's'}
                      <span className="text-[#5A5A5A]">· {showDone ? 'ocultar' : 'ver'}</span>
                    </button>
                    {showDone && (
                      <div className="flex flex-col divide-y divide-white/[0.04]">
                  {doneTasks.map((task) => (
                    <div key={task.id} className="opacity-60 transition-opacity hover:opacity-100">
                    <TaskRow
                      key={task.id}
                      task={task}
                      userById={userById}
                      users={users}
                      workstreams={allWorkstreams}
                      onOpen={onOpenTask}
                      actorUserId={actorUserId}
                      actorName={actorName}
                      selectMode={selectMode}
                      selected={selectedIds?.has(task.id)}
                      onSelect={onToggleSelect}
                    />
                    </div>
                  ))}
                      </div>
                    )}
                  </div>
                )}

                {!virtual && (
                  <div className="pt-1">
                    <InlineAddTask
                      workstreamId={workstream.id}
                      actorUserId={actorUserId}
                      actorName={actorName}
                      userById={userById}
                      users={users}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ListaView({
  workstreams,
  tasksByWorkstream,
  userById,
  users,
  onOpenTask,
  actorUserId,
  actorName,
  emptyLabel = 'General',
  sort,
  groupBy = 'proyecto',
  filtersActive = false,
  selectMode = false,
  selectedIds,
  onToggleSelect,
}) {
  // Grouped by project (default): one group per Intervención/Proyecto. Any
  // other grouping builds virtual groups from the same (already filtered)
  // tasks. With filters on, empty groups are hidden instead of showing a
  // lonely "+ Agregar tarea".
  let groups
  if (groupBy !== 'proyecto') {
    const all = []
    for (const list of tasksByWorkstream.values()) all.push(...list)
    groups = groupTasks(all, groupBy, { userById }).map((g) => ({ ...g, tasks: sortTasks(g.tasks, sort) }))
  } else {
    const real = filtersActive ? workstreams.filter((w) => (tasksByWorkstream.get(w.id) || []).length > 0) : workstreams
    groups = (real.length > 0 ? real : filtersActive ? [] : [{ ...GENERAL_WORKSTREAM, name: emptyLabel }]).map((w) => ({ ...w, tasks: sortTasks((w.id && tasksByWorkstream.get(w.id)) || [], sort) }))
  }

  if (groups.length === 0) {
    return <p className="rounded-2xl border border-dashed border-white/[0.1] px-6 py-10 text-center text-[13px] text-[#777777]">Ninguna tarea coincide con los filtros. Cambia o quita alguno para ver más.</p>
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((w) => (
        <WorkstreamGroup
          key={w.id ?? 'general'}
          workstream={w}
          allWorkstreams={workstreams}
          tasks={w.tasks}
          userById={userById}
          users={users}
          onOpenTask={onOpenTask}
          actorUserId={actorUserId}
          actorName={actorName}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  )
}
