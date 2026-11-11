import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CloseIcon } from '../icons'
import { clientType, LOST_REASONS, stageLabel, stageColor, daysSince, contactDate, urgencyColor, collectionProgress, currencyPEN as pen } from '../../lib/clientStages'
import { markClientLost, restoreClient, registerContact } from '../../lib/firestore'
import GeneralTab from './tabs/GeneralTab'
import PagosTab from './tabs/PagosTab'
import DocumentosTab from './tabs/DocumentosTab'
import HistorialTab from './tabs/HistorialTab'
import { SHEET, swipeToClose } from '../../lib/motion'
import { contractStatus, currencyPEN, everyMeta, modalityLabel, serviceLabel, serviceModality } from '../../lib/clientStages'
import { declineContractOption, exerciseContractOption } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'
import { useEscape } from '../../hooks/useEscape'

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'historial', label: 'Historial' },
]

// Completado / servicios: the closing state of a client whose work is done,
// the current service and its contract terms (renewal options), plus the
// cycles it has already gone through. "Nuevo servicio" reopens it.
const fmtDay = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

function ContractTerms({ client, actorName }) {
  const showToast = useToast()
  const st = contractStatus(client)
  if (!st) return null
  const b = client.billing
  const act = (fn, msg) => async (o) => {
    try {
      await fn(client, o.id, actorName)
      showToast(msg(o))
    } catch (e) {
      showToast(`No se pudo guardar: ${e.message}`)
    }
  }
  const exercise = act(exerciseContractOption, (o) => `${o.label} ejercida.`)
  const decline = act(declineContractOption, (o) => `${o.label} marcada como no renovada.`)
  return (
    <div className="rounded-xl border border-white/[0.08] px-4 py-3">
      <p className="text-[12px] text-[#8A8A8A]">
        {currencyPEN.format(b.amount || 0)} {everyMeta(b.every).label.toLowerCase()} · cubierto hasta{' '}
        <span className="text-[#C8C8C8]">{fmtDay(st.end)}</span>
        {st.days !== null && (
          <span style={{ color: st.alert ? (st.days <= 30 ? '#EF5350' : '#C9A227') : '#767676' }}>
            {' '}· {st.days < 0 ? `venció hace ${-st.days} días` : `quedan ${st.days} días`}
          </span>
        )}
      </p>
      {(b.options || []).length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {b.options.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="min-w-0 truncate text-[#C8C8C8]">
                {o.label} <span className="text-[#8A8A8A]">· {o.months} meses · {currencyPEN.format(o.amount || 0)}</span>
              </span>
              {o.status === 'pendiente' ? (
                <span className="flex flex-shrink-0 items-center gap-2">
                  <button type="button" onClick={() => exercise(o)} className="rounded-full border border-white/[0.16] px-2.5 py-0.5 text-[11px] font-medium text-[#F5F5F5] hover:bg-white/10">Ejercer</button>
                  <button type="button" onClick={() => decline(o)} className="text-[11px] text-[#8A8A8A] hover:text-[#F5F5F5]">No renovar</button>
                </span>
              ) : (
                <span className="flex-shrink-0 text-[11px]" style={{ color: o.status === 'ejercida' ? '#4CAF50' : '#767676' }}>
                  {o.status === 'ejercida' ? 'Ejercida' : 'No renovada'}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ServiceBar({ client, services, actorName, onComplete, onNewService, onConfigure }) {
  const past = client.serviceHistory || []
  const date = client.completedAt?.toDate?.()
  const fmt = (ms) => (ms ? new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
  const activeSP = client.stage === 'intervencion_activa' && !client.completed
  if (!client.completed && !activeSP && past.length === 0) return null
  const modality = client.billing ? client.billing.modality : serviceModality(client.serviceType, services)
  return (
    <div className="mx-7 mt-4 space-y-2">
      {client.completed ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#4CAF50]/30 bg-[#4CAF50]/10 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-[#4CAF50]">
              Completado{date ? ` el ${date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''} — {serviceLabel(client.serviceType, services)}
            </p>
            {client.completedNote && <p className="mt-0.5 truncate text-[11.5px] text-[#8A8A8A]">{client.completedNote}</p>}
          </div>
          <button type="button" onClick={() => onNewService(client)} className="flex-shrink-0 rounded-full border border-white/[0.16] px-3 py-1 text-[11.5px] font-medium text-[#F5F5F5] transition-colors hover:bg-white/10">
            Nuevo servicio
          </button>
        </div>
      ) : (
        activeSP && (
          <>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] px-4 py-2.5">
              <span className="min-w-0 truncate text-[12px] text-[#8A8A8A]">
                Servicio: <span className="text-[#C8C8C8]">{serviceLabel(client.serviceType, services)}</span>{serviceLabel(client.serviceType, services) !== modalityLabel(modality) ? ` · ${modalityLabel(modality)}` : ''}
              </span>
              <span className="flex flex-shrink-0 items-center gap-3">
                <button type="button" onClick={() => onConfigure(client)} className="text-[12px] font-medium text-[#C8C8C8] transition-colors hover:text-[#F5F5F5]">
                  Servicio y cobro
                </button>
                <button type="button" onClick={() => onComplete(client)} className="text-[12px] font-medium text-[#C8C8C8] transition-colors hover:text-[#F5F5F5]">
                  Completar
                </button>
              </span>
            </div>
            <ContractTerms client={client} actorName={actorName} />
          </>
        )
      )}
      {past.length > 0 && (
        <p className="px-1 text-[11.5px] leading-relaxed text-[#8A8A8A]">
          Servicios anteriores: {past.map((c) => `${serviceLabel(c.type, services)}${c.completedAt ? ` (${fmt(c.completedAt)})` : ''}`).join(' · ')}
        </p>
      )}
    </div>
  )
}

function LostControl({ client, actorName }) {
  const [pickingReason, setPickingReason] = useState(false)

  if (client.lost) {
    return (
      <div className="mx-7 mt-4 flex items-center justify-between rounded-xl border border-[#E05252]/30 bg-[#E05252]/10 px-4 py-2.5">
        <span className="text-[12px] font-medium text-[#E05252]">Perdido — {client.lostReason}</span>
        <button
          type="button"
          onClick={() => restoreClient(client, actorName)}
          className="text-[12px] font-medium text-[#888888] hover:text-[#F5F5F5]"
        >
          Restaurar
        </button>
      </div>
    )
  }

  if (pickingReason) {
    return (
      <div className="mx-7 mt-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2.5">
        {LOST_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            onClick={() => {
              markClientLost(client, reason, actorName)
              setPickingReason(false)
            }}
            className="rounded-full border border-white/[0.1] px-2.5 py-1 text-[11px] text-[#888888] transition-colors duration-150 hover:border-[#E05252]/40 hover:text-[#E05252]"
          >
            {reason}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPickingReason(false)}
          className="ml-auto text-[11px] text-[#8A8A8A] hover:text-[#888888]"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="mx-7 mt-4">
      <button
        type="button"
        onClick={() => setPickingReason(true)}
        className="text-[12px] text-[#8A8A8A] transition-colors duration-150 hover:text-[#E05252]"
      >
        Marcar como perdido
      </button>
    </div>
  )
}

// Top of the ficha: who they are right now at a glance — stage, owner, how
// long since the last contact (with a one-tap "registrar contacto"), how
// much of the money is already in, and what comes next.
function ClientHero({ client, users, actorName }) {
  const showToast = useToast()
  const owner = users?.find((u) => u.id === client.assignedTo)
  const days = daysSince(contactDate(client))
  const money = collectionProgress(client)
  const pct = money.total > 0 ? Math.min(100, Math.round((money.received / money.total) * 100)) : 0
  const log = () => registerContact(client, actorName).then(() => showToast('Contacto registrado.')).catch((e) => showToast(`No se pudo registrar: ${e.message}`))
  return (
    <div className="mx-7 mt-4 flex flex-col gap-3.5 rounded-2xl bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="rounded-full px-2.5 py-1 font-medium" style={{ background: `${stageColor(client.stage)}22`, color: stageColor(client.stage) }}>{stageLabel(client.stage)}</span>
        <span className="text-[#8A8A8A]">{owner ? `Lo lleva ${owner.displayName || owner.email}` : 'Sin responsable'}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.06em] text-[#8A8A8A]">Último contacto</p>
          <p className="mt-0.5 text-[14px] font-medium" style={{ color: days !== null && days >= 14 ? '#E05252' : '#F5F5F5' }}>
            {days === null ? 'Sin registro' : days === 0 ? 'Hoy' : `Hace ${days} día${days === 1 ? '' : 's'}`}
          </p>
        </div>
        <button type="button" onClick={log} className="rounded-full bg-white px-4 py-2 text-[12.5px] font-medium text-[#0B0B0B] transition-transform active:scale-95">Registrar contacto</button>
      </div>
      {money.total > 0 && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
            <span className="text-[#B5B5B5]">{pen.format(money.received)} <span className="text-[#8A8A8A]">de {pen.format(money.total)}</span></span>
            {money.overdue ? <span className="text-[#E05252]">Pago atrasado</span> : <span className="text-[#8A8A8A]">{pct}%</span>}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: money.overdue ? '#E05252' : '#F4EEE2' }} />
          </div>
        </div>
      )}
      {client.nextStep && (
        <p className="border-t border-white/[0.06] pt-3 text-[12.5px] text-[#B5B5B5]"><span className="text-[#8A8A8A]">Siguiente paso · </span>{client.nextStep}</p>
      )}
    </div>
  )
}

const PANEL_WIDTH = 480

// When the panel was opened from a clicked card (originRect), it should
// visually grow out of that card's position instead of always sliding in
// from the fixed right edge — see the `originRect` comment in
// ClientesModule.jsx. Computed as a translate+scale offset from the panel's
// natural resting rect (right:0, full height) so the scaled-down panel's
// top-left corner lands exactly on the card's top-left corner.
function originTransform(originRect) {
  if (!originRect || typeof window === 'undefined') return null
  const finalX = window.innerWidth - PANEL_WIDTH
  const finalY = 0
  const finalHeight = window.innerHeight
  return {
    x: originRect.left - finalX,
    y: originRect.top - finalY,
    scaleX: originRect.width / PANEL_WIDTH,
    scaleY: originRect.height / finalHeight,
  }
}

export default function ClientDetailPanel({ client, users, actorName, originRect, onClose, services = [], onComplete, onNewService, onConfigure }) {
  useEscape(onClose)
  const [activeTab, setActiveTab] = useState('general')

  if (!client) return null
  const type = clientType(client.stage)
  const origin = originTransform(originRect)

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <motion.div
        key={client.id}
        initial={origin ? { x: origin.x, y: origin.y, scaleX: origin.scaleX, scaleY: origin.scaleY, opacity: 0 } : { x: 480, opacity: 0 }}
        animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
        exit={origin ? { x: origin.x, y: origin.y, scaleX: origin.scaleX, scaleY: origin.scaleY, opacity: 0 } : { x: 480, opacity: 0 }}
        transition={SHEET}
        {...swipeToClose('x', onClose)}
        style={{ transformOrigin: '0 0', width: PANEL_WIDTH }}
        className="fixed right-0 top-0 z-50 h-full"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="ador-modal-surface ador-grain flex h-full flex-col">
        <div className="flex items-start justify-between px-7 pt-7">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="font-medium"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: type === 'SP' ? '#F4EEE2' : '#888888',
                }}
              >
                {type}
              </span>
              {client.code && (
                <span className="font-mono text-[10px] tracking-[0.04em] text-[#8A8A8A]">{client.code}</span>
              )}
            </div>
            <h2 className="mt-1 text-[20px] font-semibold text-[#F5F5F5]">{client.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#888888] hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <ClientHero client={client} users={users} actorName={actorName} />

        {(type !== 'SP' || client.lost) && <LostControl client={client} actorName={actorName} />}
        <ServiceBar client={client} services={services} actorName={actorName} onComplete={onComplete} onNewService={onNewService} onConfigure={onConfigure} />

        <div className="mt-5 flex gap-1 px-7">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="relative rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-150"
              style={{ color: activeTab === tab.id ? '#000000' : '#888888' }}
            >
              {activeTab === tab.id && (
                <motion.span
                  layoutId="ficha-active-tab"
                  className="absolute inset-0 rounded-full bg-[#F5F5F5]"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
              <span className="relative">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-7 mt-4 h-px bg-white/[0.06]" />

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {activeTab === 'general' && <GeneralTab client={client} />}
          {activeTab === 'pagos' && <PagosTab client={client} actorName={actorName} />}
          {activeTab === 'documentos' && <DocumentosTab client={client} actorName={actorName} />}
          {activeTab === 'historial' && <HistorialTab client={client} actorName={actorName} />}
        </div>
      </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
