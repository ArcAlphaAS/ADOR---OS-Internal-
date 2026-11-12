import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import EventEditorModal from '../calendario/EventEditorModal'
import ConfirmDialog from '../common/ConfirmDialog'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import { buildEventBody } from '../../lib/googleCalendar'
import { useToast } from '../../hooks/useToast'

// Mensaje → evento, igual que mensaje → tarea: el formulario de evento se abre con el título y la
// descripción sacados del mensaje, y nada se crea hasta pulsar "Crear evento". Si Google Calendar
// aún no está conectado con permiso de escritura, se explica y se ofrece darlo.
const plain = (t) => (t || '').replace(/[*_~`]/g, '').replace(/@(\S+)/g, '$1').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
const nextRoundHour = () => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d }
const when = (d) => d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '') + ' · ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function EventFromMessage({ message, conversationLabel, uid, onClose, onCreated }) {
  const showToast = useToast()
  const cal = useGoogleCalendar(uid)
  const [saving, setSaving] = useState(false)

  const text = plain(message.text)
  const title = (text.split(/[.!?\n]/)[0] || text || 'Nuevo evento').slice(0, 80)
  const start = nextRoundHour()
  const draft = {
    title,
    start,
    end: new Date(start.getTime() + 3600000),
    description: `«${(message.text || '').trim().slice(0, 500)}»\n— ${message.authorName || 'Chat'}, en ${conversationLabel}`,
  }

  // Esperando a saber si hay conexión.
  if (cal.status === 'checking' || cal.status === 'connecting') return null

  if (!(cal.status === 'ready' || cal.status === 'loading') || !cal.canWrite) {
    return (
      <AnimatePresence>
        <ConfirmDialog
          title="Falta el permiso de Google Calendar"
          description={cal.status === 'ready' || cal.status === 'loading' ? 'Para crear eventos desde ADOR OS hace falta que des permiso de edición una sola vez. Te llevará a Google y volverás aquí.' : 'Conecta tu Google Calendar para crear eventos desde el chat. Te llevará a Google y volverás a ADOR OS.'}
          confirmLabel="Dar permiso"
          danger={false}
          onConfirm={() => cal.connect()}
          onClose={onClose}
        />
      </AnimatePresence>
    )
  }

  const save = async (payload) => {
    setSaving(true)
    try {
      const created = await cal.createEvent(buildEventBody(payload), { notify: payload.notify })
      showToast(payload.notify ? 'Evento creado e invitaciones enviadas.' : 'Evento creado en tu calendario.')
      await onCreated?.({ id: created?.id || null, title: payload.title, when: when(payload.start) })
      onClose()
    } catch (e) {
      showToast(`No se pudo crear el evento: ${e.message}`, { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <EventEditorModal draft={draft} events={cal.events} busy={saving} onSave={save} onClose={onClose} />
    </AnimatePresence>
  )
}
