import { motion } from 'framer-motion'
import ParticleLogo from '../ParticleLogo'

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
          className="h-full rounded-full bg-[#F4EEE2]"
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
          className="font-medium text-[#7A7A7A]"
          style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Intervenciones Activas
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#F4EEE2]"
          style={{ animation: 'ador-pulse 2s ease-in-out infinite' }}
        />
      </div>

      {interventions.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-6">
          <ParticleLogo size={96} />
          <p className="mt-2 text-[14px] text-[#D4D4D4]">Aún no hay intervenciones activas</p>
          <p className="text-[12.5px] text-[#767676]">Aparecen aquí cuando un SPC pasa a Intervención.</p>
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
