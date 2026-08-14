import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CloseIcon } from '../icons'
import { clientType } from '../../lib/clientStages'
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

export default function ClientDetailPanel({ client, actorName, onClose }) {
  const [activeTab, setActiveTab] = useState('general')

  if (!client) return null
  const type = clientType(client.stage)

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        key={client.id}
        initial={{ x: 480, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 480, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="ador-modal-surface ador-grain fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-7 pt-7">
          <div>
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
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
