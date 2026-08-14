import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createTask, createProyectoInterno } from '../../lib/firestore'
import { LAYERS, currentLayer, workstreamId as buildWorkstreamId, TASK_ROW_GRID, withTimeout } from '../../lib/workspace'
import { ChevronDownIcon } from '../icons'
import { useToast } from '../../hooks/useToast'
import TaskRow from './TaskRow'

// Shown instead of a real workstream when the company has none yet — never
// persisted itself. The first task added through it silently provisions a
// real "General" Proyecto Interno and attaches the task there, so Workspace
// is usable from the very first click instead of gating everything behind
// "create a project first."
const GENERAL_WORKSTREAM = { id: null, kind: 'proyecto_interno', name: 'General' }

const COLUMN_HEADERS = ['', 'Tarea', 'Descripción', 'Asignado', 'Prioridad', 'Estimación', 'Estado']

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
              background: done ? '#1E5FAD' : isActive ? 'transparent' : 'rgba(255,255,255,0.08)',
              border: isActive ? '1px solid #1E5FAD' : 'none',
              color: done ? '#F5F5F5' : isActive ? '#1E5FAD' : '#444444',
            }}
          >
            {isActive ? (
              <span className="h-1.5 w-1.5 rounded-full bg-[#1E5FAD]" style={{ animation: 'ador-pulse 2s ease-in-out infinite' }} />
            ) : (
              layerNum
            )}
          </div>
        )
      })}
    </div>
  )
}

function InlineAddTask({ workstreamId, actorUserId, actorName }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const submit = async () => {
    if (!title.trim()) {
      setAdding(false)
      return
    }
    setSaving(true)
    try {
      let targetWorkstreamId = workstreamId
      if (!targetWorkstreamId) {
        const ref = await withTimeout(createProyectoInterno({ name: 'General' }, actorName))
        targetWorkstreamId = buildWorkstreamId('proyecto', ref.id)
      }
      await withTimeout(
        createTask(
          { title: title.trim(), workstreamId: targetWorkstreamId, assignedTo: [actorUserId], priority: 'media', dueDate: null },
          actorName
        )
      )
      setTitle('')
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

  return (
    <div className="px-2 py-1">
      <input
        autoFocus
        type="text"
        disabled={saving}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') {
            setTitle('')
            setAdding(false)
          }
        }}
        onBlur={submit}
        placeholder={saving ? 'Guardando...' : 'Título de la tarea — Enter para guardar'}
        className="w-full rounded-lg border border-white/[0.14] bg-[#141414] px-3 py-2 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-[#1E5FAD]/50 disabled:opacity-50"
      />
    </div>
  )
}

function WorkstreamGroup({ workstream, tasks, userById, users, onOpenTask, actorUserId, actorName }) {
  const [collapsed, setCollapsed] = useState(false)
  const completedCount = tasks.filter((t) => t.status === 'completado').length
  const pct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const accent = workstream.kind === 'intervencion' ? '#1E5FAD' : '#B8860B'

  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-l-2 px-5 py-3.5" style={{ borderColor: accent }}>
        <button type="button" onClick={() => setCollapsed((v) => !v)} className="flex flex-1 items-center gap-3 text-left">
          <ChevronDownIcon
            size={14}
            style={{ color: '#444444', transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms ease-out' }}
          />
          <span className="text-[14px] font-semibold text-[#F5F5F5]">{workstream.name}</span>
          {tasks.length > 0 && (
            <span className="text-[12px] text-[#444444]">
              {completedCount}/{tasks.length} · {pct}%
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 font-medium"
            style={{
              fontSize: 10,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: accent,
              background: `${accent}1F`,
            }}
          >
            {workstream.kind === 'intervencion' ? 'Intervención' : 'Proyecto Interno'}
          </span>
        </button>
        {workstream.kind === 'intervencion' && (
          <span className="flex-shrink-0 text-[11px] text-[#888888]">
            Semana {workstream.interventionWeek} de {workstream.interventionTotalWeeks}
          </span>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="h-[2px] w-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
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
            {workstream.kind === 'intervencion' && (
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
                <LayerIndicator week={workstream.interventionWeek} totalWeeks={workstream.interventionTotalWeeks} />
                <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(30,95,173,0.15)', color: '#1E5FAD' }}>
                  En curso
                </span>
              </div>
            )}

            <div className="overflow-x-auto px-3 pb-3">
              <div style={{ minWidth: 620 }}>
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
                  {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} userById={userById} users={users} onOpen={onOpenTask} />
                  ))}
                </div>

                <div className="pt-1">
                  <InlineAddTask workstreamId={workstream.id} actorUserId={actorUserId} actorName={actorName} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ListaView({ workstreams, tasksByWorkstream, userById, users, onOpenTask, actorUserId, actorName }) {
  const visibleGroups = workstreams.length > 0 ? workstreams : [GENERAL_WORKSTREAM]

  return (
    <div className="flex flex-col gap-5">
      {visibleGroups.map((w) => (
        <WorkstreamGroup
          key={w.id ?? 'general'}
          workstream={w}
          tasks={(w.id && tasksByWorkstream.get(w.id)) || []}
          userById={userById}
          users={users}
          onOpenTask={onOpenTask}
          actorUserId={actorUserId}
          actorName={actorName}
        />
      ))}
    </div>
  )
}
