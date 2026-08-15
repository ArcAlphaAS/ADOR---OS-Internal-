import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CloseIcon } from '../icons'

const SECTIONS = [
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'objetivos', label: 'Objetivos' },
  { key: 'workspace', label: 'Workspace' },
  { key: 'clientes', label: 'Clientes' },
]

function formatRange(range) {
  const fmt = (d) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  return `${fmt(range.start)} — ${fmt(range.end)}`
}

// Slide-in panel, same structural pattern as ClientDetailPanel/TaskDetailPanel
// (portal, transform-animated wrapper separated from the ador-modal-surface
// element — see NotificationCenter.jsx for why that split matters).
export default function WeeklySummaryPanel({ summary, onClose }) {
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
        initial={{ x: 480, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 480, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed right-0 top-0 z-50 h-full w-[480px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-modal-surface ador-grain flex h-full flex-col">
          <div className="flex items-start justify-between px-7 pt-7">
            <div>
              <span
                className="font-medium text-[#1E5FAD]"
                style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Resumen Semanal
              </span>
              <h2 className="mt-1 text-[20px] font-semibold text-[#F5F5F5]">{formatRange(summary.range)}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#888888] hover:bg-white/[0.08] hover:text-[#F5F5F5]"
            >
              <CloseIcon size={16} />
            </button>
          </div>

          <p className="mx-7 mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-[#F5F5F5]">
            {summary.tldr}
          </p>

          <div className="mx-7 mt-5 h-px bg-white/[0.06]" />

          <div className="flex-1 overflow-y-auto px-7 py-6">
            {summary.birthdaysThisWeek.length > 0 && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#B8860B]/25 bg-[#B8860B]/[0.08] px-4 py-3">
                <span className="text-[13px] text-[#F5F5F5]">
                  🎂 Cumpleaños esta semana: {summary.birthdaysThisWeek.map((u) => u.displayName?.split(' ')[0] || u.email).join(', ')}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-6">
              {SECTIONS.map(({ key, label }) => (
                <div key={key}>
                  <span
                    className="font-medium text-[#444444]"
                    style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {label}
                  </span>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {summary.sections[key].map((line, i) => (
                      <p key={i} className="text-[13px] font-light leading-relaxed text-[#888888]">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
