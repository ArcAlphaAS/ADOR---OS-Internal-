import { useState } from 'react'
import { isOverdue, isDueToday } from '../../lib/workspace'
import { CATEGORIES, suggestCategory } from '../../lib/notes'
import { createNote, updateNote, deleteNote } from '../../lib/firestore'
import { CloseIcon, CheckCircleIcon } from '../icons'
import { useToast } from '../../hooks/useToast'
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
// triaging now happen on the same screen: type-and-Enter at the top saves a
// note (still via GlobalCapture.jsx's floating "+" from anywhere else in the
// app — this is just the second, in-place entry point), pending notes sit
// right above the task sections. Reviewed/archived notes are intentionally
// not shown here — they're done, and Hoy is about what still needs you.

function NoteCard({ note, onArchive, onDelete }) {
  const meta = CATEGORIES[note.category] || CATEGORIES.nota
  return (
    <div className="ador-glass ador-grain flex items-start justify-between gap-3 rounded-xl px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-relaxed text-[#F5F5F5]">{note.text}</p>
        <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${meta.color}1F`, color: meta.color }}>
          {meta.label}
          {meta.module ? ` → ${meta.module}` : ''}
        </span>
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

function Section({ title, color, tasks, userById, users, onOpenTask, actorName, workstreamById }) {
  if (tasks.length === 0) return null
  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-l-2 px-5 py-3.5" style={{ borderColor: color }}>
        <span className="text-[14px] font-semibold" style={{ color }}>
          {title}
        </span>
        <span className="text-[12px] text-[#444444]">{tasks.length}</span>
      </div>
      <div className="flex flex-col divide-y divide-white/[0.04] px-3 pb-3">
        {tasks.map((task) => (
          <HoyTaskRow
            key={task.id}
            task={task}
            userById={userById}
            users={users}
            onOpen={onOpenTask}
            actorName={actorName}
            workstream={workstreamById[task.workstreamId]}
          />
        ))}
      </div>
    </div>
  )
}

// Same row the team views use (same inline-editable cells), with a small
// workstream tag layered above the title — Hoy mixes tasks from every
// Intervención/Proyecto, so without it a task reads with no context about
// which piece of work it belongs to.
function HoyTaskRow({ task, workstream, ...rest }) {
  return (
    <div className="pt-2.5 first:pt-3">
      {workstream && (
        <span className="mb-1 ml-[36px] block w-fit text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: workstream.kind === 'intervencion' ? '#1E5FAD' : '#B8860B' }}>
          {workstream.name}
        </span>
      )}
      <TaskRow task={task} {...rest} />
    </div>
  )
}

function EmptyDay() {
  return (
    <div className="flex flex-col items-center gap-3 py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(76,175,80,0.1)' }}>
        <span className="h-2 w-2 rounded-full bg-[#4CAF50]" style={{ animation: 'ador-pulse 2.5s ease-in-out infinite' }} />
      </div>
      <p className="text-[14px] font-light text-[#F5F5F5]">Nada vencido, nada para hoy.</p>
      <p className="text-[13px] text-[#444444]">Buen momento para adelantar algo de esta semana, o revisar el tablero del equipo.</p>
    </div>
  )
}

export default function HoyView({ user, tasks, userId, userById, users, workstreamById, onOpenTask, actorName, notes = [] }) {
  const showToast = useToast()
  const mine = tasks.filter((t) => (t.assignedTo || []).includes(userId) && t.status !== 'completado')
  const vencidas = mine.filter(isOverdue)
  const hoy = mine.filter((t) => isDueToday(t) && !isOverdue(t))
  const pendingNotes = notes.filter((n) => n.status !== 'archivada')

  const archiveNote = (id) => updateNote(id, { status: 'archivada' }).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  const deleteNoteById = (id) => deleteNote(id).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))

  const allEmpty = vencidas.length === 0 && hoy.length === 0 && pendingNotes.length === 0

  return (
    <div className="flex flex-col gap-5">
      <QuickCapture user={user} actorName={actorName} />

      {pendingNotes.length > 0 && (
        <div className="flex flex-col gap-2">
          {pendingNotes.map((note) => (
            <NoteCard key={note.id} note={note} onArchive={archiveNote} onDelete={deleteNoteById} />
          ))}
        </div>
      )}

      {allEmpty ? (
        <EmptyDay />
      ) : (
        <>
          <Section title="Vencidas" color="#EF5350" tasks={vencidas} userById={userById} users={users} onOpenTask={onOpenTask} actorName={actorName} workstreamById={workstreamById} />
          <Section title="Para hoy" color="#1E5FAD" tasks={hoy} userById={userById} users={users} onOpenTask={onOpenTask} actorName={actorName} workstreamById={workstreamById} />
        </>
      )}
    </div>
  )
}
