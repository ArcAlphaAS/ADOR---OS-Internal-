import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { subscribeClients, subscribeUsers, getUserProfile, saveUserProfile, moveClientStage } from '../../lib/firestore'
import { KanbanIcon, ListViewIcon } from '../icons'
import KanbanBoard from './KanbanBoard'
import ListView from './ListView'
import LostClientsView from './LostClientsView'
import ClientDetailPanel from './ClientDetailPanel'
import NewClientModal from './NewClientModal'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

export default function ClientesModule({ user, focusClientId, onFocusHandled }) {
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [view, setView] = useState('kanban')
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [justConvertedId, setJustConvertedId] = useState(null)
  const prevStagesRef = useRef({})

  const actorName = actorNameFor(user)

  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeUsers(setUsers), [])

  // Opens straight to a client's Ficha when arriving from a global-search
  // result (see AppShell.jsx's `focus` state / SearchResults.jsx).
  useEffect(() => {
    if (!focusClientId) return
    setSelectedClientId(focusClientId)
    onFocusHandled?.()
  }, [focusClientId, onFocusHandled])

  useEffect(() => {
    if (!user?.uid) return
    getUserProfile(user.uid).then((profile) => {
      if (profile?.clientesView) setView(profile.clientesView)
    })
  }, [user?.uid])

  // Detect an SPC crossing into Intervención Activa (vs. just re-subscribing
  // on mount) so the glow-pulse conversion moment only fires on real moves.
  useEffect(() => {
    const prev = prevStagesRef.current
    for (const client of clients) {
      const before = prev[client.id]
      if (before && before !== 'intervencion_activa' && client.stage === 'intervencion_activa') {
        setJustConvertedId(client.id)
        setTimeout(() => setJustConvertedId((id) => (id === client.id ? null : id)), 1500)
      }
    }
    prevStagesRef.current = Object.fromEntries(clients.map((c) => [c.id, c.stage]))
  }, [clients])

  const changeView = (next) => {
    setView(next)
    if (user?.uid && user.uid !== 'preview') saveUserProfile(user.uid, { clientesView: next })
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null
  const activeClients = clients.filter((c) => !c.lost)
  const lostClients = clients.filter((c) => c.lost)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-12 pb-16 pt-10"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#F5F5F5]">Clientes</h1>
          <p className="mt-1 text-[13px] text-[#888888]">
            {activeClients.filter((c) => c.stage !== 'intervencion_activa').length} SPC en pipeline ·{' '}
            {activeClients.filter((c) => c.stage === 'intervencion_activa').length} SP activos
            {lostClients.length > 0 && ` · ${lostClients.length} perdidos`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="ador-glass flex items-center gap-1 rounded-full p-1">
            <button
              type="button"
              onClick={() => changeView('kanban')}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150"
              style={{ background: view === 'kanban' ? 'rgba(255,255,255,0.1)' : 'transparent', color: view === 'kanban' ? '#F5F5F5' : '#888888' }}
              title="Vista Kanban"
            >
              <KanbanIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => changeView('list')}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150"
              style={{ background: view === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent', color: view === 'list' ? '#F5F5F5' : '#888888' }}
              title="Vista Lista"
            >
              <ListViewIcon size={16} />
            </button>
          </div>

          {lostClients.length > 0 && (
            <button
              type="button"
              onClick={() => setView(view === 'perdidos' ? 'kanban' : 'perdidos')}
              className="rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors duration-150"
              style={{
                background: view === 'perdidos' ? 'rgba(224,82,82,0.12)' : 'transparent',
                color: view === 'perdidos' ? '#E05252' : '#666666',
              }}
            >
              Perdidos ({lostClients.length})
            </button>
          )}

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowNewModal(true)}
            className="ador-btn-primary rounded-full px-5 py-2.5 text-[13px] font-medium"
          >
            + Nuevo SPC
          </motion.button>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanBoard
          clients={activeClients}
          onOpenClient={(c) => setSelectedClientId(c.id)}
          onDropStage={(client, stage) => moveClientStage(client, stage, actorName)}
          justConvertedId={justConvertedId}
        />
      ) : view === 'list' ? (
        <ListView clients={activeClients} users={users} onOpenClient={(c) => setSelectedClientId(c.id)} actorName={actorName} />
      ) : (
        <LostClientsView clients={lostClients} onOpenClient={(c) => setSelectedClientId(c.id)} actorName={actorName} />
      )}

      <ClientDetailPanel client={selectedClient} actorName={actorName} onClose={() => setSelectedClientId(null)} />

      {showNewModal && (
        <NewClientModal
          users={users}
          actorName={actorName}
          onClose={() => setShowNewModal(false)}
          onCreated={(id) => {
            setShowNewModal(false)
            setSelectedClientId(id)
          }}
        />
      )}
    </motion.div>
  )
}
