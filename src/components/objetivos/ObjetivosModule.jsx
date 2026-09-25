import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useObjetivosData } from '../../hooks/useObjetivosData'
import { quarterLabel, daysLeftInQuarter } from '../../lib/finance'
import { quarterKey as currentQuarterKey } from '../../lib/finance'
import { quarterElapsedPct } from '../../lib/weeklySummary'
import { objetivoPct, objetivoStatus, shiftQuarter, OBJETIVO_METRICS } from '../../lib/objetivos'
import { currencyPEN } from '../../lib/clientStages'
import ObjetivoRow from './ObjetivoRow'
import NewObjetivoModal from './NewObjetivoModal'
import ExperimentosPanel from './ExperimentosPanel'
import DecisionesCard from './DecisionesCard'
import Avatar from '../shell/Avatar'
import { SERIF } from '../news/NewsLayout'
import { TargetIcon, ArrowLeftIcon, ArrowRightIcon } from '../icons'

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

// Summary strip: six numbers that answer "how is the quarter going".
function SummaryStrip({ items }) {
  return (
    <div className="ador-glass ador-grain grid grid-cols-2 overflow-hidden rounded-[22px] sm:grid-cols-3 xl:grid-cols-6">
      {items.map((it, i) => (
        <div key={it.label} className={`flex items-center gap-3.5 px-5 py-5 ${i > 0 ? 'xl:border-l' : ''} border-white/[0.06] ${i % 2 ? 'border-l sm:border-l-0' : ''} ${i >= 2 ? 'border-t sm:border-t-0' : ''} ${i >= 3 ? 'sm:border-t xl:border-t-0' : ''} ${i % 3 ? 'sm:border-l' : ''}`}>
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[17px]" style={{ background: `${it.color}1F`, color: it.color }}>
            {it.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[22px] font-semibold leading-none tabular-nums text-[#F5F5F5]">{it.value}</p>
            <p className="mt-1 truncate text-[12.5px] text-[#8A8A8A]">{it.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

const TASK_STATUS = {
  por_hacer: { label: 'Por hacer', color: '#AAAAAA' },
  en_progreso: { label: 'En curso', color: '#4CAF50' },
  bloqueado: { label: 'Bloqueado', color: '#EF5350' },
}

function PanelHeader({ icon, title, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-2.5 text-[15px] font-medium text-[#F5F5F5]">
        <span className="text-[#AAAAAA]">{icon}</span>
        {title}
      </p>
      {action}
    </div>
  )
}

// Real Workspace tasks linked to this quarter's objetivos.
function IniciativasCard({ tasks, onNavigate }) {
  return (
    <div className="ador-glass ador-grain flex flex-col gap-3 rounded-[22px] p-5">
      <PanelHeader
        icon="◎"
        title="Iniciativas vinculadas"
        action={
          <button type="button" onClick={() => onNavigate?.('workspace')} className="text-[12.5px] text-[#8A8A8A] hover:text-[#F5F5F5]">
            Ver en Workspace →
          </button>
        }
      />
      {tasks.length === 0 ? (
        <p className="py-4 text-[13px] leading-relaxed text-[#7A7A7A]">Sin tareas vinculadas. En Workspace, abre una tarea y elige “Objetivo vinculado”.</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {tasks.slice(0, 6).map((t) => {
            const st = TASK_STATUS[t.status] || TASK_STATUS.por_hacer
            const due = t.dueDate?.toDate?.()
            return (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#3B82F6]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-[#EDEDED]">{t.title}</p>
                  <p className="truncate text-[12px] text-[#7A7A7A]">
                    {t.objetivoTitle}
                    {due ? ` · vence ${due.toLocaleDateString('es', { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                </div>
                <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px]" style={{ color: st.color, background: `${st.color}1A` }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
                  {st.label}
                </span>
                <span className="flex -space-x-1.5">
                  {t.assignees.slice(0, 2).map((u) => (
                    <span key={u.id} className="rounded-full ring-2 ring-[#141414]">
                      <Avatar photoURL={u.photoDataUrl} displayName={u.displayName} email={u.email} size={20} />
                    </span>
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// The live numbers the objetivos run on, with their target when one exists.
function MetricasCard({ liveValues, objetivos, isCurrentQuarter }) {
  const rows = OBJETIVO_METRICS.filter((m) => m.live).map((m) => {
    const goal = objetivos.find((o) => o.type !== 'milestone' && o.metric === m.id && o.targetValue)
    const value = liveValues[m.id] || 0
    const fmt = (v) => (m.unit === 'S/' ? currencyPEN.format(v) : Math.round(v))
    const pct = goal ? Math.min(100, Math.round((value / goal.targetValue) * 100)) : null
    return { id: m.id, label: m.label, text: goal ? `${fmt(value)} / ${fmt(goal.targetValue)}` : fmt(value), pct }
  })
  return (
    <div className="ador-glass ador-grain flex flex-col gap-3 rounded-[22px] p-5">
      <PanelHeader icon="▮▮" title="Métricas clave" action={<span className="text-[11.5px] text-[#7A7A7A]">{isCurrentQuarter ? 'En vivo' : 'Trimestre actual'}</span>} />
      <div className="flex flex-col divide-y divide-white/[0.06]">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13.5px] text-[#DDDDDD]">{r.label}</p>
              <p className="text-[13px] tabular-nums text-[#AAAAAA]">
                {r.text}
                {r.pct !== null && <span className="ml-2 font-medium text-[#F5F5F5]">{r.pct}%</span>}
              </p>
            </div>
            {r.pct !== null ? (
              <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 100 ? '#4CAF50' : '#3B82F6' }} />
              </div>
            ) : (
              <p className="text-[11.5px] text-[#6A6A6A]">Sin meta este trimestre</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ObjetivosModule({ user, onNavigate }) {
  const [viewQuarter, setViewQuarter] = useState(currentQuarterKey())
  const { objetivos, quarterKey, isCurrentQuarter, northStar, users, openLinkedTasks, liveValueByMetric, activeExperiments, quarterDecisions } = useObjetivosData(viewQuarter)
  const [showNew, setShowNew] = useState(false)
  const [preset, setPreset] = useState(null)
  const actorName = actorNameFor(user)
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))
  const daysLeft = daysLeftInQuarter()
  const elapsed = quarterElapsedPct()

  const openModal = (p = null) => {
    setPreset(p)
    setShowNew(true)
  }

  // Métrica Norte first, then the order they were created.
  const ordered = [...objetivos].sort((a, b) => Boolean(b.isNorthStar) - Boolean(a.isNorthStar))
  const statuses = objetivos.map((o) => objetivoStatus(o, elapsed, isCurrentQuarter))
  const avg = objetivos.length ? Math.round(objetivos.reduce((n, o) => n + objetivoPct(o), 0) / objetivos.length) : 0
  const summary = [
    { icon: '◎', value: objetivos.filter((o, i) => statuses[i] !== 'logrado').length, label: 'Objetivos activos', color: '#3B82F6' },
    { icon: '▮', value: `${avg}%`, label: 'Progreso promedio', color: '#3B82F6' },
    { icon: '●', value: statuses.filter((s) => s === 'riesgo' || s === 'bloqueado').length, label: 'En riesgo', color: '#EF5350' },
    { icon: '↗', value: openLinkedTasks.length, label: 'Iniciativas en curso', color: '#4CAF50' },
    { icon: '⚗', value: activeExperiments, label: 'Experimentos activos', color: '#A78BDA' },
    { icon: '✦', value: quarterDecisions, label: 'Decisiones de dirección', color: '#E8C15A' },
  ]
  const quarters = [-1, 0, 1].map((d) => shiftQuarter(viewQuarter, d))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      {/* Header: title · quarter switcher · new */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A8A8A]">Dirección estratégica</p>
          <h1 className="ador-title mt-1">Objetivos</h1>
          <p className="mt-2 text-[13.5px] text-[#9A9A9A]">Metas de ADOR conectadas a Finanzas, Clientes y Workspace.</p>
        </div>
        <div className="flex flex-col items-start gap-1.5 lg:items-center">
          <div className="ador-glass flex items-center gap-1 rounded-2xl p-1">
            <button type="button" onClick={() => setViewQuarter(shiftQuarter(viewQuarter, -1))} aria-label="Trimestre anterior" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#AAAAAA] hover:bg-white/[0.06]">
              <ArrowLeftIcon size={13} />
            </button>
            {quarters.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setViewQuarter(q)}
                className="rounded-xl px-4 py-2 text-[13px] font-medium transition-colors"
                style={{ background: q === viewQuarter ? 'rgba(59,130,246,0.18)' : 'transparent', color: q === viewQuarter ? '#F5F5F5' : '#8A8A8A' }}
              >
                {quarterLabel(q)}
              </button>
            ))}
            <button type="button" onClick={() => setViewQuarter(shiftQuarter(viewQuarter, 1))} aria-label="Trimestre siguiente" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#AAAAAA] hover:bg-white/[0.06]">
              <ArrowRightIcon size={13} />
            </button>
          </div>
          <p className="text-[12px] text-[#7A7A7A]">
            {isCurrentQuarter ? `${daysLeft} días restantes en el trimestre` : viewQuarter < currentQuarterKey() ? 'Trimestre cerrado' : 'Trimestre por venir'}
            {!isCurrentQuarter && (
              <button type="button" onClick={() => setViewQuarter(currentQuarterKey())} className="ml-2 text-[#E8C15A] hover:underline">
                Volver al actual
              </button>
            )}
          </p>
        </div>
        <button type="button" onClick={() => openModal()} className="ador-btn-primary flex-shrink-0 self-start whitespace-nowrap rounded-full px-5 py-2.5 text-[13.5px] font-medium">
          + Nuevo objetivo
        </button>
      </div>

      <SummaryStrip items={summary} />

      {objetivos.length === 0 ? (
        <EmptyBoardCTA quarterKey={quarterKey} onCreate={() => openModal()} onPreset={openModal} />
      ) : (
        <div className="flex flex-col gap-4">
          {ordered.map((o, i) => (
            <ObjetivoRow
              key={o.id}
              objetivo={o}
              index={i}
              owner={userById[o.ownerId]}
              actorName={actorName}
              northStarId={northStar?.id}
              elapsedPct={elapsed}
              daysLeft={daysLeft}
              isCurrentQuarter={isCurrentQuarter}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <IniciativasCard tasks={openLinkedTasks} onNavigate={onNavigate} />
        <MetricasCard liveValues={liveValueByMetric} objetivos={objetivos} isCurrentQuarter={isCurrentQuarter} />
        <div className="flex flex-col gap-5 lg:col-span-2 xl:col-span-1">
          <ExperimentosPanel objetivos={objetivos} actorName={actorName} />
          <DecisionesCard actorName={actorName} />
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
