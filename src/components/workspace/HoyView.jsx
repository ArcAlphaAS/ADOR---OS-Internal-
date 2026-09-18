import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  isOverdue,
  isDueToday,
  isCompletedToday,
  isPendingFor,
  withTimeout,
  PRIORITIES,
  priorityMeta,
  STATUSES,
  statusMeta,
  pickFocusTask,
  dailyQuote,
  PROJECT_TASK_ROW_GRID,
  workstreamId as buildWorkstreamId,
} from '../../lib/workspace'
import { CATEGORIES, suggestCategory } from '../../lib/notes'
import { createNote, updateNote, deleteNote, createTask, applyTaskUpdate, toggleTaskComplete, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { CloseIcon, CheckCircleIcon, CalendarIcon, ListViewIcon, ChevronDownIcon, FlagIcon, PlayIcon } from '../icons'
import { useToast } from '../../hooks/useToast'
import { PillCell, EstimationCell, DescriptionCell, AssigneeCell, WorkstreamCell } from './TaskCells'
import { MiniCalendar, ProgressDonut, ObjetivoSemanaCard, QuickActionsCard } from './HoyRightRail'
import ProjectTaskRow from './ProjectTaskRow'

// The landing screen for Workspace — added 2026-09-16 after direct feedback
// that opening on "Todo" (every Intervención/Proyecto) made the module read
// as a team database, not somewhere you'd actually start your day. Modeled
// on Sunsama/Akiflow's "today first" philosophy rather than Linear's
// backlog-triage model: at 3 founders, the daily question isn't "what's in
// the queue" but "what's mine, and what's late."
//
// Folded Notas into this view the same day, right after — direct feedback
// that a separate "Notas" tab felt redundant with "Hoy": both were already
// "your personal daily space," just split across two clicks. Capturing and
// triaging now happen on the same screen. Reviewed/archived notes are
// intentionally not shown here — they're done, and Hoy is about what still
// needs you.
//
// Gained a real "Mis Pendientes" section + inline add the same week, after
// the user asked for a place to see "lo que tengo pendiente" and add to it
// himself, separate from Vencidas/Para hoy (which are strictly date-driven).
// A task assigned to someone *other* than yourself here goes through
// AssignmentConfirmGate.jsx's blocking accept/reject popup before it counts
// as theirs — see lib/firestore.js's createTask/applyTaskUpdate and CLAUDE.md
// §20 for the full mechanism.
//
// Redesigned 2026-09-17 from a reference image the user shared — a header
// with a rotating daily quote + live stats, a highlighted "Enfoque actual"
// card, a new "Completado hoy" section, and a right rail (mini calendar,
// day-progress donut, the North Star objetivo reframed as "Objetivo de la
// semana", and a small functional Quick Actions list). Three things from
// the reference were explicitly scoped out after discussion: no focus-
// timer/pomodoro logic behind "Iniciar enfoque" (just opens the highlighted
// task), no per-task duration-in-minutes field (nothing to derive it from
// yet), and no keyboard shortcuts on Quick Actions. The existing Vencidas/
// Para hoy/Mis Pendientes split (a deliberate, previously-debated
// information architecture — see §19-21) was kept, since each bucket
// answers a genuinely different question.
//
// Rows switched from compact checklist-style (a lighter alternative to
// Lista's full grid) to the same full-column ProjectTaskRow that Personal
// and Grupo use — per direct request that all three read as the same kind
// of table, reversing the earlier "Hoy is lighter than Lista" simplification
// from the first pass. ProjectTaskRow.jsx is shared with PersonalOverview.jsx
// (both need a Proyecto column, since neither is grouped by workstream the
// way Grupo/Lista is).

function NoteCard({ note, actorName, onArchive, onDelete }) {
  const [converting, setConverting] = useState(false)
  const showToast = useToast()
  const meta = CATEGORIES[note.category] || CATEGORIES.nota

  const convertToTask = async () => {
    setConverting(true)
    try {
      const proyectoId = await findOrCreateGeneralProyecto(actorName)
      await createTask(
        { title: note.text, workstreamId: buildWorkstreamId('proyecto', proyectoId), status: 'por_hacer', priority: 'media', assignedTo: [] },
        actorName
      )
      await updateNote(note.id, { status: 'archivada', category: 'tarea' })
      showToast('Tarea creada en General')
    } catch (error) {
      showToast(`No se pudo crear la tarea: ${error.message}`)
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="ador-glass ador-grain flex items-start justify-between gap-3 rounded-xl px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-relaxed text-[#F5F5F5]">{note.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${meta.color}1F`, color: meta.color }}>
            {meta.label}
            {meta.module ? ` → ${meta.module}` : ''}
          </span>
          {note.category === 'tarea' && (
            <button
              type="button"
              onClick={convertToTask}
              disabled={converting}
              className="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10 disabled:opacity-50"
              style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
            >
              {converting ? 'Creando…' : '+ Crear tarea'}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onArchive(note.id)}
          title="Revisada"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#4CAF50]"
        >
          <CheckCircleIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(note.id)}
          title="Eliminar"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#E05252]"
        >
          <CloseIcon size={12} />
        </button>
      </div>
    </div>
  )
}

// Single-line capture, always visible at the top of Hoy — the in-place
// twin of GlobalCapture.jsx's floating "+" modal (same createNote() call,
// same keyword categorizer), so jotting something down doesn't require
// leaving the screen you're already looking at. `inputRef` lets the Quick
// Actions rail focus this from anywhere on the page.
function QuickCapture({ user, actorName, inputRef }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await createNote({ text: trimmed, category: suggestCategory(trimmed), authorId: user?.uid || null }, actorName)
      setText('')
    } catch (error) {
      showToast(`No se pudo guardar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ador-glass ador-grain flex items-center gap-2 rounded-xl px-4 py-1">
      <input
        ref={inputRef}
        type="text"
        value={text}
        disabled={saving}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="¿Qué necesitas hacer? — Enter para guardar"
        className="min-w-0 flex-1 bg-transparent py-3 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none disabled:opacity-50"
      />
    </div>
  )
}

// The header block — title, full date, a daily rotating quote (same
// stable-per-day seed pattern as Home's GreetingBlock), and a live stats
// line summarizing the whole day (open + completed, with a color-coded
// status word instead of a bare count).
function HoyHeader({ total, completedCount, overdueCount }) {
  const dateLabel = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  const statusLabel = overdueCount > 0 ? `${overdueCount} atrasada${overdueCount === 1 ? '' : 's'}` : 'Todo al día'
  const statusColor = overdueCount > 0 ? '#EF5350' : '#4CAF50'

  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-[#F5F5F5]">Hoy</h1>
        <p className="mt-0.5 text-[13px] capitalize text-[#888888]">{dateLabel}</p>
        <p className="mt-2 text-[12px] text-[#666666]">
          {total} tarea{total === 1 ? '' : 's'} · {completedCount} completada{completedCount === 1 ? '' : 's'} ·{' '}
          <span style={{ color: statusColor }}>{statusLabel}.</span>
        </p>
      </div>
      <p className="hidden max-w-[220px] text-right text-[13px] italic leading-relaxed text-[#666666] md:block">
        "{dailyQuote()}"
        <span className="mt-1 block text-[11px] not-italic text-[#444444]">— ADOR OS</span>
      </p>
    </div>
  )
}

// "Enfoque actual" — a highlighted card for the single most urgent open
// task (see pickFocusTask in lib/workspace.js), not a timer/pomodoro
// feature (deliberately scoped out, see file header). "Iniciar enfoque"
// just opens that task's detail panel — the point is reducing "what should
// I look at first" to zero clicks, not tracking time spent. Always renders,
// even with nothing urgent — same "a landing screen should never just
// disappear" rule NorthStarHero.jsx already established (CLAUDE.md §14):
// a calm positive state here beats the card silently vanishing.
function FocusCard({ task, workstream, onStartFocus }) {
  if (!task) {
    return (
      <div className="ador-glass ador-grain flex items-center gap-3 rounded-2xl px-5 py-4">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#4CAF50]/15 text-[#4CAF50]">
          <CheckCircleIcon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#888888]">Enfoque actual</p>
          <p className="text-[13px] text-[#F5F5F5]">Nada urgente en este momento — buen momento para avanzar algo de Mis Pendientes.</p>
        </div>
      </div>
    )
  }
  const meta = task.priority ? priorityMeta(task.priority) : null

  return (
    <div className="ador-glass ador-grain flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1E5FAD]/20 text-[#1E5FAD]">
          <ListViewIcon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#888888]">Enfoque actual</p>
          <p className="truncate text-[15px] font-semibold text-[#F5F5F5]">{task.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#666666]">
            {workstream && <span>{workstream.name}</span>}
            {meta && (
              <span className="flex items-center gap-1" style={{ color: meta.color }}>
                <FlagIcon size={10} /> {meta.label}
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onStartFocus(task)}
        className="flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-[#F5F5F5] transition-opacity duration-150 hover:opacity-90"
        style={{ background: '#1E5FAD' }}
      >
        <PlayIcon size={12} /> Iniciar enfoque
      </button>
    </div>
  )
}

// "Modo enfoque" — a full-screen takeover for the single task "Iniciar
// enfoque" surfaces, so the click actually changes what's on screen instead
// of just opening the same detail panel a title-click already reaches.
// Deliberately not a timer/pomodoro (see FocusCard's comment above and
// CLAUDE.md §26 — that was scoped out on purpose): this just removes every
// other distraction from view and gives one clear next action. Follows the
// same portal + split transform/surface pattern as every other modal in the
// app (CLAUDE.md §11) — the backdrop owns the transform, the inner div owns
// .ador-modal-surface's backdrop-filter.
function FocusModeOverlay({ task, workstream, actorName, onClose, onOpenDetail }) {
  const [completing, setCompleting] = useState(false)
  const showToast = useToast()
  if (!task) return null
  const meta = task.priority ? priorityMeta(task.priority) : null

  const complete = async () => {
    setCompleting(true)
    try {
      await withTimeout(toggleTaskComplete(task, actorName))
      onClose()
    } catch (error) {
      showToast(`No se pudo completar: ${error.message}`)
    } finally {
      setCompleting(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[16px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] px-6"
      >
        <div className="ador-modal-surface ador-grain rounded-[28px] px-8 py-10 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">Modo enfoque</p>

          <div className="mt-6 flex flex-col items-center gap-3">
            {meta && (
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: `${meta.color}22`, color: meta.color }}>
                <FlagIcon size={11} /> {meta.label}
              </span>
            )}
            <h2 className="text-[24px] font-semibold leading-tight text-[#F5F5F5]">{task.title}</h2>
            {workstream && <p className="text-[13px] text-[#888888]">{workstream.name}</p>}
            {task.description && <p className="mt-2 max-w-[380px] text-[13px] leading-relaxed text-[#888888]">{task.description}</p>}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <motion.button
              type="button"
              disabled={completing}
              onClick={complete}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-[14px] font-semibold text-[#F5F5F5] transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
              style={{ background: '#1E5FAD' }}
            >
              <CheckCircleIcon size={16} /> {completing ? 'Completando...' : 'Marcar como completada'}
            </motion.button>
            <div className="flex items-center gap-4 text-[13px]">
              <button type="button" onClick={() => onOpenDetail(task)} className="text-[#888888] transition-colors hover:text-[#F5F5F5]">
                Ver detalles
              </button>
              <span className="text-[#333333]">·</span>
              <button type="button" onClick={onClose} className="text-[#888888] transition-colors hover:text-[#F5F5F5]">
                Salir del enfoque
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

const COLUMN_HEADERS = ['', 'Tarea', 'Proyecto', 'Descripción', 'Asignado', 'Prioridad', 'Estimación', 'Estado']

function SectionIcon({ Icon, color }) {
  return (
    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" style={{ background: color, color: '#F5F5F5' }}>
      <Icon size={13} />
    </span>
  )
}

// Collapsible — a small chevron next to the count, matching the reference's
// "click the header to fold a group" behavior. Defaults open; state is
// local and doesn't persist, same as Lista's/Kanban's own transient UI state.
function Section({ title, color, Icon, tasks, onOpenTask, actorName, actorUserId, userById, users, workstreamById, onReschedule, headerAction, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  if (tasks.length === 0 && !children) return null
  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left">
        <div className="flex items-center gap-2.5">
          <ChevronDownIcon size={13} className="text-[#444444] transition-transform duration-150" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          <SectionIcon Icon={Icon} color={color} />
          <span className="text-[14px] font-semibold" style={{ color }}>
            {title}
          </span>
          {tasks.length > 0 && <span className="text-[12px] text-[#444444]">{tasks.length}</span>}
        </div>
        {headerAction && <div onClick={(e) => e.stopPropagation()}>{headerAction}</div>}
      </button>
      {open && (
        <div className="overflow-x-auto px-3 pb-3">
          <div style={{ minWidth: 760 }}>
            {tasks.length > 0 && (
              <div className="grid gap-3 border-b border-white/[0.06] px-2 pb-1.5 pt-1" style={{ gridTemplateColumns: PROJECT_TASK_ROW_GRID }}>
                {COLUMN_HEADERS.map((h, i) => (
                  <span key={h || i} className="font-medium text-[#444444]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {h}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-col divide-y divide-white/[0.04]">
              {tasks.map((task) => (
                <ProjectTaskRow
                  key={task.id}
                  task={task}
                  workstream={workstreamById[task.workstreamId]}
                  userById={userById}
                  users={users}
                  onOpen={onOpenTask}
                  actorUserId={actorUserId}
                  actorName={actorName}
                  onReschedule={onReschedule}
                />
              ))}
            </div>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// Personal quick-add for "Mis Pendientes" — deliberately trimmed down from
// Lista's InlineAddTask (no descripción/estado toggle): title, an optional
// due date, and who's on it. Controlled from the parent (`adding`/
// `onOpenChange`) so the right rail's "Nueva tarea" Quick Action can open it
// from anywhere on the page, not just its own "+" button.
function AddPendiente({ actorUserId, actorName, userById, users, workstreams = [], adding, onOpenChange }) {
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [workstreamId, setWorkstreamId] = useState('')
  const [assignedTo, setAssignedTo] = useState(actorUserId ? [actorUserId] : [])
  const [priority, setPriority] = useState('media')
  const [status, setStatus] = useState('por_hacer')
  const [startDate, setStartDate] = useState(null)
  const [dueDate, setDueDate] = useState(null)
  const showToast = useToast()

  const reset = () => {
    setTitle('')
    setDescription('')
    setWorkstreamId('')
    setAssignedTo(actorUserId ? [actorUserId] : [])
    setPriority('media')
    setStatus('por_hacer')
    setStartDate(null)
    setDueDate(null)
    onOpenChange(false)
  }

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const targetId = workstreamId || (await findOrCreateGeneralProyecto(actorName).then((id) => buildWorkstreamId('proyecto', id)))
      await createTask(
        {
          title: title.trim(),
          description: description.trim(),
          workstreamId: targetId,
          assignedTo,
          priority,
          status,
          startDate,
          dueDate,
        },
        actorName,
        actorUserId
      )
      reset()
    } catch (error) {
      showToast(`No se pudo crear el pendiente: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-[13px] text-[#444444] transition-colors duration-150 hover:bg-white/[0.03] hover:text-[#888888]"
      >
        <span className="text-[15px] leading-none">+</span> Agregar pendiente
      </button>
    )
  }

  return (
    <div className="grid items-center gap-3 rounded-lg px-2 py-2" style={{ gridTemplateColumns: PROJECT_TASK_ROW_GRID }} onKeyDown={(e) => e.key === 'Escape' && reset()}>
      <span />
      <input
        autoFocus
        type="text"
        disabled={saving}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={saving ? 'Guardando...' : 'Qué tienes pendiente — Enter para guardar'}
        className="min-w-0 rounded-lg border border-white/[0.14] bg-[#141414] px-2.5 py-1.5 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-[#1E5FAD]/50 disabled:opacity-50"
      />
      <WorkstreamCell workstreams={workstreams} value={workstreamId} onChange={setWorkstreamId} />
      <DescriptionCell description={description} onChange={setDescription} />
      <AssigneeCell assignedTo={assignedTo} userById={userById} users={users} onChange={setAssignedTo} />
      <PillCell options={PRIORITIES} value={priority} meta={priorityMeta(priority)} onChange={setPriority} />
      <EstimationCell startDate={startDate} dueDate={dueDate} overdue={false} dueToday={false} onChangeStart={setStartDate} onChangeDue={setDueDate} />
      <PillCell options={STATUSES} value={status} meta={statusMeta(status)} onChange={setStatus} />
    </div>
  )
}

// A small reassurance line, not a full-page empty state — "Mis Pendientes"
// below always has something actionable (at minimum, its own "+ Agregar
// pendiente" row), so the page is never fully dead the way the old
// Vencidas/Para-hoy-only version could be.
function NadaUrgente() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4CAF50]" style={{ animation: 'ador-pulse 2.5s ease-in-out infinite' }} />
      <p className="text-[13px] text-[#444444]">Nada vencido, nada para hoy.</p>
    </div>
  )
}

export default function HoyView({ user, tasks, userId, userById, users, workstreams = [], workstreamById, onOpenTask, actorUserId, actorName, notes = [], onNavigate }) {
  const showToast = useToast()
  const [addingPendiente, setAddingPendiente] = useState(false)
  const [focusModeTask, setFocusModeTask] = useState(null)
  const noteInputRef = useRef(null)
  const pendientesRef = useRef(null)

  // Excludes anything still pending your own confirmation — see
  // lib/workspace.js's isPendingFor. It doesn't count as yours yet.
  const mine = tasks.filter((t) => (t.assignedTo || []).includes(userId) && !isPendingFor(t, userId) && t.status !== 'completado')
  const vencidas = mine.filter(isOverdue)
  const hoy = mine.filter((t) => isDueToday(t) && !isOverdue(t))
  const pendientes = mine.filter((t) => !isOverdue(t) && !isDueToday(t))
  const completedToday = tasks.filter((t) => (t.assignedTo || []).includes(userId) && isCompletedToday(t))
  const pendingNotes = notes.filter((n) => n.status !== 'archivada')

  const focusTask = pickFocusTask(vencidas, hoy, pendientes)

  const archiveNote = (id) => updateNote(id, { status: 'archivada' }).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  const deleteNoteById = (id) => deleteNote(id).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))

  const today = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }
  const rescheduleToday = (task) =>
    withTimeout(applyTaskUpdate(task, { dueDate: today() }, actorUserId, actorName)).catch((error) =>
      showToast(`No se pudo reprogramar: ${error.message}`)
    )
  const rescheduleAllVencidas = () => {
    vencidas.forEach((task) => rescheduleToday(task))
  }

  const focusNewTask = () => {
    setAddingPendiente(true)
    pendientesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const focusNewNote = () => {
    noteInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    noteInputRef.current?.focus()
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
      <div className="flex min-w-0 flex-col gap-5">
        <HoyHeader total={mine.length + completedToday.length} completedCount={completedToday.length} overdueCount={vencidas.length} />

        <QuickCapture user={user} actorName={actorName} inputRef={noteInputRef} />

        {pendingNotes.length > 0 && (
          <div className="flex flex-col gap-2">
            {pendingNotes.map((note) => (
              <NoteCard key={note.id} note={note} actorName={actorName} onArchive={archiveNote} onDelete={deleteNoteById} />
            ))}
          </div>
        )}

        <FocusCard task={focusTask} workstream={focusTask && workstreamById[focusTask.workstreamId]} onStartFocus={setFocusModeTask} />

        <AnimatePresence>
          {focusModeTask && (
            <FocusModeOverlay
              task={focusModeTask}
              workstream={workstreamById[focusModeTask.workstreamId]}
              actorName={actorName}
              onClose={() => setFocusModeTask(null)}
              onOpenDetail={(task) => {
                setFocusModeTask(null)
                onOpenTask(task)
              }}
            />
          )}
        </AnimatePresence>

        {vencidas.length === 0 && hoy.length === 0 && <NadaUrgente />}

        <Section
          title="Vencidas"
          color="#EF5350"
          Icon={CalendarIcon}
          tasks={vencidas}
          onOpenTask={onOpenTask}
          actorName={actorName}
          actorUserId={actorUserId}
          userById={userById}
          users={users}
          workstreamById={workstreamById}
          onReschedule={rescheduleToday}
          headerAction={
            vencidas.length > 1 && (
              <button
                type="button"
                onClick={rescheduleAllVencidas}
                className="whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 hover:bg-[#EF5350]/10"
                style={{ borderColor: '#EF5350', color: '#EF5350' }}
              >
                Mover todas a hoy
              </button>
            )
          }
        />
        <Section title="Para hoy" color="#1E5FAD" Icon={CalendarIcon} tasks={hoy} onOpenTask={onOpenTask} actorName={actorName} actorUserId={actorUserId} userById={userById} users={users} workstreamById={workstreamById} />
        <div ref={pendientesRef}>
          <Section title="Mis Pendientes" color="#888888" Icon={ListViewIcon} tasks={pendientes} onOpenTask={onOpenTask} actorName={actorName} actorUserId={actorUserId} userById={userById} users={users} workstreamById={workstreamById}>
            <div className="pt-1">
              <AddPendiente actorUserId={actorUserId} actorName={actorName} userById={userById} users={users} workstreams={workstreams} adding={addingPendiente} onOpenChange={setAddingPendiente} />
            </div>
          </Section>
        </div>

        <Section
          title="Completado"
          color="#4CAF50"
          Icon={CheckCircleIcon}
          tasks={completedToday}
          onOpenTask={onOpenTask}
          actorName={actorName}
          actorUserId={actorUserId}
          userById={userById}
          users={users}
          workstreamById={workstreamById}
        />
      </div>

      <div className="flex flex-col gap-4">
        <MiniCalendar />
        <ProgressDonut completed={completedToday.length} total={mine.length + completedToday.length} />
        <ObjetivoSemanaCard userId={userId} tasks={tasks} />
        <QuickActionsCard onNewTask={focusNewTask} onNewNote={focusNewNote} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
