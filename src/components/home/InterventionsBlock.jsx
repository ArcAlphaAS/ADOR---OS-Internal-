import { motion } from 'framer-motion'

function InterventionRow({ client, week, totalWeeks, progress }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-medium text-[#F5F5F5]">{client}</span>
        <span className="text-[12px] text-[#888888]">
          Semana {week} de {totalWeeks}
        </span>
      </div>
      <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full bg-[#1E5FAD]"
        />
      </div>
    </div>
  )
}

export default function InterventionsBlock({ interventions = [] }) {
  return (
    <div className="ador-glass ador-grain ador-card-hover rounded-[20px] px-7 py-6">
      <div className="flex items-center gap-2">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Intervenciones Activas
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#1E5FAD]"
          style={{ animation: 'ador-pulse 2s ease-in-out infinite' }}
        />
      </div>

      {interventions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="ador-skeleton h-[2px] w-2/3 rounded-full" />
          <p className="text-[14px] font-light text-[#444444]">Sin intervenciones activas</p>
        </div>
      ) : (
        <div className="mt-3 divide-y divide-white/[0.06]">
          {interventions.map((item, i) => (
            <InterventionRow key={i} {...item} />
          ))}
        </div>
      )}
    </div>
  )
}
