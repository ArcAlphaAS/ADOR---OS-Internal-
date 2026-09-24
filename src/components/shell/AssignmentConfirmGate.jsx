import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { subscribeAssignedPending, subscribeClients, subscribeProyectosInternos, respondToAssignment } from '../../lib/firestore'
import { workstreamId } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { SPRING } from '../../lib/motion'

// The blocking accept/reject popup for a task someone else assigned to you —
// direct request (2026-09-16): assigning a teammate shouldn't just silently
// drop a task on them, they should confirm it, and be pointed at whoever
// assigned it in case they need to talk first. Chat is still a placeholder
// module (no real messaging in the app yet), so "comunícate" is deliberately
// just a text hint, not a button that opens anything — coordinating happens
// outside the app for now. See lib/firestore.js's createTask/applyTaskUpdate
// for how a task lands in pendingConfirmations, and CLAUDE.md §20.
//
// Mounted once in AppShell.jsx (like GlobalCapture) so it fires regardless
// of which module is open, not just while Workspace is mounted — the whole
// point is you can't miss it. No backdrop-click-to-dismiss and no close
// button: Aceptar/Rechazar are the only ways out, one pending assignment at
// a time (oldest first, since subscribeToCollection has no explicit order
// here — first in the array is whatever Firestore returns first, stable
// enough at 3-founder task volume).
export default function AssignmentConfirmGate({ user, actorName }) {
  const [pending, setPending] = useState([])
  const [clients, setClients] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [busy, setBusy] = useState(false)
  const showToast = useToast()

  useEffect(() => {
    if (!user?.uid || user.uid === 'preview') return
    return subscribeAssignedPending(user.uid, setPending)
  }, [user?.uid])
  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeProyectosInternos(setProyectos), [])

  const workstreamNameById = {
    ...Object.fromEntries(clients.map((c) => [workstreamId('intervencion', c.id), c.name])),
    ...Object.fromEntries(proyectos.map((p) => [workstreamId('proyecto', p.id), p.name])),
  }

  const current = pending[0]

  const respond = async (accept) => {
    if (!current || busy) return
    setBusy(true)
    try {
      await respondToAssignment(current, user.uid, accept, actorName)
    } catch (error) {
      showToast(`No se pudo registrar tu respuesta: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!current) return null

  const workstreamName = workstreamNameById[current.workstreamId]
  const assignedBy = current.lastAssignedBy || 'Un asociado'

  return createPortal(
    <motion.div
      key={current.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[10px]"
    >
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING}>
        <div className="ador-modal-surface ador-grain w-[420px] rounded-[28px] p-8">
          <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Nueva asignación
          </span>
          <p className="mt-2 text-[13px] text-[#888888]">
            <strong className="font-medium text-[#F5F5F5]">{assignedBy}</strong> te asignó una tarea
            {workstreamName ? (
              <>
                {' '}
                en <strong className="font-medium text-[#F5F5F5]">{workstreamName}</strong>
              </>
            ) : null}
            :
          </p>
          <h2 className="mt-3 text-[17px] font-semibold leading-snug text-[#F5F5F5]">{current.title}</h2>

          <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <p className="text-[12px] leading-relaxed text-[#888888]">
              Habla con <strong className="font-medium text-[#F5F5F5]">{assignedBy}</strong> antes de aceptar si tienes dudas sobre el
              alcance o el plazo.
            </p>
          </div>

          <div className="mt-7 flex gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => respond(false)}
              className="flex-1 rounded-xl border py-2.5 text-[13px] font-medium transition-colors duration-150 hover:bg-[#EF5350]/10 disabled:opacity-50"
              style={{ borderColor: '#EF5350', color: '#EF5350' }}
            >
              Rechazar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => respond(true)}
              className="ador-btn-primary flex-1 rounded-xl py-2.5 text-[13px] font-medium disabled:opacity-50"
            >
              Aceptar
            </button>
          </div>
          {pending.length > 1 && <p className="mt-4 text-center text-[11px] text-[#444444]">+{pending.length - 1} asignación(es) más esperando</p>}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
