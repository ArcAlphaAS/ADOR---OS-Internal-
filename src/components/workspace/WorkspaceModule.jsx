import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceData } from '../../hooks/useWorkspaceData'
import { subscribeDecisions, getUserProfile, saveUserProfile } from '../../lib/firestore'
import { KanbanIcon, ListViewIcon, TimelineIcon } from '../icons'
import WorkspaceSidebar from './WorkspaceSidebar'
import ListaView from './ListaView'
import KanbanView from './KanbanView'
import TimelineView from './TimelineView'
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
]

export default function WorkspaceModule({ user }) {
  const { workstreams, tasksByWorkstream, tasks, users, userById } = useWorkspaceData()
  const [decisions, setDecisions] = useState([])
  const [view, setView] = useState('lista')
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState(null)
  const [openTaskId, setOpenTaskId] = useState(null)
  const [showNewProyecto, setShowNewProyecto] = useState(false)
  const [showRegisterDecision, setShowRegisterDecision] = useState(false)

  const actorName = actorNameFor(user)

  useEffect(() => subscribeDecisions(setDecisions), [])

  useEffect(() => {
    if (!user?.uid) return
    getUserProfile(user.uid).then((profile) => {
      if (profile?.workspaceView) setView(profile.workspaceView)
    })
  }, [user?.uid])

  const changeView = (next) => {
    setView(next)
    if (user?.uid && user.uid !== 'preview') saveUserProfile(user.uid, { workspaceView: next })
  }

  const workstreamById = Object.fromEntries(workstreams.map((w) => [w.id, w]))
  const visibleWorkstreams = selectedWorkstreamId ? workstreams.filter((w) => w.id === selectedWorkstreamId) : workstreams
  const visibleTasks = selectedWorkstreamId ? tasks.filter((t) => t.workstreamId === selectedWorkstreamId) : tasks

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
        onSelect={setSelectedWorkstreamId}
        onNewProyecto={() => setShowNewProyecto(true)}
      />

      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[#F5F5F5]">Workspace</h1>
            <p className="text-[13px] text-[#888888]">Intervenciones y Proyectos Internos — todo lo que ADOR ejecuta.</p>
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
          {view === 'lista' ? (
            <motion.div key="lista" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <ListaView
                workstreams={visibleWorkstreams}
                tasksByWorkstream={tasksByWorkstream}
                userById={userById}
                users={users}
                onOpenTask={(t) => setOpenTaskId(t.id)}
                actorUserId={user?.uid}
                actorName={actorName}
              />
            </motion.div>
          ) : view === 'kanban' ? (
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <KanbanView tasks={visibleTasks} workstreamById={workstreamById} userById={userById} onOpenTask={(t) => setOpenTaskId(t.id)} />
            </motion.div>
          ) : (
            <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TimelineView
                workstreams={visibleWorkstreams}
                tasksByWorkstream={tasksByWorkstream}
                onOpenTask={(t) => setOpenTaskId(t.id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DecisionesPanel decisions={decisions} onRegister={() => setShowRegisterDecision(true)} />

      <AnimatePresence>
        {openTask && (
          <TaskDetailPanel
            task={openTask}
            workstream={workstreamById[openTask.workstreamId]}
            users={users}
            userById={userById}
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
