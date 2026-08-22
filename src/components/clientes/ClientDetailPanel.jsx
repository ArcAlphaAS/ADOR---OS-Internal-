import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CloseIcon } from '../icons'
import { clientType, LOST_REASONS } from '../../lib/clientStages'
import { markClientLost, restoreClient } from '../../lib/firestore'
import GeneralTab from './tabs/GeneralTab'
import PagosTab from './tabs/PagosTab'
import DocumentosTab from './tabs/DocumentosTab'
import HistorialTab from './tabs/HistorialTab'

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'historial', label: 'Historial' },
]

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
          className="ml-auto text-[11px] text-[#444444] hover:text-[#888888]"
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
        className="text-[12px] text-[#444444] transition-colors duration-150 hover:text-[#E05252]"
      >
        Marcar como perdido
      </button>
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

export default function ClientDetailPanel({ client, actorName, originRect, onClose }) {
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
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
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
                  color: type === 'SP' ? '#1E5FAD' : '#888888',
                }}
              >
                {type}
              </span>
              {client.code && (
                <span className="font-mono text-[10px] tracking-[0.04em] text-[#444444]">{client.code}</span>
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

        {(type !== 'SP' || client.lost) && <LostControl client={client} actorName={actorName} />}

        <div className="mt-5 flex gap-1 px-7">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="relative rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-150"
              style={{ color: activeTab === tab.id ? '#0A0A0A' : '#888888' }}
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
