import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceData } from '../../hooks/useWorkspaceData'
import { subscribeNotes, getUserProfile, saveUserProfile } from '../../lib/firestore'
import { computeWorkload, isDueToday, isOverdue, isPendingFor } from '../../lib/workspace'
import { KanbanIcon, ListViewIcon, TimelineIcon, CalendarIcon } from '../icons'
import WorkspaceSidebar from './WorkspaceSidebar'
import HoyView from './HoyView'
import ListaView from './ListaView'
import PersonalOverview from './PersonalOverview'
import KanbanView from './KanbanView'
import TimelineView from './TimelineView'
import TaskDetailPanel from './TaskDetailPanel'
import NewProyectoModal from './NewProyectoModal'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

// "Hoy" leads the list on purpose — see HoyView.jsx for the reasoning
// (Sunsama/Akiflow's "today first" model over Linear's backlog-triage one).
// Every tab now carries a text label, not just an icon, after direct
// feedback that an icon-only switcher didn't read as self-explanatory to a
// non-technical founder opening this for the first time. Notas used to be
// its own tab here — folded into Hoy the same day (see HoyView.jsx) after
// feedback that a separate personal-notebook tab felt redundant with a
// personal-today tab; there's only one "your day" screen now.
const VIEWS = [
  { id: 'hoy', label: 'Hoy', Icon: CalendarIcon },
  { id: 'lista', label: 'Lista', Icon: ListViewIcon },
  { id: 'kanban', label: 'Kanban', Icon: KanbanIcon },
  { id: 'timeline', label: 'Timeline', Icon: TimelineIcon },
]

const HEADER_COPY = {
  hoy: {
    title: () => 'Hoy',
    subtitle: () => 'Lo vencido, lo que vence hoy, y lo que anotes — tu único punto de partida del día.',
  },
}

