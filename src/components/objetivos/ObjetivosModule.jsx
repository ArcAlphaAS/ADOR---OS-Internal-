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

// El estado del trimestre en una sola pieza: un anillo doble (afuera el tiempo que ya pasó, adentro el
// progreso real de los objetivos) y una frase honesta que compara las dos cosas, más los números clave.
function QuarterHero({ avg, elapsed, daysLeft, isCurrent, closed, count, stats }) {
  const R1 = 62, R2 = 48
  const C1 = 2 * Math.PI * R1, C2 = 2 * Math.PI * R2
  const delta = avg - elapsed
  const tone = !isCurrent ? '#F4EEE2' : delta >= 5 ? '#7FC98F' : delta >= -5 ? '#F4EEE2' : '#E8A25A'
  const headline = closed
    ? 'Trimestre cerrado'
    : !isCurrent
      ? 'Trimestre por venir'
      : count === 0
        ? 'Aún sin objetivos'
        : delta >= 5
          ? 'Vas por delante del ritmo'
          : delta >= -5
            ? 'Vas al ritmo del trimestre'
            : `Vas ${Math.abs(delta)} puntos por debajo del ritmo`
  const sub = closed
    ? `Cerraste con ${avg}% de avance promedio.`
    : !isCurrent
      ? 'Prepara las metas antes de que empiece.'
      : `${avg}% de avance con ${elapsed}% del tiempo transcurrido · ${daysLeft} días restantes.`
  return (
    <div className="ador-glass ador-grain flex flex-col items-center gap-6 rounded-[26px] p-6 sm:flex-row sm:gap-9 sm:p-8">
      <div className="relative flex-shrink-0" style={{ width: 152, height: 152 }}>
        <svg width="152" height="152" viewBox="0 0 152 152" className="-rotate-90" aria-hidden>
          <circle cx="76" cy="76" r={R1} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
          <motion.circle cx="76" cy="76" r={R1} fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="5" strokeLinecap="round" strokeDasharray={C1} initial={{ strokeDashoffset: C1 }} animate={{ strokeDashoffset: C1 * (1 - Math.min(100, elapsed) / 100) }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} />
          <circle cx="76" cy="76" r={R2} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
          <motion.circle cx="76" cy="76" r={R2} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round" strokeDasharray={C2} initial={{ strokeDashoffset: C2 }} animate={{ strokeDashoffset: C2 * (1 - Math.min(100, avg) / 100) }} transition={{ duration: 1.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[34px] font-semibold leading-none tabular-nums text-[#F5F5F5]"><AnimatedNumber value={avg} />%</span>
          <span className="mt-1.5 text-[11px] uppercase tracking-[0.1em] text-[#8A8A8A]">avance</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A8A8A]">Estado del trimestre</p>
        <h2 className="mt-2 text-[26px] leading-tight tracking-[-0.01em] text-[#F5F5F5] sm:text-[32px]" style={{ ...SERIF, color: tone === '#F4EEE2' ? '#F5F5F5' : tone }}>{headline}</h2>
        <p className="mt-2 text-[14px] text-[#9A9A9A]">{sub}</p>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
          {stats.map((it) => (
            <div key={it.label} className="flex items-center gap-2.5 text-left">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ background: `${it.color}1F`, color: it.color }}>{it.icon}</span>
              <div className="min-w-0">
                <p className="text-[19px] font-semibold leading-none tabular-nums text-[#F5F5F5]"><AnimatedNumber value={it.value} /></p>
                <p className="mt-1 truncate text-[11.5px] leading-tight text-[#8A8A8A]">{it.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
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
        icon={ICON.tasks}
        title="Iniciativas vinculadas"
        action={
          <button type="button" onClick={() => onNavigate?.('workspace')} className="text-[12.5px] text-[#8A8A8A] hover:text-[#F5F5F5]">
            Ver en Workspace →
          </button>
        }
      />
      {tasks.length === 0 ? (
        <p className="py-4 text-[13px] leading-relaxed text-[#8A8A8A]">Sin tareas vinculadas. En Workspace, abre una tarea y elige “Objetivo vinculado”.</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {tasks.slice(0, 6).map((t) => {
            const st = TASK_STATUS[t.status] || TASK_STATUS.por_hacer
            const due = t.dueDate?.toDate?.()
            return (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#F4EEE2]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-[#EDEDED]">{t.title}</p>
                  <p className="truncate text-[12px] text-[#8A8A8A]">
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
      <PanelHeader icon={I(<path d="M5 20V10M12 20V4M19 20v-7" />)} title="Métricas clave" action={<span className="text-[11.5px] text-[#8A8A8A]">{isCurrentQuarter ? 'En vivo' : 'Trimestre actual'}</span>} />
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
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 100 ? '#4CAF50' : '#F4EEE2' }} />
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
    { icon: ICON.target, value: objetivos.filter((o, i) => statuses[i] !== 'logrado').length, label: 'Objetivos activos', color: '#F4EEE2' },
    { icon: ICON.alert, value: atRisk, label: 'En riesgo', color: atRisk ? '#EF5350' : '#8A8A8A' },
    { icon: ICON.tasks, value: openLinkedTasks.length, label: 'Iniciativas en curso', color: '#7FC98F' },
    { icon: ICON.flask, value: activeExperiments, label: 'Experimentos', color: '#A78BDA' },
    { icon: ICON.decision, value: quarterDecisions, label: 'Decisiones', color: '#E8C15A' },
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
      {loaded && <QuarterHero avg={avg} elapsed={elapsed} daysLeft={daysLeft} isCurrent={isCurrentQuarter} closed={!isCurrentQuarter && viewQuarter < currentQuarterKey()} count={objetivos.length} stats={stats} />}

      {!loaded ? null : objetivos.length === 0 ? (
        <EmptyBoardCTA quarterKey={quarterKey} onCreate={() => openModal()} onPreset={openModal} />
      ) : (
        <div className="flex flex-col gap-4">
          {showFilters && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none' }}>
              {[['all', `Todos · ${objetivos.length}`], ...(atRisk ? [['riesgo', `En riesgo · ${atRisk}`]] : []), ...focos.map((f) => [f, f])].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setFilter(id)} className="relative flex-shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors" style={{ color: filter === id ? '#0A0A0A' : id === 'riesgo' ? '#EF9A98' : '#B8B8B8', background: filter === id ? '#F5F5F5' : 'rgba(255,255,255,0.06)' }}>
                  {label}
                </button>
              ))}
            </div>
          )}
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
          {visible.length === 0 && <p className="py-10 text-center text-[14px] text-[#8A8A8A]">Ningún objetivo coincide con este filtro.</p>}
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
