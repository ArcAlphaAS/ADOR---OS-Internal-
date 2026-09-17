import { useState } from 'react'
import { isOverdue, isDueToday, isPendingFor, withTimeout, PRIORITIES, priorityMeta, workstreamId as buildWorkstreamId } from '../../lib/workspace'
import { CATEGORIES, suggestCategory } from '../../lib/notes'
import { createNote, updateNote, deleteNote, createTask, applyTaskUpdate, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { CloseIcon, CheckCircleIcon } from '../icons'
import { useToast } from '../../hooks/useToast'
import { PillCell, EstimationCell, AssigneeCell } from './TaskCells'
import TaskRow from './TaskRow'

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
// leaving the screen you're already looking at.
function QuickCapture({ user, actorName }) {
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
        type="text"
        value={text}
        disabled={saving}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Anota algo — tarea, idea, lo del día — Enter para guardar"
        className="min-w-0 flex-1 bg-transparent py-3 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none disabled:opacity-50"
      />
    </div>
  )
}

// Same row the team views use (same inline-editable cells), with a small
// workstream tag layered above the title — Hoy mixes tasks from every
// Intervención/Proyecto, so without it a task reads with no context about
// which piece of work it belongs to. `onReschedule` (Vencidas only) adds a
// one-click "→ Hoy" pill next to that tag — the "alguna forma de
// reorganizarlos" the user asked for, Things 3/Reminders-style: reschedule
// is a single tap, not a trip through the date popover.
function HoyTaskRow({ task, workstream, onReschedule, ...rest }) {
  return (
    <div className="pt-2.5 first:pt-3">
      {(workstream || onReschedule) && (
        <div className="mb-1 ml-[36px] flex items-center gap-2">
          {workstream && (
            <span className="w-fit text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: workstream.kind === 'intervencion' ? '#1E5FAD' : '#B8860B' }}>
              {workstream.name}
            </span>
          )}
          {onReschedule && (
            <button
              type="button"
              onClick={() => onReschedule(task)}
              className="rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10"
              style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
            >
              → Hoy
            </button>
          )}
        </div>
      )}
      <TaskRow task={task} {...rest} />
    </div>
  )
}

function Section({ title, color, tasks, userById, users, onOpenTask, actorUserId, actorName, workstreamById, onReschedule, headerAction, children }) {
  if (tasks.length === 0 && !children) return null
  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-2 border-l-2 px-5 py-3.5" style={{ borderColor: color }}>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold" style={{ color }}>
            {title}
          </span>
          {tasks.length > 0 && <span className="text-[12px] text-[#444444]">{tasks.length}</span>}
        </div>
        {headerAction}
      </div>
      <div className="flex flex-col divide-y divide-white/[0.04] px-3 pb-3">
        {tasks.map((task) => (
          <HoyTaskRow
            key={task.id}
            task={task}
            userById={userById}
            users={users}
            onOpen={onOpenTask}
            actorUserId={actorUserId}
            actorName={actorName}
            workstream={workstreamById[task.workstreamId]}
            onReschedule={onReschedule}
          />
        ))}
        {children}
      </div>
    </div>
  )
}

// Personal quick-add for "Mis Pendientes" — deliberately trimmed down from
// Lista's InlineAddTask (no descripción/estado toggle): title, an optional
// due date, and who's on it. Defaults to just yourself; adding anyone else
// routes them through the same pendingConfirmations mechanism as every
// other assignment in the app — this isn't a lesser, private task, it's a
// real one that happens to have been created from Hoy instead of Lista.
function AddPendiente({ actorUserId, actorName, userById, users }) {
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [assignedTo, setAssignedTo] = useState(actorUserId ? [actorUserId] : [])
  const [priority, setPriority] = useState('media')
  const [dueDate, setDueDate] = useState(null)
  const showToast = useToast()

  const reset = () => {
    setTitle('')
    setAssignedTo(actorUserId ? [actorUserId] : [])
    setPriority('media')
    setDueDate(null)
    setAdding(false)
  }

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const proyectoId = await findOrCreateGeneralProyecto(actorName)
      await createTask(
        {
          title: title.trim(),
          description: '',
          workstreamId: buildWorkstreamId('proyecto', proyectoId),
          assignedTo,
          priority,
          startDate: null,
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
        onClick={() => setAdding(true)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-[13px] text-[#444444] transition-colors duration-150 hover:bg-white/[0.03] hover:text-[#888888]"
      >
        <span className="text-[15px] leading-none">+</span> Agregar pendiente
      </button>
    )
  }

  return (
    <div
      className="grid items-center gap-3 rounded-lg px-2 py-2"
      style={{ gridTemplateColumns: '1fr 88px 120px auto' }}
      onKeyDown={(e) => e.key === 'Escape' && reset()}
    >
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
      <PillCell options={PRIORITIES} value={priority} meta={priorityMeta(priority)} onChange={setPriority} />
      <EstimationCell startDate={null} dueDate={dueDate} overdue={false} dueToday={false} onChangeStart={() => {}} onChangeDue={setDueDate} />
      <AssigneeCell assignedTo={assignedTo} userById={userById} users={users} onChange={setAssignedTo} />
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

export default function HoyView({ user, tasks, userId, userById, users, workstreamById, onOpenTask, actorUserId, actorName, notes = [] }) {
  const showToast = useToast()

  // Excludes anything still pending your own confirmation — see
  // lib/workspace.js's isPendingFor. It doesn't count as yours yet.
  const mine = tasks.filter((t) => (t.assignedTo || []).includes(userId) && !isPendingFor(t, userId) && t.status !== 'completado')
  const vencidas = mine.filter(isOverdue)
  const hoy = mine.filter((t) => isDueToday(t) && !isOverdue(t))
  const pendientes = mine.filter((t) => !isOverdue(t) && !isDueToday(t))
  const pendingNotes = notes.filter((n) => n.status !== 'archivada')

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

  return (
    <div className="flex flex-col gap-5">
      <QuickCapture user={user} actorName={actorName} />

      {pendingNotes.length > 0 && (
        <div className="flex flex-col gap-2">
          {pendingNotes.map((note) => (
            <NoteCard key={note.id} note={note} actorName={actorName} onArchive={archiveNote} onDelete={deleteNoteById} />
          ))}
        </div>
      )}

      {vencidas.length === 0 && hoy.length === 0 && <NadaUrgente />}

      <Section
        title="Vencidas"
        color="#EF5350"
        tasks={vencidas}
        userById={userById}
        users={users}
        onOpenTask={onOpenTask}
        actorUserId={actorUserId}
        actorName={actorName}
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
      <Section title="Para hoy" color="#1E5FAD" tasks={hoy} userById={userById} users={users} onOpenTask={onOpenTask} actorUserId={actorUserId} actorName={actorName} workstreamById={workstreamById} />
      <Section
        title="Mis Pendientes"
        color="#888888"
        tasks={pendientes}
        userById={userById}
        users={users}
        onOpenTask={onOpenTask}
        actorUserId={actorUserId}
        actorName={actorName}
        workstreamById={workstreamById}
      >
        <div className="pt-1">
          <AddPendiente actorUserId={actorUserId} actorName={actorName} userById={userById} users={users} />
        </div>
      </Section>
    </div>
  )
}