export default function WorkspaceModule({ user, focusTaskId, onFocusHandled, onNavigate }) {
  const { workstreams, tasksByWorkstream, tasks, users, userById } = useWorkspaceData()
  const [notes, setNotes] = useState([])
  const [view, setView] = useState('hoy')
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState(null)
  const [onlyMine, setOnlyMine] = useState(false)
  const [openTaskId, setOpenTaskId] = useState(null)
  const [showNewProyecto, setShowNewProyecto] = useState(false)

  const actorName = actorNameFor(user)

  useEffect(() => subscribeNotes(setNotes), [])

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
      // Falls back to 'hoy' for anyone whose stored preference is the now-
      // removed 'notas' tab (folded into Hoy — see VIEWS above).
      if (profile?.workspaceView && VIEWS.some((v) => v.id === profile.workspaceView)) setView(profile.workspaceView)
    })
  }, [user?.uid])

  const changeView = (next) => {
    setView(next)
    if (user?.uid && user.uid !== 'preview') saveUserProfile(user.uid, { workspaceView: next })
  }

  const workstreamById = Object.fromEntries(workstreams.map((w) => [w.id, w]))

  // A task pending your own confirmation (see AssignmentConfirmGate.jsx)
  // doesn't count as "yours" yet anywhere in Workspace — it's excluded from
  // Personal counts/filters and Hoy until you accept or reject it.
  const isMine = (t) => (t.assignedTo || []).includes(user?.uid) && !isPendingFor(t, user?.uid)
  const myTaskCount = tasks.filter((t) => isMine(t) && t.status !== 'completado').length
  const myUrgentCount = tasks.filter((t) => isMine(t) && t.status !== 'completado' && (isOverdue(t) || isDueToday(t))).length
  const workload = computeWorkload(tasks, users)

  // Equipo scope (Todo / a selected Intervención / Proyecto) and the
  // Personal filter (everything assigned to me, any workstream) are
  // mutually exclusive — one active scope at a time, applied only to the
  // Lista/Kanban/Timeline team views. Hoy (above) is its own always-personal
  // view and doesn't go through this at all.
  const matchesFilter = (t) => (onlyMine ? isMine(t) : true)

  const byWorkstream = selectedWorkstreamId ? workstreams.filter((w) => w.id === selectedWorkstreamId) : workstreams
  const visibleTasks = tasks.filter((t) => (!selectedWorkstreamId || t.workstreamId === selectedWorkstreamId) && matchesFilter(t))
  const visibleTasksByWorkstream = onlyMine
    ? new Map([...tasksByWorkstream].map(([id, list]) => [id, list.filter(matchesFilter)]))
    : tasksByWorkstream
  const visibleWorkstreams = onlyMine ? byWorkstream.filter((w) => (visibleTasksByWorkstream.get(w.id) || []).length > 0) : byWorkstream

  const selectWorkstream = (id) => {
    setOnlyMine(false)
    setSelectedWorkstreamId(id)
  }
  const toggleOnlyMine = () => {
    setSelectedWorkstreamId(null)
    setOnlyMine((v) => !v)
  }

  const openTask = tasks.find((t) => t.id === openTaskId) || null
  const headerCopy = HEADER_COPY[view]
  // Page titles for the Lista/Kanban/Timeline scopes — deliberately not
  // "Workspace" here (direct feedback: "Workspace" is the whole section's
  // name, using it again as a page title inside itself said nothing about
  // whether you're looking at your own work or the team's). "Personal" and
  // "Grupo" stay as the short sidebar labels; the page title spells out the
  // same distinction more fully.
  const title = headerCopy ? headerCopy.title() : onlyMine ? 'Proyectos Individuales' : 'Proyectos Colaborativos'
  const subtitle = headerCopy
    ? headerCopy.subtitle()
    : onlyMine
      ? 'Todo lo asignado a ti, cruzando Intervenciones y Proyectos Internos.'
      : 'Intervenciones y Proyectos Internos — todo lo que ADOR ejecuta con el equipo.'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex h-full"
    >
      {view !== 'hoy' && (
        <WorkspaceSidebar
          workstreams={workstreams}
          selectedId={selectedWorkstreamId}
          onSelect={selectWorkstream}
          onNewProyecto={() => setShowNewProyecto(true)}
          onlyMine={onlyMine}
          onToggleOnlyMine={toggleOnlyMine}
          myTaskCount={myTaskCount}
          workload={workload}
        />
      )}

      <div className="min-w-0 flex-1 overflow-y-auto px-4 pb-16 pt-6 md:px-8 lg:pt-10">
        {/* Hoy renders its own richer header (date, rotating quote, live
            stats — see HoyHeader in HoyView.jsx), so the generic
            title/subtitle here would just be a redundant second "Hoy"
            sitting right above it. Every other view still uses it. */}
        <div className={`mb-6 flex flex-wrap items-center gap-3 ${view === 'hoy' ? 'justify-end' : 'justify-between'}`}>
          {/* Phones: the side filter column is hidden, so the same choice
              (Personal / Grupo / one workstream) is a compact select here. */}
          {view !== 'hoy' && (
            <select
              value={onlyMine ? '__mine' : selectedWorkstreamId || '__all'}
              onChange={(e) => {
                const v = e.target.value
                if (v === '__mine') {
                  if (!onlyMine) toggleOnlyMine()
                } else selectWorkstream(v === '__all' ? null : v)
              }}
              className="w-full rounded-xl border border-white/[0.1] bg-[#141414] px-3 py-2 text-[13px] text-[#DDDDDD] outline-none md:hidden"
            >
              <option value="__mine">Personal — lo mío</option>
              <option value="__all">Grupo — todo el equipo</option>
              {workstreams.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
          {view !== 'hoy' && (
            <div>
              <h1 className="ador-title">{title}</h1>
              <p className="text-[13px] text-[#888888]">{subtitle}</p>
            </div>
          )}
          {/* A real iOS segmented control slides its selection background
              between segments rather than just recoloring each one —
              Motion's layoutId does exactly that: the same element "moves"
              from the old active button to the new one with a spring. */}
          <div className="ador-glass flex items-center gap-1 rounded-full p-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => changeView(v.id)}
                className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-150"
                style={{ color: view === v.id ? '#F5F5F5' : '#888888' }}
              >
                {view === v.id && (
                  <motion.div
                    layoutId="workspace-view-indicator"
                    className="absolute inset-0 rounded-full"
                    style={{ background: '#1E5FAD' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <v.Icon size={14} />
                  <span className="hidden sm:inline">{v.label}</span>
                  {v.id === 'hoy' && myUrgentCount > 0 && view !== 'hoy' && (
                    <span
                      className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold"
                      style={{ background: '#EF5350', color: '#F5F5F5' }}
                    >
                      {myUrgentCount}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === 'hoy' ? (
            <motion.div key="hoy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <HoyView
                user={user}
                tasks={tasks}
                userId={user?.uid}
                userById={userById}
                users={users}
                workstreams={workstreams}
                workstreamById={workstreamById}
                onOpenTask={(t) => setOpenTaskId(t.id)}
                actorUserId={user?.uid}
                actorName={actorName}
                notes={notes}
                onNavigate={onNavigate}
              />
            </motion.div>
          ) : view === 'lista' ? (
            <motion.div key="lista" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {onlyMine ? (
                <PersonalOverview
                  user={user}
                  tasks={tasks}
                  workstreams={workstreams}
                  workstreamById={workstreamById}
                  userById={userById}
                  users={users}
                  onOpenTask={(t) => setOpenTaskId(t.id)}
                  actorUserId={user?.uid}
                  actorName={actorName}
                  onToggleOnlyMine={toggleOnlyMine}
                  onGoToHoy={() => changeView('hoy')}
                  onNavigate={onNavigate}
                  onNewProyecto={() => setShowNewProyecto(true)}
                />
              ) : (
                <ListaView
                  workstreams={visibleWorkstreams}
                  tasksByWorkstream={visibleTasksByWorkstream}
                  userById={userById}
                  users={users}
                  onOpenTask={(t) => setOpenTaskId(t.id)}
                  actorUserId={user?.uid}
                  actorName={actorName}
                  emptyLabel="General"
                />
              )}
            </motion.div>
          ) : view === 'kanban' ? (
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <KanbanView
                tasks={visibleTasks}
                workstreamById={workstreamById}
                userById={userById}
                onOpenTask={(t) => setOpenTaskId(t.id)}
                actorUserId={user?.uid}
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

      <AnimatePresence>
        {openTask && (
          <TaskDetailPanel
            task={openTask}
            workstream={workstreamById[openTask.workstreamId]}
            users={users}
            userById={userById}
            actorUserId={user?.uid}
            actorName={actorName}
            onClose={() => setOpenTaskId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{showNewProyecto && <NewProyectoModal actorName={actorName} onClose={() => setShowNewProyecto(false)} />}</AnimatePresence>
    </motion.div>
  )
}
