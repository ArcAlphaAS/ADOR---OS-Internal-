import { useEffect, useMemo, useState } from 'react'
import { subscribeAllTasks, subscribeClients, subscribeObjetivos } from '../../lib/firestore'
import { stageLabel } from '../../lib/clientStages'
import { statusMeta } from '../../lib/workspace'
import { quarterKey } from '../../lib/finance'

const TYPES = [
  { id: 'task', label: 'Tarea', emoji: '✅' },
  { id: 'client', label: 'Cliente', emoji: '🏢' },
  { id: 'objetivo', label: 'Objetivo', emoji: '🎯' },
]

// "Compartir algo de ADOR OS" from the composer: pick a task, client or
// objetivo and it goes into the conversation as a card that opens it. The
// three lists are only subscribed while this panel is open.
export default function ItemPicker({ onPick, onClose }) {
  const [type, setType] = useState('task')
  const [query, setQuery] = useState('')
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [objetivos, setObjetivos] = useState([])
  useEffect(() => subscribeAllTasks(setTasks), [])
  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeObjetivos(setObjetivos), [])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list =
      type === 'task'
        ? tasks.map((t) => ({ id: t.id, title: t.title, subtitle: statusMeta(t.status).label, open: t.status !== 'completado' }))
        : type === 'client'
          ? clients.filter((c) => !c.lost).map((c) => ({ id: c.id, title: c.name, subtitle: stageLabel(c.stage), open: true }))
          : objetivos.filter((o) => o.quarter === quarterKey()).map((o) => ({ id: o.id, title: o.title, subtitle: 'Objetivo del trimestre', open: true }))
    return list
      .filter((i) => i.title && (!q || i.title.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.open) - Number(a.open))
      .slice(0, 30)
  }, [type, query, tasks, clients, objetivos])

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
      <div className="flex items-center gap-1">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className="rounded-full px-3 py-1 text-[12px] font-medium transition-colors"
            style={{ background: type === t.id ? 'rgba(184,134,11,0.18)' : 'transparent', color: type === t.id ? '#E8C15A' : '#999999' }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
        <button type="button" onClick={onClose} className="ml-auto px-2 text-[12px] text-[#888888] hover:text-[#F5F5F5]">Cerrar</button>
      </div>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Buscar ${TYPES.find((t) => t.id === type).label.toLowerCase()}…`}
        className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#1A1A1A] px-3 py-2 text-[13px] text-[#F5F5F5] outline-none placeholder:text-[#666666] focus:border-white/[0.2]"
      />
      <div className="mt-1.5 flex max-h-[200px] flex-col overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-[12px] text-[#777777]">Nada encontrado.</p>
        ) : (
          items.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => onPick({ type, id: i.id, title: i.title, subtitle: i.subtitle })}
              className="flex flex-col rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
            >
              <span className="truncate text-[13px] text-[#F0F0F0]">{i.title}</span>
              <span className="text-[11px] text-[#858585]">{i.subtitle}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
