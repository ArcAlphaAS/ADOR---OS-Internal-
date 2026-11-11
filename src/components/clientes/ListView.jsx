import { useMemo, useState } from 'react'
import {
  STAGES,
  clientType,
  stageColor,
  urgencyColor,
  paymentStatusLabel,
  daysSince,
  currencyPEN,
  contactDate,
} from '../../lib/clientStages'
import { updateClient, moveClientStage } from '../../lib/firestore'
import { EditIcon, ArrowRightIcon, SearchIcon } from '../icons'

function AsociadoAvatar({ uid, users }) {
  const person = users.find((u) => u.id === uid)
  const initial = (person?.displayName || person?.email || '?').charAt(0).toUpperCase()
  return (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2C2C2E] text-[12px] font-medium text-[#F5F5F5]"
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
      {client.nextStep || <span className="text-[#8A8A8A]">Añadir siguiente paso</span>}
    </button>
  )
}

const FILTERS_DEFAULT = { stage: 'all', type: 'all', assignedTo: 'all', payment: 'all' }

export default function ListView({ clients, users, onOpenClient, onContextClient, actorName }) {
  const search = ''
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
      else if (sortKey === 'code') [av, bv] = [a.code || '', b.code || '']
      else if (sortKey === 'type') [av, bv] = [clientType(a.stage), clientType(b.stage)]
      else if (sortKey === 'nextStep') [av, bv] = [a.nextStep || '', b.nextStep || '']
      else if (sortKey === 'payment') [av, bv] = [paymentStatusLabel(a), paymentStatusLabel(b)]
      else if (sortKey === 'assigned') [av, bv] = [users.find((u) => u.id === a.assignedTo)?.displayName || '', users.find((u) => u.id === b.assignedTo)?.displayName || '']
      else if (sortKey === 'stage') [av, bv] = [STAGES.findIndex((s) => s.id === a.stage), STAGES.findIndex((s) => s.id === b.stage)]
      else if (sortKey === 'revenue') [av, bv] = [a.revenueEstimado || 0, b.revenueEstimado || 0]
      else if (sortKey === 'contact') {
        av = daysSince(contactDate(a)) ?? -1
        bv = daysSince(contactDate(b)) ?? -1
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [clients, search, filters, sortKey, sortDir, users])

  const onKeys = (e) => {
    const row = e.target.closest?.('[data-client-id]')
    if (!row || e.target.closest('select,input,button')) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const rows = [...e.currentTarget.querySelectorAll('[data-client-id]')]
      rows[rows.indexOf(row) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onOpenClient(filtered.find((c) => c.id === row.dataset.clientId))
    }
  }

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
                ['code', 'ID'],
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
                  onClick={() => toggleSort(key)}
                  className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[#8A8A8A]"
                  style={{ cursor: 'pointer' }}
                >
                  {label}
                  {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody onKeyDown={onKeys}>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-[13px] font-light text-[#8A8A8A]">
                  Sin SPC/SP que coincidan con los filtros
                </td>
              </tr>
            ) : (
              filtered.map((client) => {
                const type = clientType(client.stage)
                const days = daysSince(contactDate(client))
                return (
                  <tr
                    key={client.id}
                    data-client-id={client.id}
                    tabIndex={0}
                    onClick={() => onOpenClient(client)}
                    onContextMenu={(e) => {
                      if (!onContextClient) return
                      e.preventDefault()
                      onContextClient(client, e.clientX, e.clientY)
                    }}
                    className="group cursor-pointer border-b border-white/[0.04] outline-none transition-colors duration-150 hover:bg-white/[0.03] focus-visible:bg-white/[0.07]"
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-[11px] tracking-[0.03em] text-[#8A8A8A]">
                        {client.code || '—'}
                      </span>
                    </td>
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
                        style={{ background: 'rgba(255,255,255,0.06)', color: type === 'SP' ? '#F4EEE2' : '#888888' }}
                      >
                        {type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={client.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => moveClientStage(client, e.target.value, actorName)}
                        className="cursor-pointer appearance-none rounded-full px-2.5 py-1 text-[11px] font-medium outline-none"
                        style={{ background: `${stageColor(client.stage)}22`, color: stageColor(client.stage) }}
                        title="Cambiar etapa"
                      >
                        {STAGES.map((st) => (
                          <option key={st.id} value={st.id} style={{ color: '#111' }}>{st.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-[12px]" style={{ color: urgencyColor(days) }}>
                      {days === null ? '—' : days === 0 ? 'Hoy' : `${days}d`}
                    </td>
                    <td className="px-5 py-3">
                      <NextStepCell client={client} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="relative" onClick={(e) => e.stopPropagation()} title="Cambiar responsable">
                        <AsociadoAvatar uid={client.assignedTo} users={users} />
                        <select
                          value={client.assignedTo || ''}
                          onChange={(e) => updateClient(client.id, { assignedTo: e.target.value || null })}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        >
                          <option value="">Sin asignar</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                          ))}
                        </select>
                      </div>
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
