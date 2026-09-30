import { useState } from 'react'
import { updateTask } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { ChevronRightIcon, MessageIcon, CloseIcon, PlusIcon } from '../icons'

// What Monday/Linear put around a task's name, shared by every task row
// (Grupo/Lista, Hoy, Personal): an arrow on the left that unfolds its
// subtasks, a comment bubble with the count that opens the task's
// Actualizaciones, and an expand icon on the right that opens the full
// panel. The arrows appear on hover so a quiet row stays quiet.
export function TaskTitleCell({ task, completed, expanded, onToggleExpand, onOpen }) {
  const subtasks = task.subtasks || []
  const doneCount = subtasks.filter((s) => s.done).length
  const comments = task.commentCount || 0

  return (
    <div className="group/title flex min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleExpand()
        }}
        title={expanded ? 'Ocultar subtareas' : 'Subtareas'}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#888888] transition-all duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5] ${subtasks.length > 0 || expanded ? 'opacity-100' : 'opacity-0 group-hover/title:opacity-100'}`}
      >
        <span className="flex transition-transform duration-150" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}>
          <ChevronRightIcon size={12} />
        </span>
      </button>

      <span
        onClick={() => onOpen(task)}
        className="min-w-0 cursor-pointer truncate text-[14px] font-medium text-[#F5F5F5] hover:underline"
        style={{ opacity: completed ? 0.5 : 1, textDecoration: completed ? 'line-through' : 'none' }}
      >
        {task.title}
      </span>

      {subtasks.length > 0 && (
        <span className="flex-shrink-0 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-medium text-[#999999]" title="Subtareas completadas">
          {doneCount}/{subtasks.length}
        </span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen(task, 'comments')
        }}
        title={comments ? `${comments} actualización${comments === 1 ? '' : 'es'}` : 'Escribir una actualización'}
        className={`relative ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-all duration-150 hover:bg-white/[0.08] ${comments ? 'text-[#E8C15A] opacity-100' : 'text-[#888888] opacity-0 group-hover/title:opacity-100'}`}
      >
        <MessageIcon size={14} />
        {comments > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[13px] min-w-[13px] items-center justify-center rounded-full bg-[#E8C15A] px-[3px] text-[8.5px] font-semibold leading-none text-[#1C1A16]">{comments}</span>
        )}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen(task)
        }}
        title="Abrir tarea"
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[#888888] opacity-0 transition-all duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5] group-hover/title:opacity-100"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 2.5h4v4M13.5 2.5L9 7M6.5 13.5h-4v-4M2.5 13.5L7 9" />
        </svg>
      </button>
    </div>
  )
}

// The subtasks themselves: title + done, stored as `subtasks: [{id,title,done}]`
// on the task (no separate collection — they never appear in Hoy, the bell
// or the workload; they're a checklist inside one task). Used unfolded under
// a row and inside the task panel.
export function SubtasksBlock({ task, embedded = false }) {
  const showToast = useToast()
  const [text, setText] = useState('')
  const subtasks = task.subtasks || []

  const save = (next) => withTimeout(updateTask(task.id, { subtasks: next })).catch((e) => showToast(`No se pudo guardar la subtarea: ${e.message}`))
  const add = () => {
    const title = text.trim()
    if (!title) return
    setText('')
    save([...subtasks, { id: Math.random().toString(36).slice(2, 10), title, done: false }])
  }

  return (
    <div className={embedded ? 'flex flex-col gap-1' : 'mb-1 ml-9 mr-2 flex flex-col gap-0.5 border-l border-white/[0.08] pb-2 pl-3'} onClick={(e) => e.stopPropagation()}>
      {subtasks.map((s) => (
        <div key={s.id} className="group/sub flex items-center gap-2 rounded-md px-1 py-1 hover:bg-white/[0.035]">
          <button
            type="button"
            onClick={() => save(subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
            className="flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded-full border text-[9px] leading-none"
            style={{ borderColor: s.done ? '#4CAF50' : '#555555', background: s.done ? '#4CAF50' : 'transparent', color: '#0A0A0A' }}
          >
            {s.done ? '✓' : ''}
          </button>
          <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: s.done ? '#777777' : '#DDDDDD', textDecoration: s.done ? 'line-through' : 'none' }}>
            {s.title}
          </span>
          <button
            type="button"
            onClick={() => save(subtasks.filter((x) => x.id !== s.id))}
            title="Quitar subtarea"
            className="flex-shrink-0 text-[#666666] opacity-0 transition-opacity hover:text-[#EF5350] group-hover/sub:opacity-100"
          >
            <CloseIcon size={11} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 px-1 py-1">
        <span className="flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center text-[#666666]">
          <PlusIcon size={11} />
        </span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Agregar subtarea — Enter"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#F5F5F5] outline-none placeholder:text-[#666666]"
        />
      </div>
    </div>
  )
}
