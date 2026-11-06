import { useMemo, useState } from 'react'
import { STAGES, daysSince, currencyPEN } from '../../lib/clientStages'
import { SearchIcon, PlusIcon } from '../icons'

// Clientes en el teléfono: sin tabla ni tablero que se deslicen de lado.
// Título grande con dos botones redondos (buscar y nuevo SPC), las etapas
// como filtros en una fila, un resumen de una línea y cada cliente como una
// tarjeta con su etapa, el monto, cuánto hace que hablaron y su siguiente paso.
const Chip = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className="flex-shrink-0 rounded-full px-4 py-2 text-[13.5px] font-medium" style={{ background: active ? '#F5F5F5' : '#1C1C1E', color: active ? '#0A0A0A' : '#9A9A9A' }}>
    {children}
  </button>
)

function ClientRow({ client, assignee, onOpen }) {
  const stage = STAGES.find((s) => s.id === client.stage)
  const isSP = stage?.type === 'SP'
  const last = daysSince(client.lastContactAt?.toDate?.() || client.createdAt?.toDate?.())
  const stale = last != null && last >= 14 && !isSP
  const initial = (assignee?.displayName || assignee?.email || '?').charAt(0).toUpperCase()
  return (
    <button type="button" onClick={() => onOpen(client)} className="flex w-full items-start gap-3.5 rounded-[24px] bg-[#1C1C1E] p-4 text-left active:bg-[#242426]">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[17px] font-semibold text-[#F5F5F5]">{client.name}</span>
          {client.code && <span className="flex-shrink-0 text-[12px] text-[#636366]">{client.code}</span>}
        </span>
        <span className="mt-0.5 block truncate text-[13.5px] text-[#8E8E93]">{[client.industria, client.contactName].filter(Boolean).join(' · ') || ' '}</span>
        <span className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full px-2.5 py-[3px] text-[12px] font-medium" style={{ background: isSP ? 'rgba(30,95,173,0.22)' : 'rgba(255,255,255,0.08)', color: isSP ? '#7DB2F0' : '#C9C9C9' }}>{stage?.label || client.stage}</span>
          {client.montoAcordado > 0 && <span className="text-[13px] font-medium tabular-nums text-[#E4E4E4]">{currencyPEN.format(client.montoAcordado)}</span>}
          {last != null && <span className="text-[12.5px]" style={{ color: stale ? '#D98A86' : '#8E8E93' }}>hace {last === 0 ? 'hoy' : `${last} d`}</span>}
        </span>
        {client.nextStep && <span className="mt-2 block truncate text-[13px] text-[#9A9A9A]">→ {client.nextStep}</span>}
      </span>
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2C2C2E] text-[12.5px] font-medium text-[#F5F5F5]" title={assignee?.displayName || ''}>{initial}</span>
    </button>
  )
}

export default function PhoneClientes({ clients, users, completedCount, lostCount, onOpenClient, onNew, onShowCompleted, onShowLost }) {
  const [stage, setStage] = useState('all')
  const [searching, setSearching] = useState(false)
  const [q, setQ] = useState('')

  const counts = useMemo(() => Object.fromEntries(STAGES.map((s) => [s.id, clients.filter((c) => c.stage === s.id).length])), [clients])
  const shown = useMemo(() => {
    let rows = clients
    if (stage !== 'all') rows = rows.filter((c) => c.stage === stage)
    const needle = q.trim().toLowerCase()
    if (needle) rows = rows.filter((c) => `${c.name} ${c.contactName || ''} ${c.industria || ''}`.toLowerCase().includes(needle))
    // Lo más urgente primero: el que lleva más días sin contacto.
    return [...rows].sort((a, b) => (daysSince(b.lastContactAt?.toDate?.() || b.createdAt?.toDate?.()) ?? 0) - (daysSince(a.lastContactAt?.toDate?.() || a.createdAt?.toDate?.()) ?? 0))
  }, [clients, stage, q])
  const pipeline = clients.filter((c) => c.stage !== 'intervencion_activa')
  const potencial = pipeline.reduce((s, c) => s + (c.montoAcordado || 0), 0)
  const byId = Object.fromEntries(users.map((u) => [u.id, u]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="ador-title min-w-0 flex-1 truncate">Clientes</h1>
        <button type="button" onClick={() => setSearching((v) => !v)} aria-label="Buscar" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-[#F5F5F5]"><SearchIcon size={17} /></button>
        <button type="button" onClick={onNew} aria-label="Nuevo SPC" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#0A0A0A]"><PlusIcon size={18} /></button>
      </div>

      {(searching || q) && (
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un cliente" className="w-full rounded-full bg-[#1C1C1E] px-5 py-3 text-[16px] text-[#F5F5F5] placeholder:text-[#8E8E93] outline-none" />
      )}

      <p className="px-1 text-[13.5px] text-[#8E8E93]">
        {pipeline.length} en pipeline · {currencyPEN.format(potencial)} potencial · {counts.intervencion_activa || 0} activos
      </p>

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex gap-2">
          <Chip active={stage === 'all'} onClick={() => setStage('all')}>Todos {clients.length}</Chip>
          {STAGES.map((s) => <Chip key={s.id} active={stage === s.id} onClick={() => setStage(s.id)}>{s.label} {counts[s.id] || 0}</Chip>)}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-[24px] bg-[#1C1C1E] px-5 py-8 text-center text-[14px] text-[#8E8E93]">{q ? 'Ningún cliente coincide.' : 'Aún no hay clientes en esta etapa.'}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map((c) => <ClientRow key={c.id} client={c} assignee={byId[c.assignedTo]} onOpen={onOpenClient} />)}
        </div>
      )}

      {(completedCount > 0 || lostCount > 0) && (
        <div className="mt-1 flex gap-2">
          {completedCount > 0 && <button type="button" onClick={onShowCompleted} className="rounded-full bg-[#1C1C1E] px-4 py-2 text-[13px] font-medium text-[#4CAF50]">Completados · {completedCount}</button>}
          {lostCount > 0 && <button type="button" onClick={onShowLost} className="rounded-full bg-[#1C1C1E] px-4 py-2 text-[13px] font-medium text-[#E5736F]">Perdidos · {lostCount}</button>}
        </div>
      )}
    </div>
  )
}
