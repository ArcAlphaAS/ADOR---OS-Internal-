import { useState } from 'react'
import { motion } from 'framer-motion'
import { currencyPEN } from '../../lib/clientStages'
import { monthLabel } from '../../lib/finance'

const HEIGHT = 200
const PAD_BOTTOM = 24
const PAD_TOP = 36
const BAR_RADIUS = 6

const TOGGLES = [
  { id: 'ambos', label: 'Ambos' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos' },
]

function Bar({ x, width, value, max, color, gradientId, highlighted }) {
  const plotHeight = HEIGHT - PAD_BOTTOM - PAD_TOP
  const h = max ? (value / max) * plotHeight : 0
  const y = HEIGHT - PAD_BOTTOM - h

  return (
    <motion.rect
      x={x}
      width={width}
      rx={BAR_RADIUS}
      fill={highlighted ? `url(#${gradientId})` : color}
      initial={{ y: HEIGHT - PAD_BOTTOM, height: 0 }}
      animate={{ y, height: h }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
  )
}

export default function FinanceChart({ series }) {
  const [mode, setMode] = useState('ambos')
  const [hoverIndex, setHoverIndex] = useState(null)

  const hasData = series.some((p) => p.ingresos > 0 || p.gastos > 0)
  const max = Math.max(1, ...series.map((p) => Math.max(p.ingresos, p.gastos)))

  const showIngresos = mode === 'ambos' || mode === 'ingresos'
  const showGastos = mode === 'ambos' || mode === 'gastos'
  const paired = showIngresos && showGastos

  const colWidth = 100 / series.length
  const barWidth = paired ? colWidth * 0.28 : colWidth * 0.4

  const activeIndex = hoverIndex !== null ? hoverIndex : series.length - 1
  const active = series[activeIndex]
  const activeValue = mode === 'gastos' ? active?.gastos : active?.ingresos
  const activeCenter = activeIndex !== null ? (activeIndex + 0.5) * colWidth : 0

  return (
    <div className="ador-glass ador-grain rounded-[20px] px-7 py-6">
      <div className="flex items-center justify-between">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Flujo de Caja — últimos 6 meses
        </span>
        <div className="ador-glass flex items-center gap-1 rounded-full p-1">
          {TOGGLES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className="rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150"
              style={{
                background: mode === t.id ? '#1E5FAD' : 'transparent',
                color: mode === t.id ? '#F5F5F5' : '#888888',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <div className="ador-skeleton h-[2px] w-2/3 rounded-full" />
          <p className="text-[13px] font-light text-[#444444]">Sin movimientos registrados aún</p>
        </div>
      ) : (
        <div className="relative mt-4">
          {active && activeValue > 0 && (
            <div
              className="ador-modal-surface pointer-events-none absolute rounded-xl px-3 py-1.5"
              style={{
                left: `${activeCenter}%`,
                top: 0,
                transform: 'translate(-50%, 0)',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="text-[13px] font-semibold" style={{ color: mode === 'gastos' ? '#B8860B' : '#1E5FAD' }}>
                {currencyPEN.format(activeValue)}
              </span>
            </div>
          )}

          <svg viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" className="w-full" style={{ height: 220 }}>
            <defs>
              <linearGradient id="finanzas-bar-ingresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3A8DE8" />
                <stop offset="100%" stopColor="#1E5FAD" />
              </linearGradient>
              <linearGradient id="finanzas-bar-gastos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D9A62B" />
                <stop offset="100%" stopColor="#B8860B" />
              </linearGradient>
            </defs>

            {[0, 0.5, 1].map((f) => (
              <line
                key={f}
                x1={0}
                x2={100}
                y1={HEIGHT - PAD_BOTTOM - f * (HEIGHT - PAD_BOTTOM - PAD_TOP)}
                y2={HEIGHT - PAD_BOTTOM - f * (HEIGHT - PAD_BOTTOM - PAD_TOP)}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.3"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {series.map((p, i) => {
              const colStart = i * colWidth
              const center = colStart + colWidth / 2
              const isActive = i === activeIndex

              return (
                <g key={p.month} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                  <rect x={colStart} y={0} width={colWidth} height={HEIGHT} fill="transparent" />
                  {showIngresos && (
                    <Bar
                      x={paired ? center - barWidth - 1 : center - barWidth / 2}
                      width={barWidth}
                      value={p.ingresos}
                      max={max}
                      color="rgba(30,95,173,0.55)"
                      gradientId="finanzas-bar-ingresos"
                      highlighted={isActive && mode !== 'gastos'}
                    />
                  )}
                  {showGastos && (
                    <Bar
                      x={paired ? center + 1 : center - barWidth / 2}
                      width={barWidth}
                      value={p.gastos}
                      max={max}
                      color="rgba(184,134,11,0.4)"
                      gradientId="finanzas-bar-gastos"
                      highlighted={isActive && mode === 'gastos'}
                    />
                  )}
                </g>
              )
            })}
          </svg>

          <div className="mt-1 flex">
            {series.map((p) => (
              <span
                key={p.month}
                className="text-center text-[11px] text-[#444444]"
                style={{ width: `${colWidth}%` }}
              >
                {monthLabel(p.month)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
