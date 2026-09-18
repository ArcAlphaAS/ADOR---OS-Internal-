import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { subscribeClients, subscribeUsers, getUserProfile, saveUserProfile, moveClientStage } from '../../lib/firestore'
import { daysSince, urgencyColor, currencyPEN } from '../../lib/clientStages'
import { KanbanIcon, ListViewIcon, ArrowRightIcon } from '../icons'
import KanbanBoard from './KanbanBoard'
import ListView from './ListView'
import LostClientsView from './LostClientsView'
import ClientDetailPanel from './ClientDetailPanel'
import NewClientModal from './NewClientModal'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

const CLIENTES_VIEWS = [
  { id: 'kanban', label: 'Pipeline', Icon: KanbanIcon },
  { id: 'list', label: 'Lista', Icon: ListViewIcon },
]

function StatCard({ value, label }) {
  return (
    <div className="ador-glass rounded-2xl px-4 py-3.5">
      <p className="text-[18px] font-semibold text-[#F5F5F5]">{value}</p>
      <p className="text-[11px] text-[#666666]">{label}</p>
    </div>
  )
}

// Every open SPC's own `nextStep` (already a real, inline-editable field —
// see ListView.jsx) doubles as "what needs to happen next" across the whole
// pipeline. Sorted by days since last contact so the most neglected
// opportunities surface first — no separate "actions" concept invented.
function ProximasAcciones({ clients, onOpenClient }) {
  const rows = clients
    .filter((c) => c.nextStep?.trim())
    .map((c) => ({ client: c, days: daysSince(c.lastContactAt?.toDate?.() || c.createdAt?.toDate?.()) }))
    .sort((a, b) => (b.days ?? -1) - (a.days ?? -1))
    .slice(0, 5)

  return (
    <div className="ador-glass ador-grain rounded-2xl p-5">
      <p className="text-[13px] font-semibold text-[#F5F5F5]">Próximas acciones</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[#444444]">Sin siguientes pasos pendientes.</p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-white/[0.05]">
          {rows.map(({ client, days }) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onOpenClient(client)}
              className="flex items-center gap-2.5 py-2.5 text-left transition-opacity duration-150 hover:opacity-80"
            >
              <ArrowRightIcon size={12} className="flex-shrink-0 text-[#666666]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-[#F5F5F5]">{client.name}</p>
                <p className="truncate text-[11.5px] text-[#888888]">{client.nextStep}</p>
              </div>
              {days !== null && (
                <span className="flex-shrink-0 text-[10.5px]" style={{ color: urgencyColor(days) }}>
                  {days === 0 ? 'hoy' : `${days}d`}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClientesModule({ user, focusClientId, onFocusHandled }) {
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [view, setView] = useState('kanban')
  const [selectedClientId, setSelectedClientId] = useState(null)
  // Captured from the clicked card's own rect (ClientCard.jsx) so the Ficha
  // panel can visually grow from where you clicked instead of always
  // sliding in from the fixed right edge — the "spatial" feel from the
  // 2026-08-21 design note (Linear/Notion/Figma: things expand from where
  // you interacted with them, not from nowhere). Null for entry points that
  // don't have a clicked element (global search, List/Perdidos rows for
  // now), which just falls back to the plain slide-in in ClientDetailPanel.
  const [originRect, setOriginRect] = useState(null)
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
    setOriginRect(null)
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

  // Pipeline stats row — every number here is derived live from the same
  // `clients` collection everything else in this module reads, never a
  // separately-tracked figure. "Cerradas (YTD)" is SP conversions whose
  // `stageEnteredAt` falls in the current calendar year.
  const spcInPipeline = activeClients.filter((c) => c.stage !== 'intervencion_activa')
  const spActivos = activeClients.filter((c) => c.stage === 'intervencion_activa')
  const potencial = spcInPipeline.reduce((sum, c) => sum + (c.montoAcordado || 0), 0)
  const cerradasYTD = spActivos.filter((c) => {
    const d = c.stageEnteredAt?.toDate?.()
    return d && d.getFullYear() === new Date().getFullYear()
  }).length

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
          {/* Same sliding-indicator segmented control as Workspace's view
              switcher (WorkspaceModule.jsx) — Motion's layoutId moves one
              shared pill between buttons instead of each button recoloring
              on its own, so the two most-used parts of the app share the
              same "feel" instead of Clientes looking like an earlier era. */}
          <div className="ador-glass flex items-center gap-1 rounded-full p-1">
            {CLIENTES_VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => changeView(v.id)}
                className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-150"
                style={{ color: view === v.id ? '#F5F5F5' : '#888888' }}
              >
                {view === v.id && (
                  <motion.div
                    layoutId="clientes-view-indicator"
                    className="absolute inset-0 rounded-full"
                    style={{ background: '#1E5FAD' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <v.Icon size={14} />
                  {v.label}
                </span>
              </button>
            ))}
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

      {view === 'kanban' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard value={spcInPipeline.length} label="Oportunidades" />
          <StatCard value={currencyPEN.format(potencial)} label="Potencial" />
          <StatCard value={spActivos.length} label="Activas" />
          <StatCard value={cerradasYTD} label="Cerradas (YTD)" />
        </div>
      )}

      {view === 'kanban' ? (
        <div className="flex flex-col gap-5">
          <KanbanBoard
            clients={activeClients}
            users={users}
            onOpenClient={(c, rect) => {
              setSelectedClientId(c.id)
              setOriginRect(rect || null)
            }}
            onDropStage={(client, stage) => moveClientStage(client, stage, actorName)}
            justConvertedId={justConvertedId}
            onAddOpportunity={() => setShowNewModal(true)}
          />
          <ProximasAcciones
            clients={spcInPipeline}
            onOpenClient={(c) => {
              setSelectedClientId(c.id)
              setOriginRect(null)
            }}
          />
        </div>
      ) : view === 'list' ? (
        <ListView
          clients={activeClients}
          users={users}
          onOpenClient={(c) => {
            setSelectedClientId(c.id)
            setOriginRect(null)
          }}
          actorName={actorName}
        />
      ) : (
        <LostClientsView
          clients={lostClients}
          onOpenClient={(c) => {
            setSelectedClientId(c.id)
            setOriginRect(null)
          }}
          actorName={actorName}
        />
      )}

      <ClientDetailPanel
        client={selectedClient}
        actorName={actorName}
        originRect={originRect}
        onClose={() => setSelectedClientId(null)}
      />

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
