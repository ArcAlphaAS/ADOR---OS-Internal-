import { useRef } from 'react'
import { motion } from 'framer-motion'
import { clientType, daysSince, urgencyColor, paymentStatusLabel, currencyPEN } from '../../lib/clientStages'
import { ArrowRightIcon } from '../icons'

function AsociadoAvatar({ uid, users }) {
  const person = users?.find((u) => u.id === uid)
  const initial = (person?.displayName || person?.email || '?').charAt(0).toUpperCase()
  return (
    <div
      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#1E5FAD] text-[10px] font-medium text-[#F5F5F5]"
      title={person?.displayName || person?.email || 'Sin asignar'}
    >
      {initial}
    </div>
  )
}

export default function ClientCard({ client, users, onOpen, onDropStage, resolveDropStage, justConverted }) {
  const type = clientType(client.stage)
  const daysSinceContact = daysSince(client.lastContactAt?.toDate?.() || client.createdAt?.toDate?.())
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
        <span className="text-[14px] font-semibold text-[#F5F5F5]">{client.name}</span>
        {client.code && <span className="font-mono text-[10px] text-[#444444]">{client.code}</span>}
      </div>
      {client.industria && <div className="mt-0.5 truncate text-[11.5px] text-[#666666]">{client.industria}</div>}

      <div className="mt-2.5 flex items-center gap-1.5">
        <span
          className="font-medium"
          style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: type === 'SP' ? '#1E5FAD' : '#888888' }}
        >
          {type}
        </span>
        {client.montoAcordado ? (
          <span className="text-[12px] font-medium text-[#F5F5F5]">{currencyPEN.format(client.montoAcordado)}</span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <AsociadoAvatar uid={client.assignedTo} users={users} />
          {daysSinceContact !== null && (
            <span className="truncate text-[11px]" style={{ color: urgencyColor(daysSinceContact) }}>
              Último contacto {daysSinceContact === 0 ? 'hoy' : `${daysSinceContact}d`}
            </span>
          )}
        </div>
        {showPayment && (
          <span
            className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: payment === 'Pagado' ? 'rgba(30,95,173,0.18)' : 'rgba(184,134,11,0.18)',
              color: payment === 'Pagado' ? '#1E5FAD' : '#B8860B',
            }}
          >
            {payment}
          </span>
        )}
      </div>

      {client.nextStep && (
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/[0.06] pt-2.5 text-[12px] text-[#888888]">
          <ArrowRightIcon size={11} className="flex-shrink-0 text-[#666666]" />
          <span className="truncate">{client.nextStep}</span>
        </div>
      )}
    </motion.div>
  )
}
