import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useWeeklySummary } from '../../hooks/useWeeklySummary'
import WeeklySummaryPanel from './WeeklySummaryPanel'

export default function WeeklySummaryCard() {
  const summary = useWeeklySummary()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`ador-glass ador-grain ador-card-hover w-full rounded-[20px] px-7 py-6 text-left ${summary.level === 'urgent' ? 'ador-card-urgent' : summary.level === 'warn' ? 'ador-card-attention' : ''}`}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-medium text-[#7A7A7A]"
            style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            {summary.rhythm?.title || 'Resumen Semanal'}
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ animation: 'ador-pulse 2s ease-in-out infinite', background: summary.level === 'urgent' ? '#EF5350' : summary.level === 'warn' ? '#E8C15A' : '#4CAF50' }}
          />
        </div>
        {summary.rhythm ? (
          <>
            <p className="mt-3 text-[14px] font-light text-[#F5F5F5]">{summary.rhythm.line}</p>
            {summary.level !== 'calm' && <p className="mt-1.5 text-[13px] font-medium text-[#C9C9C9]">{summary.tldr}</p>}
          </>
        ) : (
          <p className={`mt-3 text-[#F5F5F5] ${summary.level === 'calm' ? 'text-[14px] font-light' : 'text-[15px] font-medium'}`}>{summary.tldr}</p>
        )}
        <span className="mt-3 inline-block text-[12px] font-medium text-[#F4EEE2]">Ver resumen completo →</span>
      </button>

      <AnimatePresence>{open && <WeeklySummaryPanel summary={summary} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}
