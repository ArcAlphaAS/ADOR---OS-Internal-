import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useObjetivosData } from '../../hooks/useObjetivosData'
import { quarterLabel, daysLeftInQuarter } from '../../lib/finance'
import ObjetivoCard from './ObjetivoCard'
import NewObjetivoModal from './NewObjetivoModal'
import NorthStarHero from './NorthStarHero'
import IniciativasPanel from './IniciativasPanel'
import ExperimentosPanel from './ExperimentosPanel'
import { TargetIcon } from '../icons'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

// Three one-click starting points, not just a bare CTA — the built-in
// live metrics (revenue/SP) need zero typing to become a real objetivo, and
// the milestone preset shows the "hito" type exists without the user having
// to discover the type toggle first. Presets seed NewObjetivoModal's fields;
// nothing is created until the user actually saves the form.
const QUICK_START_PRESETS = [
  { label: 'Ingresos del trimestre', preset: { type: 'kpi', metric: 'revenue_quarter', foco: 'Ingresos' } },
  { label: 'SP Activos', preset: { type: 'kpi', metric: 'sp_activos', foco: 'Crecimiento' } },
  { label: 'Un hito del trimestre', preset: { type: 'milestone', foco: 'General' } },
]

function EmptyBoardCTA({ quarterKey, onCreate, onPreset }) {
  return (
    <div className="ador-glass ador-grain flex flex-col items-center gap-5 rounded-[24px] px-8 py-20 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-[#1E5FAD]"
        style={{
          backgroundColor: 'rgba(30,95,173,0.1)',
          border: '1px solid rgba(30,95,173,0.25)',
          animation: 'ador-pulse 3s ease-in-out infinite',
        }}
      >
        <TargetIcon size={24} />
      </div>
      <div>
        <p className="text-[16px] font-medium text-[#F5F5F5]">Define el primer objetivo de {quarterLabel(quarterKey)}</p>
        <p className="mt-1.5 max-w-[380px] text-[13px] font-light text-[#888888]">
          Metas conectadas a datos reales de Finanzas, Clientes y Workspace — nada que llenar a mano cada semana, salvo lo que de verdad no tiene un número detrás.
        </p>
      </div>

      <button type="button" onClick={onCreate} className="ador-btn-primary rounded-full px-5 py-2.5 text-[13px] font-medium">
        + Crear el primer objetivo
      </button>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <span className="text-[11px] text-[#444444]">o arranca de una:</span>
        {QUICK_START_PRESETS.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onPreset(q.preset)}
            className="rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] text-[#888888] transition-colors duration-150 hover:border-white/[0.2] hover:text-[#F5F5F5]"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ObjetivosModule({ user }) {
  const { objetivos, quarterKey, northStar, users, openLinkedTasks } = useObjetivosData()
  const [showNew, setShowNew] = useState(false)
  const [preset, setPreset] = useState(null)
  const actorName = actorNameFor(user)
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))
  const daysLeft = daysLeftInQuarter()

  const openModal = (p = null) => {
    setPreset(p)
    setShowNew(true)
  }

  // Grouped by "foco" (free text, not a fixed department taxonomy — ADOR
  // doesn't have formal departments at 3 founders) rather than by type, so
  // the board reads as "what is each area of the business working toward"
  // instead of an arbitrary numeric-vs-checkbox split.
  const byFoco = new Map()
  for (const o of objetivos) {
    if (o.isNorthStar) continue // already shown in the header hero, don't duplicate
    const key = o.foco || 'General'
    if (!byFoco.has(key)) byFoco.set(key, [])
    byFoco.get(key).push(o)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-12 pb-16 pt-16"
    >
      {/* Cabecera — title/countdown row + the North Star hero. Always
          rendered as its own section, never mixed into the objetivo grid
          below, so "where's the North Star" always has a real answer. */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[#F5F5F5]">Objetivos</h1>
            <p className="text-[13px] text-[#888888]">
              Metas de ADOR para {quarterLabel(quarterKey)} — conectadas a Finanzas, Clientes y Workspace
              {daysLeft > 0 && ` · ${daysLeft} días restantes`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openModal()}
            className="ador-btn-primary flex-shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] font-medium"
          >
            + Nuevo Objetivo
          </button>
        </div>

        <NorthStarHero objetivo={northStar} />
      </div>

      {/* Panel de Objetivos (main) + rail lateral (Iniciativas/Experimentos)
          — same split-column pattern as Workspace's sidebar/main/Decisiones
          shell, so the connective tissue (what's being worked on, what's
          being tested) never has to compete for space with the goals grid. */}
      <div className="grid grid-cols-[1fr_320px] items-start gap-6">
        <div className="flex flex-col gap-6">
          {objetivos.length === 0 ? (
            <EmptyBoardCTA quarterKey={quarterKey} onCreate={() => openModal()} onPreset={openModal} />
          ) : (
            [...byFoco.entries()].map(([foco, items]) => (
              <div key={foco} className="flex flex-col gap-3">
                <span
                  className="font-medium text-[#444444]"
                  style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  {foco}
                </span>
                <div className="grid grid-cols-2 gap-5">
                  {items.map((o) => (
                    <ObjetivoCard
                      key={o.id}
                      objetivo={o}
                      owner={userById[o.ownerId]}
                      actorName={actorName}
                      northStarId={northStar?.id}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-6">
          <IniciativasPanel tasks={openLinkedTasks} />
          <ExperimentosPanel objetivos={objetivos} actorName={actorName} />
        </div>
      </div>

      <AnimatePresence>
        {showNew && (
          <NewObjetivoModal
            quarterKey={quarterKey}
            actorName={actorName}
            users={users}
            preset={preset}
            onClose={() => {
              setShowNew(false)
              setPreset(null)
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
