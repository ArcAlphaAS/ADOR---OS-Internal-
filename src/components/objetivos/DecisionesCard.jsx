import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { subscribeDecisions } from '../../lib/firestore'
import RegisterDecisionModal from './RegisterDecisionModal'
import Panel, { PanelAction, PanelEmpty } from './Panel'

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
    <Panel title="Decisiones de dirección" subtitle="Registro compartido con todo el equipo" action={<PanelAction onClick={() => setShowRegister(true)}>+ Registrar</PanelAction>}>
      {latest.length === 0 ? (
        <PanelEmpty>Aún no hay decisiones registradas.</PanelEmpty>
      ) : (
        <ul className="-mx-1 flex flex-col divide-y divide-white/[0.07]">
          {latest.map((d) => (
            <li key={d.id} className="px-1 py-3.5 first:pt-0">
              <p className="line-clamp-2 text-[14.5px] leading-snug text-[#F5F5F5]">{d.title}</p>
              <p className="mt-1 truncate text-[12.5px] text-[#8E8E93]">
                {[formatDate(d.decidedAt), d.registeredBy, d.linkedName].filter(Boolean).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {showRegister && <RegisterDecisionModal workstreams={[]} actorName={actorName} onClose={() => setShowRegister(false)} />}
      </AnimatePresence>
    </Panel>
  )
}
