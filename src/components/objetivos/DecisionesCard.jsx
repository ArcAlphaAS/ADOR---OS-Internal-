import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { subscribeDecisions } from '../../lib/firestore'
import RegisterDecisionModal from './RegisterDecisionModal'

// Moved out of Workspace (2026-09-17) — it was a fixed, always-on side rail
// there, which meant it permanently ate width from every Workspace view and
// had to be specially hidden on Hoy to make room for the new right rail.
// Direct feedback: Decisiones belongs closer to Objetivos ("las decisiones
// grandes van con las metas grandes"), as a plain card in the lateral rail —
// same slot pattern as IniciativasPanel/ExperimentosPanel — not its own
// collapsible panel. No data-model change: `decisions` was already a single
// shared Firestore collection with no per-user scoping (see CLAUDE.md §19's
// "Decisiones de Dirección" reframe), this is purely a placement change.
function formatDate(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function DecisionesCard({ actorName }) {
  const [decisions, setDecisions] = useState([])
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => subscribeDecisions(setDecisions), [])

  const latest = [...decisions]
    .filter((d) => d.decidedAt?.toDate)
    .sort((a, b) => b.decidedAt.toDate() - a.decidedAt.toDate())
    .slice(0, 6)

  return (
    <div className="ador-glass ador-grain rounded-2xl px-5 py-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Decisiones de Dirección
          </span>
          <p className="mt-1 text-[11px] text-[#444444]">Registro compartido — visible para todo el equipo.</p>
        </div>
      </div>

      {latest.length === 0 ? (
        <p className="mt-4 text-[13px] font-light text-[#444444]">Sin decisiones registradas</p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-white/[0.06]">
          {latest.map((d) => (
            <div key={d.id} className="flex flex-col gap-1.5 py-3 first:pt-0">
              <p className="line-clamp-2 text-[13px] text-[#F5F5F5]">{d.title}</p>
              {d.linkedName && <span className="text-[11px] text-[#1E5FAD]">{d.linkedName}</span>}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#444444]">{formatDate(d.decidedAt)}</span>
                <span className="text-[11px] text-[#444444]">{d.registeredBy}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowRegister(true)}
        className="mt-4 w-full rounded-[10px] border py-2.5 text-[13px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10"
        style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
      >
        + Registrar Decisión
      </button>

      <AnimatePresence>
        {showRegister && <RegisterDecisionModal workstreams={[]} actorName={actorName} onClose={() => setShowRegister(false)} />}
      </AnimatePresence>
    </div>
  )
}
