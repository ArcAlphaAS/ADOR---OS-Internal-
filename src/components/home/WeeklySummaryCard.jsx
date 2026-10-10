import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useWeeklySummary } from '../../hooks/useWeeklySummary'
import WeeklySummaryPanel from './WeeklySummaryPanel'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

export default function WeeklySummaryCard() {
  const summary = useWeeklySummary()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`ador-glass ador-grain ador-card-hover flex h-full w-full flex-col items-start ${CARD_RADIUS} ${CARD_PAD} text-left ${summary.level === 'urgent' ? 'ador-card-urgent' : summary.level === 'warn' ? 'ador-card-attention' : ''}`}
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
        <span className="mt-auto inline-block pt-4 text-[12px] font-medium text-[#F4EEE2]">Ver resumen completo →</span>
      </button>

      <AnimatePresence>{open && <WeeklySummaryPanel summary={summary} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}
