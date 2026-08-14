import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribeClientHistory, addHistoryEvent, updateClient } from '../../../lib/firestore'
import { INTERACTION_TYPES } from '../../../lib/clientStages'

function formatDate(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const EVENT_DOT = {
  created: '#888888',
  stage_change: '#888888',
  converted: '#1E5FAD',
  payment: '#1E5FAD',
  payment_complete: '#1E5FAD',
  document: '#888888',
  interaction: '#B8860B',
}

export default function HistorialTab({ client, actorName }) {
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState(INTERACTION_TYPES[0])
  const [notes, setNotes] = useState('')

  useEffect(() => subscribeClientHistory(client.id, setEvents), [client.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await addHistoryEvent(client.id, {
      type: 'interaction',
      description: `${type} registrada por ${actorName}${notes ? ` — ${notes}` : ''}`,
    })
    await updateClient(client.id, { lastContactAt: new Date().toISOString().slice(0, 10) })
    setNotes('')
    setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="ador-glass w-full rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#F5F5F5] transition-colors duration-150 hover:bg-white/[0.06]"
        >
          Registrar interacción
        </button>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="ador-glass ador-grain flex flex-col gap-3 rounded-xl p-4"
        >
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#1A1A1A] px-3 py-2 text-[13px] text-[#F5F5F5] outline-none"
          >
            {INTERACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            className="resize-none rounded-lg border border-white/[0.08] bg-[#1A1A1A] px-3 py-2 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full px-3.5 py-1.5 text-[12px] text-[#888888] hover:text-[#F5F5F5]"
            >
              Cancelar
            </button>
            <button type="submit" className="ador-btn-primary rounded-full px-4 py-1.5 text-[12px] font-medium">
              Guardar
            </button>
          </div>
        </motion.form>
      )}

      {events.length === 0 ? (
        <p className="text-center text-[13px] font-light text-[#444444]">Sin historial registrado</p>
      ) : (
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 py-2.5"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ background: EVENT_DOT[event.type] || '#444444' }}
                />
                <div>
                  <p className="text-[13px] text-[#F5F5F5]">{event.description}</p>
                  <p className="text-[11px] text-[#444444]">{formatDate(event.createdAt)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
