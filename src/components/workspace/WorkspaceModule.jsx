import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceData } from '../../hooks/useWorkspaceData'
import { subscribeDecisions, getUserProfile, saveUserProfile } from '../../lib/firestore'
import { computeWorkload, isDueToday } from '../../lib/workspace'
import { KanbanIcon, ListViewIcon, TimelineIcon, NoteIcon } from '../icons'
import WorkspaceSidebar from './WorkspaceSidebar'
import ListaView from './ListaView'
import KanbanView from './KanbanView'
import TimelineView from './TimelineView'
import NotasView from './NotasView'
import TaskDetailPanel from './TaskDetailPanel'
import DecisionesPanel from './DecisionesPanel'
import NewProyectoModal from './NewProyectoModal'
import RegisterDecisionModal from './RegisterDecisionModal'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

const VIEWS = [
  { id: 'lista', label: 'Lista', Icon: ListViewIcon },
  { id: 'kanban', label: 'Kanban', Icon: KanbanIcon },
  { id: 'timeline', label: 'Timeline', Icon: TimelineIcon },
  { id: 'notas', label: 'Notas', Icon: NoteIcon },
]

export default function WorkspaceModule({ user, focusTaskId, onFocusHandled }) {
  const { workstreams, tasksByWorkstream, tasks, users, userById } = useWorkspaceData()
  const [decisions, setDecisions] = useState([])
  const [view, setView] = useState('lista')
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState(null)
  const [onlyMine, setOnlyMine] = useState(false)
  const [todayOnly, setTodayOnly] = useState(false)
  const [openTaskId, setOpenTaskId] = useState(null)
  const [showNewProyecto, setShowNewProyecto] = useState(false)
  const [showRegisterDecision, setShowRegisterDecision] = useState(false)
  const [decisionesCollapsed, setDecisionesCollapsed] = useState(false)

  const actorName = actorNameFor(user)

  useEffect(() => subscribeDecisions(setDecisions), [])

  // Opens straight to a task's detail panel when arriving from a
  // global-search result (see AppShell.jsx's `focus` state / SearchResults.jsx).
  useEffect(() => {
    if (!focusTaskId) return
    setOpenTaskId(focusTaskId)
    onFocusHandled?.()
  }, [focusTaskId, onFocusHandled])

  useEffect(() => {
    if (!user?.uid) return
    getUserProfile(user.uid).then((profile) => {
      if (profile?.workspaceView) setView(profile.workspaceView)
      if (typeof profile?.decisionesCollapsed === 'boolean') setDecisionesCollapsed(profile.decisionesCollapsed)
    })
  }, [user?.uid])

  const changeView = (next) => {
    setView(next)
    if (user?.uid && user.uid !== 'preview') saveUserProfile(user.uid, { workspaceView: next })
  }

  const toggleDecisionesCollapsed = () => {
    const next = !decisionesCollapsed
    setDecisionesCollapsed(next)
    if (user?.uid && user.uid !== 'preview') saveUserProfile(user.uid, { decisionesCollapsed: next })
  }

  const workstreamById = Object.fromEntries(workstreams.map((w) => [w.id, w]))

  const isMine = (t) => (t.assignedTo || []).includes(user?.uid)
  const myTaskCount = tasks.filter((t) => isMine(t) && t.status !== 'completado').length
  const myTodayCount = tasks.filter((t) => isMine(t) && isDueToday(t) && t.status !== 'completado').length
  const workload = computeWorkload(tasks, users)

  // "Personal" (onlyMine) and "Hoy" (todayOnly) are both cross-workstream
  // personal filters — the difference is scope (everything assigned to you
  // vs. just what's due today) — while a selected workstream is the team/
  // Equipo scope (Intervenciones + Proyectos Internos). All three are
  // mutually exclusive, same one-filter-at-a-time model as before; only the
  // predicate changes based on which is active. See the 2026-09-16 redesign:
  // the user specifically wanted "tareas del día" separated from "tareas
  // personales" and from "tareas de equipo," not folded into one toggle.
  const matchesFilter = (t) => {
    if (todayOnly) return isMine(t) && isDueToday(t)
    if (onlyMine) return isMine(t)
    return true
  }
  const filterActive = todayOnly || onlyMine

  const byWorkstream = selectedWorkstreamId ? workstreams.filter((w) => w.id === selectedWorkstreamId) : workstreams
  const visibleTasks = tasks.filter((t) => (!selectedWorkstreamId || t.workstreamId === selectedWorkstreamId) && matchesFilter(t))
  const visibleTasksByWorkstream = filterActive
    ? new Map([...tasksByWorkstream].map(([id, list]) => [id, list.filter(matchesFilter)]))
    : tasksByWorkstream
  const visibleWorkstreams = filterActive ? byWorkstream.filter((w) => (visibleTasksByWorkstream.get(w.id) || []).length > 0) : byWorkstream

  const selectWorkstream = (id) => {
    setOnlyMine(false)
    setTodayOnly(false)
    setSelectedWorkstreamId(id)
  }
  const toggleOnlyMine = () => {
    setSelectedWorkstreamId(null)
    setTodayOnly(false)
    setOnlyMine((v) => !v)
  }
  const toggleToday = () => {
    setSelectedWorkstreamId(null)
    setOnlyMine(false)
    setTodayOnly((v) => !v)
  }

  const openTask = tasks.find((t) => t.id === openTaskId) || null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex h-full"
    >
      <WorkspaceSidebar
        workstreams={workstreams}
        selectedId={selectedWorkstreamId}
        onSelect={selectWorkstream}
        onNewProyecto={() => setShowNewProyecto(true)}
        onlyMine={onlyMine}
        onToggleOnlyMine={toggleOnlyMine}
        myTaskCount={myTaskCount}
        todayOnly={todayOnly}
        onToggleToday={toggleToday}
        myTodayCount={myTodayCount}
        workload={workload}
      />

      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[#F5F5F5]">
              {view === 'notas' ? 'Notas' : todayOnly ? 'Hoy' : onlyMine ? 'Personal' : 'Workspace'}
            </h1>
            <p className="text-[13px] text-[#888888]">
              {view === 'notas'
                ? 'Tareas personales, ideas, lo del día — tu cuaderno, no el tablero formal del equipo.'
                : todayOnly
                  ? 'Lo que vence hoy, asignado a ti — tu enfoque del día.'
                  : onlyMine
                    ? 'Todo lo asignado a ti, cruzando Intervenciones y Proyectos Internos.'
                    : 'Intervenciones y Proyectos Internos — todo lo que ADOR ejecuta con el equipo.'}
            </p>
          </div>
          <div className="ador-glass flex items-center gap-1 rounded-full p-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => changeView(v.id)}
                title={v.label}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150"
                style={{ background: view === v.id ? '#1E5FAD' : 'transparent', color: view === v.id ? '#F5F5F5' : '#888888' }}
              >
                <v.Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === 'notas' ? (
            <motion.div key="notas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <NotasView actorName={actorName} />
            </motion.div>
          ) : filterActive && visibleWorkstreams.length === 0 ? (
            <motion.div key="empty-filter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex flex-col items-center gap-3 py-24">
                <div className="ador-skeleton h-[2px] w-1/3 rounded-full" />
                <p className="text-[14px] font-light text-[#444444]">
                  {todayOnly ? 'Nada vence hoy — buen momento para adelantar.' : 'Sin tareas asignadas a ti — todo al día.'}
                </p>
              </div>
            </motion.div>
          ) : view === 'lista' ? (
            <motion.div key="lista" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <ListaView
                workstreams={visibleWorkstreams}
                tasksByWorkstream={visibleTasksByWorkstream}
                userById={userById}
                users={users}
                onOpenTask={(t) => setOpenTaskId(t.id)}
                actorUserId={user?.uid}
                actorName={actorName}
              />
            </motion.div>
          ) : view === 'kanban' ? (
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <KanbanView
                tasks={visibleTasks}
                workstreamById={workstreamById}
                userById={userById}
                onOpenTask={(t) => setOpenTaskId(t.id)}
                actorName={actorName}
              />
            </motion.div>
          ) : (
            <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TimelineView
                workstreams={visibleWorkstreams}
                tasksByWorkstream={visibleTasksByWorkstream}
                onOpenTask={(t) => setOpenTaskId(t.id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DecisionesPanel
        decisions={decisions}
        onRegister={() => setShowRegisterDecision(true)}
        collapsed={decisionesCollapsed}
        onToggleCollapse={toggleDecisionesCollapsed}
      />

      <AnimatePresence>
        {openTask && (
          <TaskDetailPanel
            task={openTask}
            workstream={workstreamById[openTask.workstreamId]}
            users={users}
            userById={userById}
            actorName={actorName}
            onClose={() => setOpenTaskId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewProyecto && <NewProyectoModal actorName={actorName} onClose={() => setShowNewProyecto(false)} />}
        {showRegisterDecision && (
          <RegisterDecisionModal workstreams={workstreams} actorName={actorName} onClose={() => setShowRegisterDecision(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
