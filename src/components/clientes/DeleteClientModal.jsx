import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { deleteClient } from '../../lib/firestore'
import { clientType, currencyPEN } from '../../lib/clientStages'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { SPRING } from '../../lib/motion'

// Deleting a client is permanent (ficha, historial and documentos go with it)
// and it also touches other modules, so it needs two deliberate steps: open
// the menu → type the client's name to enable the final button. Nothing is
// deleted until both are done.
const norm = (s) => (s || '').trim().toLowerCase()

export default function DeleteClientModal({ client, onClose, onDeleted }) {
  const showToast = useToast()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const matches = norm(typed) === norm(client.name)

  const received = ['pago1', 'pago2']
    .filter((k) => client[k]?.status === 'Recibido')
    .reduce((sum, k) => sum + (Number(client[k]?.amount) || 0), 0)
  const isSP = clientType(client.stage) === 'SP'

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const confirm = async () => {
    if (!matches || busy) return
    setBusy(true)
    try {
      await withTimeout(deleteClient(client.id))
      showToast(`Se eliminó a ${client.name}.`)
      onDeleted?.(client)
      onClose()
    } catch (e) {
      showToast(`No se pudo eliminar: ${e.message}`)
      setBusy(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-modal-surface ador-grain w-[min(420px,calc(100vw-32px))] rounded-[28px] p-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(239,83,80,0.14)', color: '#EF5350' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </div>
          <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-[#F5F5F5]">¿Eliminar a {client.name}?</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#8A8A8A]">
            Se borrará su ficha, su historial y sus documentos para todo el equipo. Esta acción no se puede deshacer.
          </p>

          {(received > 0 || isSP) && (
            <ul className="mt-4 space-y-1.5 text-[12.5px] leading-relaxed text-[#C9A227]">
              {received > 0 && <li>• Tiene pagos recibidos por {currencyPEN.format(received)}: dejarán de contarse como ingresos en Finanzas.</li>}
              {isSP && <li>• Su Intervención dejará de aparecer en Workspace.</li>}
            </ul>
          )}

          <label className="mt-5 block text-[12.5px] text-[#8A8A8A]">
            Para confirmar, escribe <span className="font-medium text-[#F5F5F5]">{client.name}</span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirm()}
              placeholder={client.name}
              spellCheck={false}
              autoComplete="off"
              className="mt-2 w-full rounded-[10px] border bg-[#0A0A0A] px-3.5 py-2.5 text-[14px] text-[#F5F5F5] outline-none transition-colors placeholder:text-[#4A4A4A]"
              style={{ borderColor: matches ? 'rgba(239,83,80,0.6)' : '#262626' }}
            />
          </label>

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-full px-4 py-2 text-[13px] font-medium text-[#C8C8C8] transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!matches || busy}
              className="rounded-full px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-35"
              style={{ background: '#D9433F' }}
            >
              {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
