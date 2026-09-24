import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { subscribeClients, subscribeUsers, getUserProfile, saveUserProfile, moveClientStage, createTask, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { daysSince, urgencyColor, currencyPEN, pendingPaymentAmount, pipelineHealth, stageLabel } from '../../lib/clientStages'
import { workstreamId as buildWorkstreamId, withTimeout } from '../../lib/workspace'
import { KanbanIcon, ListViewIcon, ArrowRightIcon, CheckCircleIcon } from '../icons'
import { useToast } from '../../hooks/useToast'
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

// Anything active (SPC or SP) that's gone 14+ days without contact — the
// same danger threshold `urgencyColor()` already uses everywhere else,
// promoted into its own panel instead of just a color on a card, since a
// stalled deal costs real pipeline value if nobody notices in time.
function RequiereAtencion({ clients, onOpenClient }) {
  const rows = clients
    .map((c) => ({ client: c, days: daysSince(c.lastContactAt?.toDate?.() || c.createdAt?.toDate?.()) }))
    .filter(({ days }) => days !== null && days >= 14)
    .sort((a, b) => b.days - a.days)

  return (
    <div className="ador-glass ador-grain rounded-2xl border p-5" style={{ borderColor: rows.length ? 'rgba(224,82,82,0.3)' : 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: rows.length ? '#E05252' : '#4CAF50' }} />
        <p className="text-[13px] font-semibold text-[#F5F5F5]">Requiere atención</p>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[#444444]">Nada estancado — todo con contacto reciente.</p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-white/[0.05]">
          {rows.map(({ client, days }) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onOpenClient(client)}
              className="flex items-center justify-between gap-2 py-2.5 text-left transition-opacity duration-150 hover:opacity-80"
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-[#F5F5F5]">{client.name}</p>
                <p className="truncate text-[11.5px] text-[#888888]">{stageLabel(client.stage)}</p>
              </div>
              <span className="flex-shrink-0 text-[11px] font-medium text-[#E05252]">{days}d sin contacto</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// SP clients (post-conversion) with a payment still Pendiente — real money
// at stake, not just pipeline activity. Only ever one amount owed at a time
// (pago2 stays locked until pago1's Recibido, see PagosTab.jsx), so
// `pendingPaymentAmount` never double-counts.
function PorCobrar({ clients, onOpenClient }) {
  const rows = clients
    .filter((c) => c.stage === 'intervencion_activa' && pendingPaymentAmount(c) > 0)
    .map((c) => ({ client: c, amount: pendingPaymentAmount(c), days: daysSince(c.stageEnteredAt?.toDate?.()) }))
    .sort((a, b) => (b.days ?? -1) - (a.days ?? -1))

  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="ador-glass ador-grain rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[#F5F5F5]">Por cobrar</p>
        {total > 0 && <span className="text-[12.5px] font-semibold text-[#B8860B]">{currencyPEN.format(total)}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[#444444]">Sin pagos pendientes.</p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-white/[0.05]">
          {rows.map(({ client, amount, days }) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onOpenClient(client)}
              className="flex items-center justify-between gap-2 py-2.5 text-left transition-opacity duration-150 hover:opacity-80"
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-[#F5F5F5]">{client.name}</p>
                <p className="truncate text-[11.5px] text-[#888888]">{days !== null ? `${days}d en intervención` : 'Intervención activa'}</p>
              </div>
              <span className="flex-shrink-0 text-[12px] font-medium text-[#B8860B]">{currencyPEN.format(amount)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// The funnel-health view a real CRM has and a card list alone can't answer:
// are we actually converting, where does time go, why do we lose the ones
// we lose. Every number is live-derived (see pipelineHealth in
// clientStages.js) — no separate manually-tracked metric.
function SaludPipeline({ clients }) {
  const { conversionRate, avgDaysInStage, lostBreakdown, lostTotal } = pipelineHealth(clients)

  return (
    <div className="ador-glass ador-grain rounded-2xl p-5">
      <p className="text-[13px] font-semibold text-[#F5F5F5]">Salud del pipeline</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[18px] font-semibold text-[#F5F5F5]">{conversionRate !== null ? `${conversionRate}%` : '—'}</p>
          <p className="text-[11px] text-[#666666]">Conversión SPC → SP</p>
        </div>
        <div>
          <p className="text-[18px] font-semibold text-[#F5F5F5]">{avgDaysInStage !== null ? `${avgDaysInStage}d` : '—'}</p>
          <p className="text-[11px] text-[#666666]">Promedio en etapa actual</p>
        </div>
      </div>
      {lostTotal > 0 && (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[#444444]">Por qué se pierden ({lostTotal})</p>
          <div className="flex flex-col gap-1.5">
            {lostBreakdown.map(({ reason, count }) => (
              <div key={reason} className="flex items-center justify-between text-[12px]">
                <span className="text-[#888888]">{reason}</span>
                <span className="text-[#666666]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Every open SPC's own `nextStep` (already a real, inline-editable field —
// see ListView.jsx) doubles as "what needs to happen next" across the whole
// pipeline. Sorted by days since last contact so the most neglected
// opportunities surface first — no separate "actions" concept invented.
// "→ Crear tarea" turns that text into a real Workspace task (title
// prefixed with the client's name so it's self-explanatory once it's living
// on its own in Hoy/Personal, assigned to the SPC's own associate) instead
// of leaving it as a note nobody actually works from — direct follow-up
// request that this panel should help execute, not just display.
function ProximasAcciones({ clients, onOpenClient, actorName, actorUserId }) {
  const showToast = useToast()
  const [creatingId, setCreatingId] = useState(null)
  const [createdIds, setCreatedIds] = useState(new Set())

  const rows = clients
    .filter((c) => c.nextStep?.trim())
    .map((c) => ({ client: c, days: daysSince(c.lastContactAt?.toDate?.() || c.createdAt?.toDate?.()) }))
    .sort((a, b) => (b.days ?? -1) - (a.days ?? -1))
    .slice(0, 5)

  const createTaskForClient = async (client) => {
    setCreatingId(client.id)
    try {
      const generalId = await findOrCreateGeneralProyecto(actorName)
      const assignedTo = client.assignedTo ? [client.assignedTo] : actorUserId ? [actorUserId] : []
      await withTimeout(
        createTask(
          {
            title: `${client.name}: ${client.nextStep.trim()}`,
            description: '',
            workstreamId: buildWorkstreamId('proyecto', generalId),
            assignedTo,
            priority: 'media',
            status: 'por_hacer',
          },
          actorName,
          actorUserId
        )
      )
      setCreatedIds((ids) => new Set(ids).add(client.id))
      showToast('Tarea creada en Workspace.')
    } catch (error) {
      showToast(`No se pudo crear la tarea: ${error.message}`)
    } finally {
      setCreatingId(null)
    }
  }

  return (
    <div className="ador-glass ador-grain rounded-2xl p-5">
      <p className="text-[13px] font-semibold text-[#F5F5F5]">Próximas acciones</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[#444444]">Sin siguientes pasos pendientes.</p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-white/[0.05]">
          {rows.map(({ client, days }) => {
            const created = createdIds.has(client.id)
            return (
              <div key={client.id} className="flex items-center gap-2.5 py-2.5">
                <button type="button" onClick={() => onOpenClient(client)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-opacity duration-150 hover:opacity-80">
                  <ArrowRightIcon size={12} className="flex-shrink-0 text-[#666666]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-[#F5F5F5]">{client.name}</p>
                    <p className="truncate text-[11.5px] text-[#888888]">{client.nextStep}</p>
                  </div>
                </button>
                {days !== null && (
                  <span className="flex-shrink-0 text-[10.5px]" style={{ color: urgencyColor(days) }}>
                    {days === 0 ? 'hoy' : `${days}d`}
                  </span>
                )}
                {created ? (
                  <span className="flex flex-shrink-0 items-center gap-1 text-[10.5px] text-[#4CAF50]">
                    <CheckCircleIcon size={12} /> Creada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => createTaskForClient(client)}
                    disabled={creatingId === client.id}
                    className="flex-shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10 disabled:opacity-50"
                    style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
                  >
                    {creatingId === client.id ? 'Creando…' : '→ Crear tarea'}
                  </button>
                )}
              </div>
            )
          })}
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
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ador-title">Clientes</h1>
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RequiereAtencion
              clients={activeClients}
              onOpenClient={(c) => {
                setSelectedClientId(c.id)
                setOriginRect(null)
              }}
            />
            <PorCobrar
              clients={spActivos}
              onOpenClient={(c) => {
                setSelectedClientId(c.id)
                setOriginRect(null)
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProximasAcciones
              clients={spcInPipeline}
              onOpenClient={(c) => {
                setSelectedClientId(c.id)
                setOriginRect(null)
              }}
              actorName={actorName}
              actorUserId={user?.uid}
            />
            <SaludPipeline clients={clients} />
          </div>
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
