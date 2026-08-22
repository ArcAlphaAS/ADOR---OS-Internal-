import { useRef } from 'react'
import { motion } from 'framer-motion'
import { clientType, daysSince, urgencyColor, paymentStatusLabel } from '../../lib/clientStages'

export default function ClientCard({ client, onOpen, onDropStage, resolveDropStage, justConverted }) {
  const type = clientType(client.stage)
  const daysInStage = daysSince(client.stageEnteredAt?.toDate?.())
  const payment = paymentStatusLabel(client)
  const showPayment = client.pago1?.status === 'Recibido' || client.pago2?.status === 'Recibido'

  // Framer Motion's `drag` and the browser's native `click` both fire on
  // release — but measured directly (console logging the actual sequence),
  // the order here is dragStart → click → dragEnd, not dragEnd → click as
  // it'd be reasonable to assume. So the flag has to go up in onDragStart
  // (before any movement threshold, but a real drag always starts with one)
  // and come back down in onDragEnd, not the other way around — this is
  // what makes dragging a card never open it, same as Trello.
  const didDragRef = useRef(false)

  return (
    <motion.div
      layout
      layoutId={client.id}
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.04, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.6)', zIndex: 20 }}
      onDragStart={() => {
        didDragRef.current = true
      }}
      onDragEnd={(_, info) => {
        const targetStage = resolveDropStage(info.point.x, info.point.y)
        if (targetStage && targetStage !== client.stage) onDropStage(client, targetStage)
        // Cleared a tick later, not synchronously — the native click for
        // this same release can still be in flight right after dragEnd.
        setTimeout(() => {
          didDragRef.current = false
        }, 0)
      }}
      onClick={(e) => {
        if (didDragRef.current) return
        onOpen(client, e.currentTarget.getBoundingClientRect())
      }}
      initial={justConverted ? { boxShadow: '0 0 0px rgba(30,95,173,0)' } : false}
      animate={
        justConverted
          ? {
              boxShadow: [
                '0 0 0px rgba(30,95,173,0)',
                '0 0 32px rgba(30,95,173,0.55)',
                '0 0 0px rgba(30,95,173,0)',
              ],
            }
          : {}
      }
      transition={justConverted ? { duration: 1.4, ease: 'easeOut' } : { duration: 0.15 }}
      className="ador-glass ador-grain relative cursor-pointer rounded-xl p-4"
    >
      <div className="flex items-center justify-between">
        <span
          className="font-medium"
          style={{
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: type === 'SP' ? '#1E5FAD' : '#888888',
          }}
        >
          {type}
        </span>
        {client.code && <span className="font-mono text-[10px] text-[#444444]">{client.code}</span>}
      </div>
      <div className="mt-1.5 text-[14px] font-semibold text-[#F5F5F5]">{client.name}</div>
      {client.contactName && (
        <div className="mt-0.5 text-[12px] text-[#888888]">
          {client.contactName}
          {client.contactRole ? ` · ${client.contactRole}` : ''}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        {daysInStage !== null && (
          <span className="text-[11px]" style={{ color: urgencyColor(daysInStage) }}>
            {daysInStage === 0 ? 'Hoy' : `${daysInStage}d en etapa`}
          </span>
        )}
        {showPayment && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: payment === 'Pagado' ? 'rgba(30,95,173,0.18)' : 'rgba(184,134,11,0.18)',
              color: payment === 'Pagado' ? '#1E5FAD' : '#B8860B',
            }}
          >
            {payment}
          </span>
        )}
      </div>
    </motion.div>
  )
}
