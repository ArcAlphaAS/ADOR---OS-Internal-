import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { moveClientStage } from '../../lib/firestore'
import { STAGES, clientType } from '../../lib/clientStages'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'

// Right-click on a client (Lista, Pipeline cards, Perdidos): open the ficha,
// copy name/code, move to the next stage, and — administrators only —
// delete (which opens DeleteClientModal, a typed confirmation). Portaled to
// document.body at the cursor (§1) and clamped to the viewport, same shape as
// the task menu in Workspace.
function Item({ label, onClick, danger, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.07]"
      style={{ color: danger ? '#EF5350' : '#E8E8E8' }}
    >
      {label}
      {hint && <span className="text-[11px] text-[#888888]">{hint}</span>}
    </button>
  )
}

const Divider = () => <div className="my-1 h-px bg-white/[0.08]" />

export default function ClientContextMenu({ client, x, y, canDelete, actorName, onClose, onOpen, onDelete, onComplete, onNewService, onConfigure }) {
  const showToast = useToast()
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)),
    })
  }, [x, y])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const run = (fn) => async () => {
    onClose()
    try {
      await withTimeout(Promise.resolve(fn()))
    } catch (e) {
      showToast(`No se pudo completar la acción: ${e.message}`)
    }
  }
  const copy = (text, done) => run(() => navigator.clipboard.writeText(text).then(() => showToast(done)))

  const index = STAGES.findIndex((s) => s.id === client.stage)
  const next = !client.lost && !client.completed && index >= 0 ? STAGES[index + 1] : null
  const isActiveSP = clientType(client.stage) === 'SP' && !client.lost && !client.completed

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[998]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="fixed z-[999] w-[240px]"
        style={{ left: pos.left, top: pos.top, transformOrigin: 'top left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-glass ador-grain rounded-xl p-1.5">
          <div className="px-2.5 pb-1 pt-1.5">
            <p className="truncate text-[12.5px] font-medium text-[#F5F5F5]">{client.name}</p>
            <p className="text-[11px] text-[#767676]">
              {client.code ? `${client.code} · ` : ''}
              {clientType(client.stage)}
            </p>
          </div>
          <Divider />
          <Item label="Abrir ficha" onClick={() => { onClose(); onOpen(client) }} />
          <Item label="Copiar nombre" onClick={copy(client.name, 'Nombre copiado.')} />
          {client.code && <Item label="Copiar código" onClick={copy(client.code, 'Código copiado.')} />}
          {next && (
            <>
              <Divider />
              <Item
                label={`Mover a ${next.label}`}
                onClick={run(() => moveClientStage(client, next.id, actorName).then(() => showToast(`Movido a ${next.label}.`)))}
              />
            </>
          )}
          {isActiveSP && (
            <>
              <Divider />
              <Item label="Servicio y cobro…" onClick={() => { onClose(); onConfigure(client) }} />
              <Item label="Marcar como completado…" onClick={() => { onClose(); onComplete(client) }} />
            </>
          )}
          {client.completed && (
            <>
              <Divider />
              <Item label="Nuevo servicio…" onClick={() => { onClose(); onNewService(client) }} />
            </>
          )}
          {canDelete && (
            <>
              <Divider />
              <Item label="Eliminar cliente…" danger onClick={() => { onClose(); onDelete(client) }} />
            </>
          )}
        </div>
      </motion.div>
    </>,
    document.body
  )
}
