import { motion } from 'framer-motion'
import { currencyPEN } from '../../lib/clientStages'
import { confidenceColor } from '../../lib/objetivos'

function formatValue(value, unit) {
  if (unit === 'S/') return currencyPEN.format(value)
  return `${Math.round(value)}${unit ? ` ${unit}` : ''}`
}

// The single macro indicator that defines success this quarter — any
// numeric objetivo can be promoted here via the star toggle on its card
// (ObjetivoCard.jsx). Deliberately the only thing on this page rendered at
// hero scale, echoing Home's GreetingBlock / Finanzas' hero numbers, so the
// board has one unmistakable focal point instead of N equally-weighted cards.
//
// Always rendered as its own header section — never folded into the
// Objetivos grid below it — even before one is chosen, so "where's the
// North Star" has a real, always-visible answer instead of the header
// silently disappearing when nothing is pinned yet.
export default function NorthStarHero({ objetivo }) {
  if (!objetivo) {
    return (
      <div className="ador-glass ador-grain flex items-center gap-3 rounded-[24px] px-8 py-6">
        <span className="text-[16px] text-[#444444]">★</span>
        <div>
          <p className="text-[13px] font-medium text-[#888888]">Sin Métrica Norte definida</p>
          <p className="text-[12px] font-light text-[#444444]">
            Marca cualquier meta numérica con la estrella para que aparezca aquí como el indicador principal del trimestre.
          </p>
        </div>
      </div>
    )
  }

  const pct = objetivo.targetValue ? Math.min(100, Math.round((objetivo.currentValue / objetivo.targetValue) * 100)) : 0

  return (
    <div
      className="ador-glass ador-grain relative overflow-hidden rounded-[24px] px-8 py-7"
      style={{
        backgroundImage: 'radial-gradient(120% 160% at 0% 0%, rgba(30,95,173,0.16) 0%, transparent 60%)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="font-medium text-[#1E5FAD]"
          style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          ★ Métrica Norte
        </span>
        {objetivo.confidence && (
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: confidenceColor(objetivo.confidence) }} />
        )}
      </div>
      <p className="mt-1 text-[15px] font-medium text-[#F5F5F5]">{objetivo.title}</p>

      <div className="mt-4 flex items-end gap-3">
        <span className="font-mono text-[40px] font-semibold leading-none text-[#F5F5F5]">
          {formatValue(objetivo.currentValue, objetivo.unit)}
        </span>
        <span className="pb-1 text-[14px] text-[#888888]">de {formatValue(objetivo.targetValue, objetivo.unit)}</span>
      </div>

      <div className="mt-4 h-[4px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: '#1E5FAD' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
