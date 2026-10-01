import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { applyTaskUpdate, deleteTask, subscribeTaskHistory, subscribeObjetivos, subscribeTaskViewers, pingTaskViewing, clearTaskViewing } from '../../lib/firestore'
import { STATUSES, PRIORITIES, RECURRENCES, statusMeta } from '../../lib/workspace'
import TaskComments from './TaskComments'
import { SubtasksBlock } from './TaskChrome'
import { AssigneeCell } from './TaskCells'
import Avatar from '../shell/Avatar'
import { quarterKey } from '../../lib/finance'
import { CloseIcon, CheckCircleIcon, FlagIcon, UsersIcon, CalendarIcon, TimelineIcon, TargetIcon, ClockIcon, LockIcon, MoreIcon, ChevronDownIcon } from '../icons'
import { SHEET, swipeToClose } from '../../lib/motion'
import { useToast } from '../../hooks/useToast'

function formatHistoryDate(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const plusDays = (n) => {
  const d = startOfToday()
  d.setDate(d.getDate() + n)
  return d
}
const nextMonday = () => {
  const d = plusDays(1)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  return d
}

// "mañana", "vencida hace 2 días"… next to the raw date, so it reads at a glance.
function relativeDue(due, completed) {
  if (!due) return null
  const days = Math.round((atMidnight(due) - startOfToday()) / 86400000)
  if (days === 0) return { text: 'hoy', color: completed ? '#777777' : '#FFC107' }
  if (days === 1) return { text: 'mañana', color: '#9A9A9A' }
  if (days === -1) return { text: completed ? 'ayer' : 'venció ayer', color: completed ? '#777777' : '#EF5350' }
  if (days > 1) return { text: `en ${days} días`, color: '#9A9A9A' }
  return { text: completed ? `hace ${-days} días` : `vencida hace ${-days} días`, color: completed ? '#777777' : '#EF5350' }
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

const fieldClass = 'rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-[13px] text-[#F5F5F5] outline-none transition-colors hover:bg-white/[0.05] focus:border-white/[0.18] focus:bg-white/[0.05]'
const dateClass = `w-[142px] ${fieldClass}`

const TABS = [
  { id: 'details', label: 'Detalles' },
  { id: 'updates', label: 'Actualizaciones' },
  { id: 'activity', label: 'Actividad' },
]

export default function TaskDetailPanel({ task, workstream, users, userById, actorUserId, actorName, onClose: onCloseRaw, initialSection, allTasks = [], siblings = [], onSwitch, onNavigate }) {
  const showToast = useToast()
  const descRef = useRef(null)
  const titleRef = useRef(null)
  const lastTitle = useRef(null)
  const lastDesc = useRef(null)
  const keyRef = useRef({})
  const [title, setTitle] = useState(task?.title || '')
  const [tab, setTab] = useState(initialSection === 'comments' ? 'updates' : 'details')
  const [menuOpen, setMenuOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [history, setHistory] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [viewers, setViewers] = useState({})

  useEffect(() => {
    if (!task?.id) return
    return subscribeTaskHistory(task.id, setHistory)
  }, [task?.id])

  useEffect(() => subscribeObjetivos(setObjetivos), [])
  const currentQuarterObjetivos = objetivos.filter((o) => o.quarter === quarterKey())

  // Switching to another task (← → or the arrows) reuses this panel: reset
  // what's local to one task.
  useEffect(() => {
    setTitle(task?.title || '')
    lastTitle.current = null
    lastDesc.current = null
    setTab(initialSection === 'comments' ? 'updates' : 'details')
    setMenuOpen(false)
    setStatusOpen(false)
    setConfirmingDelete(false)
  }, [task?.id, initialSection])

  // Auto-grow title and description.
  useEffect(() => {
    for (const el of [titleRef.current, descRef.current]) {
      if (el) {
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
      }
    }
  }, [title, task?.id, tab])

  // "X está viendo esta tarea": ping while open, clean up on close.
  const real = actorUserId && actorUserId !== 'preview'
  useEffect(() => {
    if (!task?.id) return
    const off = subscribeTaskViewers(task.id, setViewers)
    if (!real) return off
    pingTaskViewing(task.id, actorUserId, actorName).catch(() => {})
    const t = setInterval(() => pingTaskViewing(task.id, actorUserId, actorName).catch(() => {}), 20000)
    return () => {
      off()
      clearInterval(t)
      clearTaskViewing(task.id, actorUserId)
    }
  }, [task?.id, actorUserId, actorName, real])
  const othersViewing = Object.entries(viewers)
    .filter(([uid, v]) => uid !== actorUserId && v?.at && Date.now() - v.at < 45000)
    .map(([uid, v]) => ({ uid, name: v.name }))

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

  // Keyboard: Esc (first leaves the field you're typing in, then closes),
  // ⌘/Ctrl+Enter saves and closes, ← → (or k j) move through the list.
  useEffect(() => {
    const onKey = (e) => {
      const k = keyRef.current
      const tag = e.target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable
      if (e.key === 'Escape') {
        if (typing) e.target.blur()
        else k.close?.()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        k.close?.()
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'ArrowRight' || e.key === 'j') k.go?.(1)
        else if (e.key === 'ArrowLeft' || e.key === 'k') k.go?.(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!task) return null

  const dueDate = task.dueDate?.toDate?.() || null
  const dueValue = dueDate ? dueDate.toISOString().slice(0, 10) : ''
  const startValue = task.startDate?.toDate?.() ? task.startDate.toDate().toISOString().slice(0, 10) : ''
  const endValue = (task.endDate?.toDate?.() || (task.startDate ? task.dueDate?.toDate?.() : null))?.toISOString?.().slice(0, 10) || ''
  const assignedTo = task.assignedTo || []
  const completed = task.status === 'completado'
  const status = statusMeta(task.status)
  const statusColor = status.color === '#444444' ? '#7A7A7A' : status.color
  const rel = relativeDue(dueDate, completed)
  const subs = task.subtasks || []
  const subsDone = subs.filter((x) => x.done).length
  const accent = workstream?.kind === 'intervencion' ? '#1E5FAD' : '#B8860B'
  const index = siblings.findIndex((t) => t.id === task.id)

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
  const flush = () => {
    saveTitle()
    if (descRef.current) saveDescription(descRef.current.value)
  }

  // Cerrar (X, fuera del panel, deslizar, Esc) guarda antes lo que se estaba
  // escribiendo: el blur del campo no siempre alcanza a correr antes de que el
  // panel se desmonte.
  const onClose = () => {
    flush()
    onCloseRaw()
  }
  const go = (delta) => {
    if (!onSwitch || index === -1) return
    const target = siblings[index + delta]
    if (!target) return
    flush()
    onSwitch(target.id)
  }
  keyRef.current = { close: onClose, go }

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    deleteTask(task.id)
    onCloseRaw()
  }
  const copyLink = () => {
    setMenuOpen(false)
    navigator.clipboard.writeText(`${window.location.origin}/?open=workspace&task=${task.id}`).then(() => showToast('Enlace copiado.')).catch(() => {})
  }
  const setDue = (date) => applyUpdate({ dueDate: date })

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="task-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <motion.div
        key="task-panel"
        initial={{ x: 520, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 520, opacity: 0 }}
        transition={SHEET}
        {...swipeToClose('x', onClose)}
        className="fixed right-0 top-0 z-50 h-full w-[540px] max-w-full"
        style={{ boxShadow: '-40px 0 80px -30px rgba(0,0,0,0.7)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-modal-surface ador-grain flex h-full flex-col overflow-y-auto border-l border-white/[0.06]">
          {/* Sticky header: where this task lives, who else is looking, ‹ ›
              through the list, the ⋯ menu and close. */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-[#0C0C0C]/90 px-6 py-3 backdrop-blur-md">
            <span className="flex min-w-0 items-center gap-2 text-[12px] text-[#9A9A9A]">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: accent }} />
              <span className="truncate">{workstream?.name || 'Sin proyecto'}</span>
              <span className="hidden flex-shrink-0 text-[#555555] sm:inline">· {workstream?.kind === 'intervencion' ? 'Intervención' : 'Proyecto'}</span>
            </span>
            <div className="relative flex flex-shrink-0 items-center gap-1">
              {othersViewing.length > 0 && (
                <span className="mr-1 flex items-center gap-1.5 rounded-full bg-white/[0.06] py-0.5 pl-0.5 pr-2.5 text-[11px] text-[#BBBBBB]" title={`${othersViewing.map((v) => v.name).join(', ')} ${othersViewing.length > 1 ? 'están viendo' : 'está viendo'} esta tarea`}>
                  <span className="flex -space-x-1.5">
                    {othersViewing.slice(0, 3).map((v) => (
                      <Avatar key={v.uid} photoURL={userById[v.uid]?.photoDataUrl} displayName={v.name} size={20} />
                    ))}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF50]" style={{ animation: 'ador-pulse 2s ease-in-out infinite' }} />
                  viendo
                </span>
              )}
              {siblings.length > 1 && index !== -1 && (
                <span className="mr-1 flex items-center gap-0.5 text-[11px] text-[#777777]">
                  <button type="button" onClick={() => go(-1)} disabled={index === 0} title="Tarea anterior (←)" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/[0.08] hover:text-[#F5F5F5] disabled:opacity-30">
                    <span className="rotate-90"><ChevronDownIcon size={13} /></span>
                  </button>
                  <span className="tabular-nums">{index + 1}/{siblings.length}</span>
                  <button type="button" onClick={() => go(1)} disabled={index === siblings.length - 1} title="Tarea siguiente (→)" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/[0.08] hover:text-[#F5F5F5] disabled:opacity-30">
                    <span className="-rotate-90"><ChevronDownIcon size={13} /></span>
                  </button>
                </span>
              )}
              <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors hover:bg-white/[0.08] hover:text-[#F5F5F5]" title="Más opciones">
                <MoreIcon size={16} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="ador-glass absolute right-0 top-full z-20 mt-1 w-[200px] rounded-xl p-1.5">
                    <button type="button" onClick={copyLink} className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#E8E8E8] hover:bg-white/[0.07]">
                      Copiar enlace
                    </button>
                    <button type="button" onClick={handleDelete} className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-white/[0.07]" style={{ color: '#EF5350' }}>
                      {confirmingDelete ? 'Clic otra vez para eliminar' : 'Eliminar tarea'}
                    </button>
                    <p className="px-2.5 pb-1 pt-2 text-[10.5px] leading-snug text-[#666666]">Atajos: Esc cierra · ⌘↵ guarda y cierra · ← → cambian de tarea</p>
                  </div>
                </>
              )}
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors hover:bg-white/[0.08] hover:text-[#F5F5F5]" title="Cerrar (Esc)">
                <CloseIcon size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-col px-6 pb-10">
            {/* Title. The circle completes/reopens (its ring takes the
                status colour); the chevron opens the full status menu. */}
            <div className="relative flex items-start gap-1 pt-2">
              <button
                type="button"
                onClick={() => applyUpdate({ status: completed ? 'por_hacer' : 'completado' })}
                title={completed ? 'Reabrir' : 'Marcar como completada'}
                className="mt-[7px] flex-shrink-0 transition-transform active:scale-90"
                style={{ color: statusColor }}
              >
                {completed ? <CheckCircleIcon size={22} /> : <span className="block h-[19px] w-[19px] rounded-full border-2 border-current" style={task.status === 'en_progreso' ? { background: `${statusColor}55` } : undefined} />}
              </button>
              <button type="button" onClick={() => setStatusOpen((v) => !v)} title={`Estado: ${status.label}`} className="mt-[9px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#666666] transition-colors hover:bg-white/[0.08] hover:text-[#F5F5F5]">
                <ChevronDownIcon size={12} />
              </button>
              {statusOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                  <div className="ador-glass absolute left-0 top-full z-20 mt-1 w-[190px] rounded-xl p-1.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStatusOpen(false)
                          applyUpdate({ status: s.id })
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#E8E8E8] hover:bg-white/[0.07]"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color === '#444444' ? '#7A7A7A' : s.color }} />
                        {s.label}
                        {task.status === s.id && <span className="ml-auto text-[#E8C15A]">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                rows={1}
                className="ml-1 min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-[22px] font-semibold leading-snug outline-none"
                style={{ color: completed ? '#777777' : '#F5F5F5', textDecoration: completed ? 'line-through' : 'none' }}
              />
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-5 border-b border-white/[0.07]">
              {TABS.map((t) => {
                const count = t.id === 'updates' ? task.commentCount || 0 : t.id === 'activity' ? history.length : 0
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className="relative -mb-px flex items-center gap-1.5 pb-2.5 text-[13px] font-medium transition-colors"
                    style={{ color: active ? '#F5F5F5' : '#777777' }}
                  >
                    {t.label}
                    {count > 0 && <span className="rounded-full bg-white/[0.08] px-1.5 text-[10.5px] leading-[16px] text-[#BBBBBB]">{count}</span>}
                    {active && <motion.span layoutId="task-tab" className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#E8C15A]" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                  </button>
                )
              })}
            </div>

            {/* Detalles */}
            <div className={tab === 'details' ? 'block' : 'hidden'}>
              <div className="py-2">
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
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <input type="date" value={dueValue} onChange={(e) => setDue(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)} className={dateClass} />
                      {rel && (
                        <span className="text-[12px] font-medium" style={{ color: rel.color }}>
                          {rel.text}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 px-1">
                      {[
                        ['Hoy', () => plusDays(0)],
                        ['Mañana', () => plusDays(1)],
                        ['Próx. lunes', nextMonday],
                      ].map(([label, make]) => (
                        <button key={label} type="button" onClick={() => setDue(make())} className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[11px] text-[#999999] transition-colors hover:border-white/[0.25] hover:text-[#F5F5F5]">
                          {label}
                        </button>
                      ))}
                      {dueDate && (
                        <button type="button" onClick={() => setDue(null)} className="px-1.5 text-[11px] text-[#777777] hover:text-[#EF5350]">
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                </Prop>
                <Prop icon={TimelineIcon} label="Timeline" hint="Es el tramo de trabajo: se dibuja como barra en la vista Timeline.">
                  <div className="flex items-center gap-1">
                    <input type="date" value={startValue} onChange={(e) => applyUpdate({ startDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })} className={dateClass} />
                    <span className="text-[#555555]">→</span>
                    <input type="date" value={endValue} onChange={(e) => applyUpdate({ endDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })} className={dateClass} />
                  </div>
                </Prop>
                <Prop icon={TargetIcon} label="Objetivo" hint="Conecta esta tarea al Objetivo del trimestre que está empujando.">
                  <select value={task.objetivoId || ''} onChange={(e) => applyUpdate({ objetivoId: e.target.value || null })} className={`${fieldClass} max-w-full`} style={task.objetivoId ? undefined : { color: '#777777' }}>
                    <option value="">Ninguno</option>
                    {currentQuarterObjetivos.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                </Prop>
                <Prop icon={ClockIcon} label="Repetir" hint="Al completarla, se crea sola la siguiente con la fecha límite corrida.">
                  <select value={task.recurrence || ''} onChange={(e) => applyUpdate({ recurrence: e.target.value || null })} className={fieldClass} style={task.recurrence ? undefined : { color: '#777777' }}>
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
                    <select value="" onChange={(e) => e.target.value && applyUpdate({ blockedBy: [...(task.blockedBy || []), e.target.value] })} className={`${fieldClass} max-w-full`} style={{ color: '#777777' }}>
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

              <div className="border-t border-white/[0.07] pt-4">
                <textarea
                  key={task.id}
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
            </div>

            {/* Actualizaciones — always mounted (hidden when another tab is
                open) so a half-written update survives switching tabs and
                opening the task keeps clearing its bell alerts. */}
            <div className={`pt-5 ${tab === 'updates' ? 'block' : 'hidden'}`}>
              <TaskComments task={task} users={users} userById={userById} actorUserId={actorUserId} actorName={actorName} onNavigate={onNavigate} />
            </div>

            {/* Actividad */}
            <div className={`pt-4 ${tab === 'activity' ? 'block' : 'hidden'}`}>
              {history.length === 0 ? (
                <p className="text-[13px] font-light text-[#555555]">Sin actividad registrada</p>
              ) : (
                <div className="flex flex-col divide-y divide-white/[0.05]">
                  {history.map((event) => (
                    <div key={event.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0">
                      <span className="text-[13px] text-[#E5E5E5]">{event.description}</span>
                      <span className="text-[11px] text-[#666666]">{formatHistoryDate(event.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
