import { useEffect, useState } from 'react'
import { subscribeNotes, updateNote, deleteNote, createTask, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { workstreamId as buildWorkstreamId } from '../../lib/workspace'
import { CATEGORIES } from '../../lib/notes'
import { NoteIcon, CloseIcon, CheckCircleIcon } from '../icons'
import { useToast } from '../../hooks/useToast'

// The "cuaderno" view inside Workspace — personal/daily jottings that don't
// belong on the formal Lista/Kanban/Timeline task board (those are the
// team's structured, workstream-linked tareas). Moved here from a
// standalone "Conocimiento" module per the user's own correction
// (2026-09-16): Conocimiento is reserved for a future proper document/
// knowledge base, not for this. Content-only component, same shape as
// ListaView/KanbanView/TimelineView — WorkspaceModule owns the page header.
function formatWhen(date) {
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ' · ' + date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

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
    <div className="ador-glass ador-grain rounded-2xl px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] leading-relaxed text-[#F5F5F5]">{note.text}</p>
        <button
          type="button"
          onClick={() => onDelete(note.id)}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#E05252]"
          title="Eliminar"
        >
          <CloseIcon size={12} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ backgroundColor: `${meta.color}1F`, color: meta.color }}
          >
            {note.status === 'archivada' ? `Guardada como ${meta.label}` : `Sugerencia: ${meta.label}${meta.module ? ` → ${meta.module}` : ''}`}
          </span>
          <span className="whitespace-nowrap text-[11px] text-[#444444]">{formatWhen(note.createdAt?.toDate?.())}</span>
        </div>

        {note.status === 'pendiente' && (
          <div className="flex flex-shrink-0 items-center gap-2">
            {note.category === 'tarea' && (
              <button
                type="button"
                onClick={convertToTask}
                disabled={converting}
                className="whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10 disabled:opacity-50"
                style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
              >
                {converting ? 'Creando…' : '+ Crear tarea'}
              </button>
            )}
            <button
              type="button"
              onClick={() => onArchive(note.id)}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-[#888888] transition-colors duration-150 hover:text-[#F5F5F5]"
            >
              <CheckCircleIcon size={13} />
              Revisada
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NotasView({ actorName }) {
  const [notes, setNotes] = useState([])
  const showToast = useToast()

  useEffect(() => subscribeNotes(setNotes), [])

  const pendientes = notes.filter((n) => n.status !== 'archivada')
  const archivadas = notes.filter((n) => n.status === 'archivada')

  const archive = async (id) => {
    try {
      await updateNote(id, { status: 'archivada' })
    } catch (error) {
      showToast(`No se pudo actualizar: ${error.message}`)
    }
  }

  const remove = async (id) => {
    try {
      await deleteNote(id)
    } catch (error) {
      showToast(`No se pudo eliminar: ${error.message}`)
    }
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(30,95,173,0.12)', border: '1px solid rgba(30,95,173,0.25)' }}
        >
          <NoteIcon size={24} className="text-[#1E5FAD]" style={{ animation: 'ador-pulse 2.4s ease-in-out infinite' }} />
        </div>
        <p className="text-[14px] font-light text-[#888888]">Nada anotado todavía.</p>
        <p className="max-w-[360px] text-[13px] font-light text-[#444444]">
          Usa el botón azul "+" abajo a la derecha, en cualquier pantalla, para anotar algo — tareas personales, ideas, lo del
          día — igual que tomarías tu cuaderno.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Sin revisar ({pendientes.length})
        </span>
        {pendientes.length === 0 ? (
          <p className="text-[13px] font-light text-[#444444]">Todo revisado — nada pendiente.</p>
        ) : (
          pendientes.map((note) => <NoteCard key={note.id} note={note} actorName={actorName} onArchive={archive} onDelete={remove} />)
        )}
      </div>

      {archivadas.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Revisadas ({archivadas.length})
          </span>
          {archivadas.map((note) => (
            <NoteCard key={note.id} note={note} actorName={actorName} onArchive={archive} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
