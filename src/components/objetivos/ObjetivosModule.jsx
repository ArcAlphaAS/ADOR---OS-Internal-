import AnimatedNumber from '../common/AnimatedNumber'
import { PageSkeleton } from '../common/CardSkeleton'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useObjetivosData } from '../../hooks/useObjetivosData'
import { quarterLabel, daysLeftInQuarter } from '../../lib/finance'
import { quarterKey as currentQuarterKey } from '../../lib/finance'
import { quarterElapsedPct } from '../../lib/weeklySummary'
import { objetivoPct, objetivoStatus, shiftQuarter, OBJETIVO_METRICS } from '../../lib/objetivos'
import { currencyPEN } from '../../lib/clientStages'
import { useAccess } from '../../hooks/useAccess'
import ObjetivoRow from './ObjetivoRow'
import NewObjetivoModal from './NewObjetivoModal'
import ExperimentosPanel from './ExperimentosPanel'
import DecisionesCard from './DecisionesCard'
import Panel, { PanelAction, PanelEmpty } from './Panel'
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
        className="flex h-14 w-14 items-center justify-center rounded-full text-[#F4EEE2]"
        style={{
          backgroundColor: 'rgba(244,238,226,0.1)',
          border: '1px solid rgba(244,238,226,0.25)',
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
        <span className="text-[11px] text-[#8A8A8A]">o arranca de una:</span>
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

// Icons for the stats (real SVG, not text glyphs).
const I = (d) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const ICON = {
  target: I(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>),
  alert: I(<><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.5v.1" /></>),
  tasks: I(<><path d="M9 6h11M9 12h11M9 18h11" /><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" /></>),
  flask: I(<><path d="M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3" /><path d="M7.5 15h9" /></>),
  decision: I(<><path d="M12 3l9 9-9 9-9-9z" /><path d="M12 8v4l2.5 2" /></>),
}

// El estado del trimestre, al estilo de las apps de Apple (Salud, Bolsa): una cifra grande y ligera,
// una frase clara, una barra fina con el marcador de "dónde deberías ir hoy", y debajo los números
// clave separados por líneas finas. Sin adornos: el color solo cuando informa.
function QuarterSummary({ avg, elapsed, daysLeft, isCurrent, closed, count, stats }) {
  const delta = avg - elapsed
  const state = closed ? null : !isCurrent ? null : count === 0 ? null : delta >= 5 ? { text: 'Por delante del ritmo', color: '#7FC98F' } : delta >= -5 ? { text: 'Al ritmo del trimestre', color: '#F4EEE2' } : { text: `${Math.abs(delta)} pts por debajo del ritmo`, color: '#E8A25A' }
  const line = closed ? 'Trimestre cerrado.' : !isCurrent ? 'Trimestre por venir.' : count === 0 ? 'Define las metas del trimestre.' : `${elapsed}% del tiempo transcurrido · ${daysLeft} días restantes`
  return (
    <section className="py-2">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-[#8E8E93]">Avance del trimestre</p>
          <p className="mt-1 flex items-baseline leading-none text-[#F5F5F5]" style={{ fontSize: 'clamp(64px, 11vw, 104px)', fontWeight: 200, letterSpacing: '-0.045em' }}>
            <AnimatedNumber value={avg} /><span className="ml-1 text-[0.42em] font-light text-[#8E8E93]">%</span>
          </p>
        </div>
        <div className="sm:pb-3 sm:text-right">
          {state && <p className="text-[17px] font-medium" style={{ color: state.color }}>{state.text}</p>}
          <p className="mt-1 text-[14px] text-[#8E8E93]">{line}</p>
        </div>
      </div>

      <div className="relative mt-5 py-2">
        <div className="h-[6px] overflow-hidden rounded-full bg-white/[0.09]">
          <motion.div className="h-full rounded-full" style={{ background: state?.color === '#E8A25A' ? '#E8A25A' : '#F4EEE2' }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, avg)}%` }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        {isCurrent && elapsed > 0 && elapsed < 100 && (
          <span title={`Tiempo transcurrido: ${elapsed}%`} className="absolute top-0 h-full w-px -translate-x-1/2 bg-white/60" style={{ left: `${elapsed}%` }}>
            <span className="absolute -top-px left-1/2 h-[6px] w-[6px] -translate-x-1/2 rounded-full bg-white/85" />
          </span>
        )}
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-y-6 sm:grid-cols-5 sm:gap-y-0">
        {stats.map((it, i) => (
          <div key={it.label} className={`px-1 sm:px-6 ${i > 0 ? 'sm:border-l sm:border-white/[0.08]' : 'sm:pl-0'}`}>
            <dd className="text-[30px] font-light leading-none tabular-nums tracking-[-0.02em]" style={{ color: it.color }}><AnimatedNumber value={it.value} /></dd>
            <dt className="mt-2 text-[12.5px] text-[#8E8E93]">{it.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}

const TASK_STATUS = {
  por_hacer: { label: 'Por hacer', color: '#AAAAAA' },
  en_progreso: { label: 'En curso', color: '#4CAF50' },
  bloqueado: { label: 'Bloqueado', color: '#EF5350' },
}

// Tareas reales de Workspace vinculadas a los objetivos de este trimestre.
function IniciativasCard({ tasks, onNavigate }) {
  return (
    <Panel title="Iniciativas vinculadas" subtitle={tasks.length ? `${tasks.length} en curso` : null} action={<PanelAction onClick={() => onNavigate?.('workspace')}>Workspace →</PanelAction>} className="h-full">
      {tasks.length === 0 ? (
        <PanelEmpty>Sin tareas vinculadas. En Workspace, abre una tarea y elige «Objetivo vinculado».</PanelEmpty>
      ) : (
        <ul className="-mx-1 flex flex-col divide-y divide-white/[0.07]">
          {tasks.slice(0, 6).map((t) => {
            const st = TASK_STATUS[t.status] || TASK_STATUS.por_hacer
            const due = t.dueDate?.toDate?.()
            return (
              <li key={t.id} className="flex items-center gap-3 px-1 py-3.5">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: st.color }} title={st.label} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] text-[#F5F5F5]">{t.title}</p>
                  <p className="truncate text-[12.5px] text-[#8E8E93]">{[t.objetivoTitle, due ? `vence ${due.toLocaleDateString('es', { day: 'numeric', month: 'short' })}` : null].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="flex -space-x-1.5">
                  {t.assignees.slice(0, 2).map((u) => (
                    <span key={u.id} className="rounded-full ring-2 ring-[#1C1C1E]">
                      <Avatar photoURL={u.photoDataUrl} displayName={u.displayName} email={u.email} size={22} />
                    </span>
                  ))}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

// Los números en vivo sobre los que corren los objetivos: cuatro mosaicos con la cifra grande y, si hay
// meta, cuánto de ella llevan.
function MetricasCard({ liveValues, objetivos, isCurrentQuarter }) {
  const rows = OBJETIVO_METRICS.filter((m) => m.live).map((m) => {
    const goal = objetivos.find((o) => o.type !== 'milestone' && o.metric === m.id && o.targetValue)
    const value = liveValues[m.id] || 0
    const fmt = (v) => (m.unit === 'S/' ? currencyPEN.format(v) : Math.round(v))
    const pct = goal ? Math.min(100, Math.round((value / goal.targetValue) * 100)) : null
    return { id: m.id, label: m.label.replace(' (trimestre)', ''), value: fmt(value), goal: goal ? fmt(goal.targetValue) : null, pct }
  })
  return (
    <Panel title="Métricas clave" subtitle={isCurrentQuarter ? 'En vivo' : 'Del trimestre actual'} className="h-full">
      <div className="grid grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.id} className="flex min-w-0 flex-col rounded-[18px] bg-white/[0.045] p-4">
            <p className="truncate text-[12.5px] text-[#8E8E93]">{r.label}</p>
            <p className="mt-2 truncate text-[26px] font-light leading-none tabular-nums tracking-[-0.02em] text-[#F5F5F5]">{r.value}</p>
            {r.pct !== null ? (
              <>
                <div className="mt-3 h-[4px] overflow-hidden rounded-full bg-white/[0.09]"><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 100 ? '#7FC98F' : '#F4EEE2' }} /></div>
                <p className="mt-1.5 text-[11.5px] tabular-nums text-[#8E8E93]">{r.pct}% de {r.goal}</p>
              </>
            ) : (
              <p className="mt-3 text-[11.5px] text-[#6E6E73]">Sin meta</p>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

export default function ObjetivosModule({ user, onNavigate }) {
  const access = useAccess()
  const [viewQuarter, setViewQuarter] = useState(currentQuarterKey())
  const { loaded, objetivos, quarterKey, isCurrentQuarter, northStar, users, openLinkedTasks, liveValueByMetric, activeExperiments, quarterDecisions } = useObjetivosData(viewQuarter)
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
  const atRisk = statuses.filter((st) => st === 'riesgo' || st === 'bloqueado').length
  const stats = [
    { value: objetivos.filter((o, i) => statuses[i] !== 'logrado').length, label: 'Objetivos activos', color: '#F5F5F5' },
    { value: atRisk, label: 'En riesgo', color: atRisk ? '#EF8A85' : '#F5F5F5' },
    { value: openLinkedTasks.length, label: 'Iniciativas en curso', color: '#F5F5F5' },
    { value: activeExperiments, label: 'Experimentos', color: '#F5F5F5' },
    { value: quarterDecisions, label: 'Decisiones', color: '#F5F5F5' },
  ]
  const [filter, setFilter] = useState('all') // 'all' | 'riesgo' | un foco
  const focos = [...new Set(objetivos.map((o) => (o.foco || 'General').trim()).filter((f) => f && f !== 'General'))]
  const showFilters = objetivos.length > 1 && (focos.length > 0 || atRisk > 0)
  const visible = ordered.map((o, i) => ({ o, i, st: statuses[objetivos.indexOf(o)] })).filter(({ o, st }) => filter === 'all' || (filter === 'riesgo' ? st === 'riesgo' || st === 'bloqueado' : (o.foco || 'General').trim() === filter))
  const quarters = [-1, 0, 1].map((d) => shiftQuarter(viewQuarter, d))

  return (
    <motion.div
      initial={false}
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      {/* Header: title · quarter switcher · new */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A8A8A]">Dirección estratégica</p>
          <h1 className="ador-title mt-1">Objetivos</h1>
          <p className="mt-2 text-[13.5px] text-[#9A9A9A]">Metas de ADOR conectadas a Finanzas, Clientes y Workspace.</p>
        </div>
        <div className="flex w-full flex-col items-start gap-1.5 lg:w-auto lg:items-center">
          <div className="ador-glass flex w-full items-center justify-between gap-1 rounded-2xl p-1 lg:w-auto lg:justify-start">
            <button type="button" onClick={() => setViewQuarter(shiftQuarter(viewQuarter, -1))} aria-label="Trimestre anterior" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#AAAAAA] hover:bg-white/[0.06]">
              <ArrowLeftIcon size={13} />
            </button>
            {quarters.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setViewQuarter(q)}
                className="flex-1 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors lg:flex-none lg:px-4"
                style={{ background: q === viewQuarter ? '#F5F5F5' : 'transparent', color: q === viewQuarter ? '#0A0A0A' : '#8A8A8A' }}
              >
                {quarterLabel(q)}
              </button>
            ))}
            <button type="button" onClick={() => setViewQuarter(shiftQuarter(viewQuarter, 1))} aria-label="Trimestre siguiente" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#AAAAAA] hover:bg-white/[0.06]">
              <ArrowRightIcon size={13} />
            </button>
          </div>
          <p className="text-[12px] text-[#8A8A8A]">
            {isCurrentQuarter ? `${daysLeft} días restantes en el trimestre` : viewQuarter < currentQuarterKey() ? 'Trimestre cerrado' : 'Trimestre por venir'}
            {!isCurrentQuarter && (
              <button type="button" onClick={() => setViewQuarter(currentQuarterKey())} className="ml-2 text-[#F4EEE2] hover:underline">
                Volver al actual
              </button>
            )}
          </p>
        </div>
        <button type="button" onClick={() => openModal()} className="ador-btn-primary w-full flex-shrink-0 self-start whitespace-nowrap rounded-full px-5 py-3 text-[14.5px] font-semibold sm:w-auto sm:py-2.5 sm:text-[13.5px] sm:font-medium">
          + Nuevo objetivo
        </button>
      </div>

      {!loaded && <PageSkeleton />}
      {loaded && <QuarterSummary avg={avg} elapsed={elapsed} daysLeft={daysLeft} isCurrent={isCurrentQuarter} closed={!isCurrentQuarter && viewQuarter < currentQuarterKey()} count={objetivos.length} stats={stats} />}

      {!loaded ? null : objetivos.length === 0 ? (
        <EmptyBoardCTA quarterKey={quarterKey} onCreate={() => openModal()} onPreset={openModal} />
      ) : (
        <div className="flex flex-col gap-4">
          {showFilters && (
            <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none' }}>
              <div className="inline-flex gap-0.5 rounded-full bg-white/[0.07] p-1">
                {[['all', `Todos · ${objetivos.length}`], ...(atRisk ? [['riesgo', `En riesgo · ${atRisk}`]] : []), ...focos.map((f) => [f, f])].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setFilter(id)} className="relative flex-shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors" style={{ color: filter === id ? '#0A0A0A' : '#A8A8AD' }}>
                    {filter === id && <motion.span layoutId="objetivos-filter" className="absolute inset-0 rounded-full bg-[#F5F5F5]" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="overflow-hidden rounded-[24px] bg-[#1C1C1E] [&>div+div]:border-t [&>div+div]:border-white/[0.07]">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map(({ o, i }, k) => (
              <motion.div key={o.id} layout="position" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5, delay: Math.min(k, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}>
                <ObjetivoRow
                  canManage={access.isAdmin}
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
              </motion.div>
            ))}
          </AnimatePresence>
          </div>
          {visible.length === 0 && <p className="py-10 text-center text-[14px] text-[#8A8A8A]">Ningún objetivo coincide con este filtro.</p>}
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-3">
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
