import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { subscribeProyectosInternos, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { workstreamId } from '../../lib/workspace'
import { userLabel } from '../../lib/chat'
import PersonAvatar from './PersonAvatar'

const labelClass = 'mb-1.5 block font-medium text-[#767676]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13.5px] text-[#F5F5F5] placeholder:text-[#767676] outline-none transition-colors duration-150 focus:border-white/[0.2]'

const PRIORITIES = [
  { id: 'alta', label: 'Alta', color: '#EF5350' },
  { id: 'media', label: 'Media', color: '#FFC107' },
  { id: 'baja', label: 'Baja', color: '#4CAF50' },
]

// "Convertir en tarea" — always through this confirmation (the user's
// explicit rule): nothing is created until you review the title, who it's
// for, the date and the project, and press Crear tarea. Assigning someone
// else still goes through Workspace's own accept/reject step
// (AssignmentConfirmGate), so the modal says so.
export default function TaskFromMessageModal({ message, conversationLabel, users, currentUid, actorName, onClose, onConfirm }) {
  const firstLine = (message.text || '').split('\n')[0].trim()
  const [title, setTitle] = useState(firstLine.slice(0, 120) || 'Tarea desde el chat')
  const [description, setDescription] = useState(
    `${message.text ? `${message.authorName}: “${message.text}”\n\n` : ''}Desde ${conversationLabel} en Comunicación.`
  )
  const [assignee, setAssignee] = useState(currentUid)
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('media')
  const [proyectos, setProyectos] = useState([])
  const [proyectoId, setProyectoId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => subscribeProyectosInternos(setProyectos), [])

  const other = assignee && assignee !== currentUid ? users.find((u) => u.id === assignee) : null

  const confirm = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const pid = proyectoId || (await findOrCreateGeneralProyecto(actorName))
      await onConfirm({
        title: title.trim(),
        description: description.trim(),
        assignedTo: assignee ? [assignee] : [],
        priority,
        dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : null,
        workstreamId: workstreamId('proyecto', pid),
        status: 'por_hacer',
      })
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="ador-modal-surface ador-grain w-[460px] rounded-[28px] p-8">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Crear tarea desde este mensaje</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#858585]">Revisa los datos — la tarea aparecerá en Workspace y quedará enlazada al mensaje.</p>

          <div className="mt-6 flex flex-col gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>
                Tarea <span style={{ color: '#B8860B' }}>*</span>
              </label>
              <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>
                Descripción
              </label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} resize-none`} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={labelStyle}>
                  Para
                </label>
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClass}>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id === currentUid ? `${userLabel(u)} (tú)` : userLabel(u)}
                    </option>
                  ))}
                  <option value="">Sin asignar</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>
                  Fecha límite
                </label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={labelStyle}>
                  Prioridad
                </label>
                <div className="flex gap-1.5">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className="flex-1 rounded-lg border px-2 py-2 text-[12.5px] transition-colors"
                      style={{
                        borderColor: priority === p.id ? `${p.color}99` : 'rgba(255,255,255,0.08)',
                        background: priority === p.id ? `${p.color}1f` : 'transparent',
                        color: priority === p.id ? p.color : '#888888',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>
                  Proyecto
                </label>
                <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className={inputClass}>
                  <option value="">General</option>
                  {proyectos
                    .filter((p) => p.name !== 'General')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {other && (
              <p className="flex items-center gap-2 rounded-xl border border-[#FFC107]/25 bg-[#FFC107]/[0.06] px-3 py-2 text-[12.5px] leading-relaxed text-[#D9C27A]">
                <PersonAvatar uid={other.id} name={userLabel(other)} size={18} />
                {userLabel(other).split(' ')[0]} recibirá la tarea para aceptarla o rechazarla antes de que cuente como suya.
              </p>
            )}
          </div>

          <div className="mt-7 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[13.5px] text-[#888888] transition-colors hover:text-[#F5F5F5]">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!title.trim() || saving}
              onClick={confirm}
              className="rounded-xl px-5 py-2 text-[13.5px] font-medium text-[#1C1A16] transition-opacity disabled:opacity-40"
              style={{ background: '#E8C15A' }}
            >
              {saving ? 'Creando…' : 'Crear tarea'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
