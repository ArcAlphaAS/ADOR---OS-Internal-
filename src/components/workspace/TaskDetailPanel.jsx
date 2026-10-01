import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { applyTaskUpdate, deleteTask, subscribeTaskHistory, subscribeObjetivos } from '../../lib/firestore'
import { STATUSES, PRIORITIES, RECURRENCES } from '../../lib/workspace'
import TaskComments from './TaskComments'
import { SubtasksBlock } from './TaskChrome'
import { AssigneeCell } from './TaskCells'
import { quarterKey } from '../../lib/finance'
import { CloseIcon, CheckCircleIcon, FlagIcon, UsersIcon, CalendarIcon, TimelineIcon, TargetIcon, ClockIcon, LockIcon, MoreIcon } from '../icons'
import { SHEET, swipeToClose } from '../../lib/motion'
import { useToast } from '../../hooks/useToast'

function formatHistoryDate(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Compact chips for Estado / Prioridad — all options visible, the active one
// filled with its colour.
function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const active = value === opt.id
        const color = opt.color === '#444444' ? '#9A9A9A' : opt.color
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="rounded-full border px-2 py-1 text-[11.5px] font-medium transition-colors duration-150"
            style={{ borderColor: active ? color : 'rgba(255,255,255,0.1)', background: active ? `${color}26` : 'transparent', color: active ? color : '#8A8A8A' }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// One property row, Linear/Notion style: icon + label on the left, the
// control on the right. Hints live in the tooltip instead of long captions.
function Prop({ icon: Icon, label, hint, children }) {
  return (
    <div className="grid grid-cols-[104px_1fr] items-start gap-2 py-1.5" title={hint}>
      <span className="flex items-center gap-2 pt-1.5 text-[12px] text-[#777777]">
        <Icon size={13} />
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const dateClass = 'w-[142px] '
const fieldClass = 'rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-[13px] text-[#F5F5F5] outline-none transition-colors hover:bg-white/[0.05] focus:border-white/[0.18] focus:bg-white/[0.05]'

export default function TaskDetailPanel({ task, workstream, users, userById, actorUserId, actorName, onClose: onCloseRaw, initialSection, allTasks = [], onNavigate }) {
  const descRef = useRef(null)
  const lastTitle = useRef(null)
  const lastDesc = useRef(null)
  const showToast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [titleHeight, setTitleHeight] = useState(null)
  const [title, setTitle] = useState(task?.title || '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [history, setHistory] = useState([])
  const [objetivos, setObjetivos] = useState([])

  useEffect(() => {
    if (!task?.id) return
    return subscribeTaskHistory(task.id, setHistory)
  }, [task?.id])

  useEffect(() => subscribeObjetivos(setObjetivos), [])
  const currentQuarterObjetivos = objetivos.filter((o) => o.quarter === quarterKey())

  // Tareas previas (dependencias). Un ciclo (A espera a B y B a A) no se permite:
  // se ofrecen solo las que no dependen, ni siquiera de lejos, de esta.
  const byId = Object.fromEntries(allTasks.map((t) => [t.id, t]))
  const dependsOn = (fromId, targetId, seen = new Set()) => {
    if (seen.has(fromId)) return false
    seen.add(fromId)
    return (byId[fromId]?.blockedBy || []).some((id) => id === targetId || dependsOn(id, targetId, seen))
  }
  const blockers = (task?.blockedBy || []).map((id) => byId[id]).filter(Boolean)
  const blockerOptions = task
    ? allTasks.filter((t) => t.id !== task.id && t.workstreamId === task.workstreamId && !(task.blockedBy || []).includes(t.id) && !dependsOn(t.id, task.id))
    : []

  useEffect(() => {
    if (initialSection !== 'comments') return
    const t = setTimeout(() => document.getElementById('task-comments')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 380)
    return () => clearTimeout(t)
  }, [initialSection, task?.id])

  if (!task) return null

  const dueValue = task.dueDate?.toDate?.() ? task.dueDate.toDate().toISOString().slice(0, 10) : ''
  const startValue = task.startDate?.toDate?.() ? task.startDate.toDate().toISOString().slice(0, 10) : ''
  const endValue = (task.endDate?.toDate?.() || (task.startDate ? task.dueDate?.toDate?.() : null))?.toISOString?.().slice(0, 10) || ''
  const assignedTo = task.assignedTo || []

  const applyUpdate = (data) => applyTaskUpdate(task, data, actorUserId, actorName)

  // Refs remember what was just written: the blur and the close both call
  // these, and `task` only catches up a moment later — without them a title
  // typed then closed would be saved (and logged) twice.
  const saveTitle = () => {
    const t = title.trim()
    if (t && t !== task.title && t !== lastTitle.current) {
      lastTitle.current = t
      applyUpdate({ title: t })
    }
  }
  const saveDescription = (value) => {
    const v = value.trim()
    if (v !== (task.description || '') && v !== lastDesc.current) {
      lastDesc.current = v
      applyUpdate({ description: v })
    }
  }

  // Cerrar por cualquier lado (X, fuera del panel, deslizar) guarda antes lo que
  // se estaba escribiendo: el blur del campo no siempre alcanza a correr antes
  // de que el panel se desmonte.
  const onClose = () => {
    saveTitle()
    if (descRef.current) saveDescription(descRef.current.value)
    onCloseRaw()
  }

  const toggleAssignee = (uid) => {
    const next = assignedTo.includes(uid) ? assignedTo.filter((id) => id !== uid) : [...assignedTo, uid]
    applyUpdate({ assignedTo: next })
  }

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    deleteTask(task.id)
    onCloseRaw()
  }

  const completed = task.status === 'completado'
  const subs = task.subtasks || []
  const subsDone = subs.filter((x) => x.done).length
  const accent = workstream?.kind === 'intervencion' ? '#1E5FAD' : '#B8860B'
  const copyLink = () => {
    setMenuOpen(false)
    navigator.clipboard.writeText(`${window.location.origin}/?open=workspace&task=${task.id}`).then(() => showToast('Enlace copiado.')).catch(() => {})
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <motion.div
        key={task.id}
        initial={{ x: 520, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 520, opacity: 0 }}
        transition={SHEET}
        {...swipeToClose('x', onClose)}
        className="fixed right-0 top-0 z-50 h-full w-[540px] max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-modal-surface ador-grain flex h-full flex-col overflow-y-auto">
          {/* Sticky header: where this task lives + the ⋯ menu + close. */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-[#0C0C0C]/90 px-6 py-3.5 backdrop-blur-md">
            <span className="flex min-w-0 items-center gap-2 text-[12px] text-[#9A9A9A]">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: accent }} />
              <span className="truncate">{workstream?.name || 'Sin proyecto'}</span>
              <span className="flex-shrink-0 text-[#555555]">· {workstream?.kind === 'intervencion' ? 'Intervención' : 'Proyecto'}</span>
            </span>
            <div className="relative flex items-center gap-1">
              <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors hover:bg-white/[0.08] hover:text-[#F5F5F5]" title="Más opciones">
                <MoreIcon size={16} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="ador-glass absolute right-0 top-full z-20 mt-1 w-[190px] rounded-xl p-1.5">
                    <button type="button" onClick={copyLink} className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#E8E8E8] hover:bg-white/[0.07]">
                      Copiar enlace
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-white/[0.07]"
                      style={{ color: '#EF5350' }}
                    >
                      {confirmingDelete ? 'Clic otra vez para eliminar' : 'Eliminar tarea'}
                    </button>
                  </div>
                </>
              )}
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors hover:bg-white/[0.08] hover:text-[#F5F5F5]">
                <CloseIcon size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-col px-6 pb-10">
            {/* Title with a round complete button, like Reminders/Things. */}
            <div className="flex items-start gap-3 pt-2">
              <button
                type="button"
                onClick={() => applyUpdate({ status: completed ? 'por_hacer' : 'completado' })}
                title={completed ? 'Reabrir' : 'Marcar como completada'}
                className="mt-[7px] flex-shrink-0 transition-transform active:scale-90"
                style={{ color: completed ? '#4CAF50' : '#555555' }}
              >
                {completed ? <CheckCircleIcon size={22} /> : <span className="block h-[19px] w-[19px] rounded-full border-2 border-current" />}
              </button>
              <textarea
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                ref={(el) => {
                  if (el && titleHeight === null) {
                    el.style.height = 'auto'
                    el.style.height = `${el.scrollHeight}px`
                    setTitleHeight(el.scrollHeight)
                  }
                }}
                onBlur={saveTitle}
                rows={1}
                className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-[22px] font-semibold leading-snug outline-none"
                style={{ color: completed ? '#777777' : '#F5F5F5', textDecoration: completed ? 'line-through' : 'none' }}
              />
            </div>

            {/* Properties */}
            <div className="mt-5 border-y border-white/[0.07] py-2">
              <Prop icon={CheckCircleIcon} label="Estado">
                <Chips options={STATUSES} value={task.status} onChange={(id) => applyUpdate({ status: id })} />
              </Prop>
              <Prop icon={FlagIcon} label="Prioridad">
                <Chips options={PRIORITIES} value={task.priority} onChange={(id) => applyUpdate({ priority: id })} />
              </Prop>
              <Prop icon={UsersIcon} label="Asignado a">
                <div className="px-1.5 pt-0.5">
                  <AssigneeCell assignedTo={assignedTo} userById={userById} users={users} pendingIds={task.pendingConfirmations || []} onChange={(next) => applyUpdate({ assignedTo: next })} />
                </div>
              </Prop>
              <Prop icon={CalendarIcon} label="Fecha límite" hint="Es el plazo: decide cuándo aparece en Hoy y cuándo se marca atrasada.">
                <input type="date" value={dueValue} onChange={(e) => applyUpdate({ dueDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })} className={`${dateClass}${fieldClass}`} />
              </Prop>
              <Prop icon={TimelineIcon} label="Timeline" hint="Es el tramo de trabajo: se dibuja como barra en la vista Timeline.">
                <div className="flex items-center gap-1">
                  <input type="date" value={startValue} onChange={(e) => applyUpdate({ startDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })} className={`${dateClass}${fieldClass}`} />
                  <span className="text-[#555555]">→</span>
                  <input type="date" value={endValue} onChange={(e) => applyUpdate({ endDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })} className={`${dateClass}${fieldClass}`} />
                </div>
              </Prop>
              <Prop icon={TargetIcon} label="Objetivo" hint="Conecta esta tarea al Objetivo del trimestre que está empujando.">
                <select value={task.objetivoId || ''} onChange={(e) => applyUpdate({ objetivoId: e.target.value || null })} className={`${fieldClass} max-w-full`}>
                  <option value="">Ninguno</option>
                  {currentQuarterObjetivos.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </Prop>
              <Prop icon={ClockIcon} label="Repetir" hint="Al completarla, se crea sola la siguiente con la fecha límite corrida.">
                <select value={task.recurrence || ''} onChange={(e) => applyUpdate({ recurrence: e.target.value || null })} className={fieldClass}>
                  <option value="">No se repite</option>
                  {RECURRENCES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Prop>
              <Prop icon={LockIcon} label="Depende de" hint="Esta tarea espera a las de aquí. En Timeline se dibuja una flecha, en rojo si empieza antes de que termine la previa.">
                <div className="flex flex-col gap-1.5">
                  {blockers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {blockers.map((b) => (
                        <span key={b.id} className="flex max-w-full items-center gap-1.5 rounded-full bg-white/[0.07] py-1 pl-2.5 pr-1.5 text-[11.5px]" style={{ color: b.status === 'completado' ? '#4CAF50' : '#DDDDDD' }}>
                          <span className="truncate">{b.title}</span>
                          <button type="button" onClick={() => applyUpdate({ blockedBy: (task.blockedBy || []).filter((x) => x !== b.id) })} className="text-[#888888] hover:text-[#F5F5F5]">
                            <CloseIcon size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <select value="" onChange={(e) => e.target.value && applyUpdate({ blockedBy: [...(task.blockedBy || []), e.target.value] })} className={`${fieldClass} max-w-full text-[#888888]`}>
                    <option value="">{blockerOptions.length ? '+ Agregar tarea previa' : 'No hay otras tareas en el proyecto'}</option>
                    {blockerOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                </div>
              </Prop>
            </div>

            {/* Description */}
            <div className="pt-5">
              <textarea
                ref={descRef}
                defaultValue={task.description || ''}
                onBlur={(e) => saveDescription(e.target.value)}
                onInput={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                rows={3}
                placeholder="Añade una descripción…"
                className="w-full resize-none rounded-xl border border-transparent bg-transparent px-2 py-2 text-[14px] leading-relaxed text-[#E5E5E5] outline-none transition-colors placeholder:text-[#555555] hover:bg-white/[0.03] focus:border-white/[0.14] focus:bg-white/[0.03]"
              />
            </div>

            {/* Subtasks with a progress bar */}
            <div className="pt-5">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-[13px] font-semibold text-[#F5F5F5]">Subtareas</span>
                {subs.length > 0 && (
                  <>
                    <span className="text-[12px] text-[#888888]">
                      {subsDone}/{subs.length}
                    </span>
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                      <span className="block h-full rounded-full bg-[#4CAF50] transition-all duration-300" style={{ width: `${(subsDone / subs.length) * 100}%` }} />
                    </span>
                  </>
                )}
              </div>
              <SubtasksBlock task={task} embedded />
            </div>

            {/* Updates */}
            <div className="mt-6 border-t border-white/[0.07] pt-5">
              <TaskComments task={task} users={users} userById={userById} actorUserId={actorUserId} actorName={actorName} onNavigate={onNavigate} />
            </div>

            {/* History, collapsed: it's a log, not something you read each time. */}
            <details className="group mt-6 border-t border-white/[0.07] pt-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[12.5px] text-[#888888] hover:text-[#F5F5F5]">
                <span className="transition-transform group-open:rotate-90">▸</span>
                Actividad{history.length ? ` · ${history.length}` : ''}
              </summary>
              {history.length === 0 ? (
                <p className="mt-3 text-[13px] font-light text-[#555555]">Sin actividad registrada</p>
              ) : (
                <div className="mt-3 flex flex-col divide-y divide-white/[0.05]">
                  {history.map((event) => (
                    <div key={event.id} className="flex flex-col gap-0.5 py-2 first:pt-0">
                      <span className="text-[13px] text-[#E5E5E5]">{event.description}</span>
                      <span className="text-[11px] text-[#666666]">{formatHistoryDate(event.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </details>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
