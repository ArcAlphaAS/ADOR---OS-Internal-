import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useWeeklySummary } from '../../hooks/useWeeklySummary'
import WeeklySummaryPanel from './WeeklySummaryPanel'

// The one card on Home that actually synthesizes the week — everything else
// is a raw number. Given hero treatment (bigger, its own glow, a status
// color) instead of the same flat glass weight as every stat tile, so the
// most useful content on the page is also the most visually obvious one —
// see the 2026-08-21 "nothing on this page has a focal point" design
// critique this was built to answer.
const LEVEL_STYLES = {
  urgent: { accent: '#EF5350', glow: 'rgba(239,83,80,0.10)' },
  warn: { accent: '#FFC107', glow: 'rgba(255,193,7,0.08)' },
  calm: { accent: '#1E5FAD', glow: 'rgba(30,95,173,0.10)' },
}

export default function WeeklySummaryCard() {
  const summary = useWeeklySummary()
  const [open, setOpen] = useState(false)
  const { accent, glow } = LEVEL_STYLES[summary.level] || LEVEL_STYLES.calm

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ador-glass ador-grain ador-card-hover relative w-full overflow-hidden rounded-[24px] px-9 py-8 text-left"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full"
          style={{ background: `radial-gradient(circle, ${glow}, transparent 70%)` }}
        />
        <div className="relative flex items-center gap-2">
          <span
            className="font-medium text-[#666666]"
            style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Resumen Semanal
          </span>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent, animation: 'ador-pulse 2s ease-in-out infinite' }} />
        </div>
        <p className="relative mt-4 max-w-[720px] text-[24px] font-medium leading-snug text-[#F5F5F5]">{summary.tldr}</p>
        <span className="relative mt-4 inline-block text-[13px] font-medium" style={{ color: accent }}>
          Ver resumen completo →
        </span>
      </button>

      <AnimatePresence>{open && <WeeklySummaryPanel summary={summary} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}
