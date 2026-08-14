import { useMemo, useState } from 'react'
import {
  STAGES,
  clientType,
  stageColor,
  urgencyColor,
  paymentStatusLabel,
  daysSince,
  currencyPEN,
} from '../../lib/clientStages'
import { updateClient, moveClientStage } from '../../lib/firestore'
import { EditIcon, ArrowRightIcon, SearchIcon } from '../icons'

function AsociadoAvatar({ uid, users }) {
  const person = users.find((u) => u.id === uid)
  const initial = (person?.displayName || person?.email || '?').charAt(0).toUpperCase()
  return (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1E5FAD] text-[12px] font-medium text-[#F5F5F5]"
      title={person?.displayName || person?.email || 'Sin asignar'}
    >
      {initial}
    </div>
  )
}

function NextStepCell({ client }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(client.nextStep || '')

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (value !== (client.nextStep || '')) updateClient(client.id, { nextStep: value })
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-lg border border-white/[0.12] bg-[#1A1A1A] px-2 py-1 text-[12px] text-[#F5F5F5] outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      className="text-left text-[12px] text-[#888888] hover:text-[#F5F5F5]"
    >
      {client.nextStep || <span className="text-[#444444]">Añadir siguiente paso</span>}
    </button>
  )
}

const FILTERS_DEFAULT = { stage: 'all', type: 'all', assignedTo: 'all', payment: 'all' }

export default function ListView({ clients, users, onOpenClient, actorName }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(FILTERS_DEFAULT)
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(() => {
    let rows = clients
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.contactName?.toLowerCase().includes(q)
      )
    }
    if (filters.stage !== 'all') rows = rows.filter((c) => c.stage === filters.stage)
    if (filters.type !== 'all') rows = rows.filter((c) => clientType(c.stage) === filters.type)
    if (filters.assignedTo !== 'all') rows = rows.filter((c) => c.assignedTo === filters.assignedTo)
    if (filters.payment !== 'all') rows = rows.filter((c) => paymentStatusLabel(c) === filters.payment)

    const sorted = [...rows].sort((a, b) => {
      let av, bv
      if (sortKey === 'name') [av, bv] = [a.name || '', b.name || '']
      else if (sortKey === 'stage') [av, bv] = [STAGES.findIndex((s) => s.id === a.stage), STAGES.findIndex((s) => s.id === b.stage)]
      else if (sortKey === 'revenue') [av, bv] = [a.revenueEstimado || 0, b.revenueEstimado || 0]
      else if (sortKey === 'contact') {
        av = daysSince(a.lastContactAt?.toDate?.() || a.createdAt?.toDate?.()) ?? -1
        bv = daysSince(b.lastContactAt?.toDate?.() || b.createdAt?.toDate?.()) ?? -1
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [clients, search, filters, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const paymentOptions = ['Pendiente', `${60}% recibido`, `${40}% recibido`, 'Pagado']

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="ador-glass flex items-center gap-2 rounded-full px-4 py-2">
          <SearchIcon size={14} style={{ color: '#888888' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar SPC/SP..."
            className="w-48 bg-transparent text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
          />
        </div>

        <select
          value={filters.stage}
          onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value }))}
          className="ador-glass rounded-full px-3 py-2 text-[12px] text-[#888888] outline-none"
        >
          <option value="all">Toda etapa</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="ador-glass rounded-full px-3 py-2 text-[12px] text-[#888888] outline-none"
        >
          <option value="all">SPC y SP</option>
          <option value="SPC">Solo SPC</option>
          <option value="SP">Solo SP</option>
        </select>

        <select
          value={filters.assignedTo}
          onChange={(e) => setFilters((f) => ({ ...f, assignedTo: e.target.value }))}
          className="ador-glass rounded-full px-3 py-2 text-[12px] text-[#888888] outline-none"
        >
          <option value="all">Todo asociado</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName || u.email}
            </option>
          ))}
        </select>

        <select
          value={filters.payment}
          onChange={(e) => setFilters((f) => ({ ...f, payment: e.target.value }))}
          className="ador-glass rounded-full px-3 py-2 text-[12px] text-[#888888] outline-none"
        >
          <option value="all">Todo pago</option>
          {paymentOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {[
                ['name', 'Organización'],
                ['type', 'Tipo'],
                ['stage', 'Etapa'],
                ['contact', 'Últ. contacto'],
                ['nextStep', 'Siguiente paso'],
                ['assigned', 'Asociado'],
                ['revenue', 'Potencial'],
                ['payment', 'Pago'],
              ].map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => ['name', 'stage', 'revenue', 'contact'].includes(key) && toggleSort(key)}
                  className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[#444444]"
                  style={{ cursor: ['name', 'stage', 'revenue', 'contact'].includes(key) ? 'pointer' : 'default' }}
                >
                  {label}
                  {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-[13px] font-light text-[#444444]">
                  Sin SPC/SP que coincidan con los filtros
                </td>
              </tr>
            ) : (
              filtered.map((client) => {
                const type = clientType(client.stage)
                const stage = STAGES.find((s) => s.id === client.stage)
                const days = daysSince(client.lastContactAt?.toDate?.() || client.createdAt?.toDate?.())
                return (
                  <tr
                    key={client.id}
                    onClick={() => onOpenClient(client)}
                    className="group cursor-pointer border-b border-white/[0.04] transition-colors duration-150 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[12px] font-medium text-[#F5F5F5]">
                          {client.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-[#F5F5F5]">{client.name}</div>
                          <div className="text-[11px] text-[#888888]">{client.contactName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em]"
                        style={{ background: 'rgba(255,255,255,0.06)', color: type === 'SP' ? '#1E5FAD' : '#888888' }}
                      >
                        {type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{ background: `${stageColor(client.stage)}22`, color: stageColor(client.stage) }}
                      >
                        {stage?.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px]" style={{ color: urgencyColor(days) }}>
                      {days === null ? '—' : days === 0 ? 'Hoy' : `${days}d`}
                    </td>
                    <td className="px-5 py-3">
                      <NextStepCell client={client} />
                    </td>
                    <td className="px-5 py-3">
                      <AsociadoAvatar uid={client.assignedTo} users={users} />
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#888888]">
                      {client.revenueEstimado ? currencyPEN.format(client.revenueEstimado) : '—'}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#888888]">{paymentStatusLabel(client)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenClient(client)
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] hover:bg-white/[0.08] hover:text-[#F5F5F5]"
                          title="Editar"
                        >
                          <EditIcon size={14} />
                        </button>
                        {(() => {
                          const idx = STAGES.findIndex((s) => s.id === client.stage)
                          const next = STAGES[idx + 1]
                          if (!next) return null
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                moveClientStage(client, next.id, actorName)
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] hover:bg-white/[0.08] hover:text-[#F5F5F5]"
                              title={`Mover a ${next.label}`}
                            >
                              <ArrowRightIcon size={14} />
                            </button>
                          )
                        })()}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
