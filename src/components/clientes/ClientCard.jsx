import { useRef } from 'react'
import { motion } from 'framer-motion'
import { clientType, daysSince, urgencyColor, paymentStatusLabel, currencyPEN, contactDate, collectionProgress } from '../../lib/clientStages'
import { ArrowRightIcon } from '../icons'
import { registerContact } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'

function AsociadoAvatar({ uid, users }) {
  const person = users?.find((u) => u.id === uid)
  const initial = (person?.displayName || person?.email || '?').charAt(0).toUpperCase()
  return (
    <div
      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#2C2C2E] text-[10px] font-medium text-[#F5F5F5]"
      title={person?.displayName || person?.email || 'Sin asignar'}
    >
      {initial}
    </div>
  )
}

export default function ClientCard({ client, users, onOpen, onContext, onDropStage, resolveDropStage, justConverted, onDragHover, actorName }) {
  const showToast = useToast()
  const money = collectionProgress(client)
  const moneyPct = money.total > 0 ? Math.min(100, Math.round((money.received / money.total) * 100)) : 0
  const type = clientType(client.stage)
  const daysSinceContact = daysSince(contactDate(client))
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
      dragTransition={{ bounceStiffness: 520, bounceDamping: 28 }}
      dragMomentum={false}
      whileDrag={{ scale: 1.04, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.6)', zIndex: 20 }}
      onDragStart={() => {
        didDragRef.current = true
      }}
      onDrag={(_, info) => onDragHover?.(resolveDropStage(info.point.x, info.point.y))}
      onDragEnd={(_, info) => {
        onDragHover?.(null)
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
      onContextMenu={(e) => {
        if (!onContext) return
        e.preventDefault()
        onContext(client, e.clientX, e.clientY)
      }}
      initial={justConverted ? { boxShadow: '0 0 0px rgba(244,238,226,0)' } : false}
      animate={
        justConverted
          ? {
              boxShadow: [
                '0 0 0px rgba(244,238,226,0)',
                '0 0 32px rgba(244,238,226,0.55)',
                '0 0 0px rgba(244,238,226,0)',
              ],
            }
          : {}
      }
      transition={justConverted ? { duration: 1.4, ease: 'easeOut' } : { duration: 0.15 }}
      className="ador-glass ador-grain group relative cursor-pointer rounded-xl p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-[#F5F5F5]">{client.name}</span>
        {client.code && <span className="font-mono text-[10px] text-[#8A8A8A]">{client.code}</span>}
      </div>
      {client.industria && <div className="mt-0.5 truncate text-[11.5px] text-[#8A8A8A]">{client.industria}</div>}

      <div className="mt-2.5 flex items-center gap-1.5">
        <span
          className="font-medium"
          style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: type === 'SP' ? '#F4EEE2' : '#888888' }}
        >
          {type}
        </span>
        {client.montoAcordado ? (
          <span className="text-[12px] font-medium text-[#F5F5F5]">{currencyPEN.format(client.montoAcordado)}</span>
        ) : null}
      </div>

      {money.total > 0 && (
        <div className="mt-2.5" title={`${currencyPEN.format(money.received)} cobrado de ${currencyPEN.format(money.total)}`}>
          <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${moneyPct}%`, background: money.overdue ? '#E05252' : '#F4EEE2' }} />
          </div>
          {money.overdue && <p className="mt-1 text-[10.5px] text-[#E05252]">Pago atrasado</p>}
        </div>
      )}

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
              background: payment === 'Pagado' ? 'rgba(76,175,80,0.18)' : 'rgba(184,134,11,0.18)',
              color: payment === 'Pagado' ? '#4CAF50' : '#B8860B',
            }}
          >
            {payment}
          </span>
        )}
      </div>

      {actorName && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            registerContact(client, actorName).then(() => showToast(`Contacto con ${client.name} registrado.`)).catch((err) => showToast(`No se pudo registrar: ${err.message}`))
          }}
          className="absolute right-3 top-3 rounded-full bg-white/[0.1] px-2.5 py-1 text-[10.5px] font-medium text-[#F5F5F5] opacity-0 transition-opacity duration-150 hover:bg-white/[0.18] group-hover:opacity-100"
        >
          Contacté hoy
        </button>
      )}

      {client.nextStep && (
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/[0.06] pt-2.5 text-[12px] text-[#888888]">
          <ArrowRightIcon size={11} className="flex-shrink-0 text-[#8A8A8A]" />
          <span className="truncate">{client.nextStep}</span>
        </div>
      )}
    </motion.div>
  )
}
