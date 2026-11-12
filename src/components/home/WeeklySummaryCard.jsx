import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useWeeklySummary } from '../../hooks/useWeeklySummary'
import WeeklySummaryPanel from './WeeklySummaryPanel'
import { currencyPEN } from '../../lib/clientStages'
import AnimatedNumber from '../common/AnimatedNumber'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

// Mini gráfico: tareas cerradas por día (equipo), hoy en marfil, días futuros apagados,
// y cómo va frente a la semana pasada.
function WeekBars({ daily, completed, prev }) {
  const max = Math.max(1, ...daily.map((d) => d.count))
  const diff = completed - prev
  return (
    <div className="mt-5 w-full">
      <div className="flex items-baseline justify-between">
        <p className="text-[12px] text-[#8A8A8A]">Tareas cerradas · equipo</p>
        <p className="text-[12px] tabular-nums text-[#A8A8A8]">
          <span className="text-[15px] font-light text-[#F5F5F5]">{completed}</span>
          {prev > 0 || completed > 0 ? <span className="ml-1.5" style={{ color: diff > 0 ? '#7FC98F' : diff < 0 ? '#D98A86' : '#8A8A8A' }}>{diff > 0 ? '+' : ''}{diff} vs. semana pasada</span> : null}
        </p>
      </div>
      <div className="mt-3 flex h-[68px] items-end gap-2">
        {daily.map((d, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div className="flex w-full flex-1 items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${d.count ? Math.max(10, (d.count / max) * 100) : 4}%` }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                title={`${d.count} ${d.count === 1 ? 'tarea' : 'tareas'}`}
                className="w-full rounded-[5px]"
                style={{ background: d.isToday ? '#F4EEE2' : d.future ? 'rgba(255,255,255,0.06)' : d.count ? 'rgba(244,238,226,0.45)' : 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <span className="text-[10px]" style={{ color: d.isToday ? '#F4EEE2' : '#767676' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WeeklySummaryCard() {
  const summary = useWeeklySummary()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`ador-glass ador-grain ador-card-hover flex h-full w-full flex-col items-start ${CARD_RADIUS} ${CARD_PAD} text-left`}
      >
        <CardHeader label={summary.rhythm?.title || 'Resumen semanal'} dot={summary.level === 'urgent' ? '#EF5350' : summary.level === 'warn' ? '#E8C15A' : '#4CAF50'} />
        {summary.rhythm ? (
          <>
            <p className="mt-3 text-[14px] font-light text-[#F5F5F5]">{summary.rhythm.line}</p>
            {summary.level !== 'calm' && <p className="mt-1.5 text-[13px] font-medium text-[#C9C9C9]">{summary.tldr}</p>}
          </>
        ) : (
          <p className={`mt-3 text-[#F5F5F5] ${summary.level === 'calm' ? 'text-[14px] font-light' : 'text-[15px] font-medium'}`}>{summary.tldr}</p>
        )}
        <WeekBars daily={summary.stats?.daily || []} completed={summary.stats?.completed ?? 0} prev={summary.stats?.completedPrev ?? 0} />
        <div className="mt-4 grid w-full grid-cols-2 gap-x-4 border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-[18px] font-light tabular-nums leading-none" style={{ color: summary.stats?.overdue ? '#EF5350' : '#F4EEE2' }}><AnimatedNumber value={summary.stats?.overdue ?? 0} /></p>
            <p className="mt-1.5 text-[11.5px] text-[#8A8A8A]">Vencidas · equipo</p>
          </div>
          <div>
            <p className="truncate text-[18px] font-light tabular-nums leading-none text-[#F4EEE2]"><AnimatedNumber value={summary.stats?.income ?? 0} format={(n) => currencyPEN.format(n)} /></p>
            <p className="mt-1.5 text-[11.5px] text-[#8A8A8A]">Ingresos de la semana</p>
          </div>
        </div>
        <span className="mt-auto inline-block pt-4 text-[12px] font-medium text-[#F4EEE2]">Ver resumen completo →</span>
      </button>

      <AnimatePresence>{open && <WeeklySummaryPanel summary={summary} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}
