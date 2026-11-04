import { motion } from 'framer-motion'
import ParticleLogo from '../ParticleLogo'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

function InterventionRow({ client, week, totalWeeks, progress }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5 first:pt-1 last:pb-1">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[14px] font-medium text-[#F5F5F5]">
        {(client || '?').charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[14.5px] text-[#F5F5F5]">{client}</span>
          <span className="flex-shrink-0 text-[12px] tabular-nums text-[#8A8A8A]">{progress}%</span>
        </div>
        <div className="mt-2 h-[5px] w-full overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="h-full rounded-full bg-[#F4EEE2]"
          />
        </div>
        <p className="mt-1.5 text-[11.5px] text-[#767676]">Semana {week} de {totalWeeks}</p>
      </div>
    </div>
  )
}

export default function InterventionsBlock({ interventions = [] }) {
  return (
    <div className={`ador-glass ador-quiet ador-grain ador-card-hover h-full ${CARD_RADIUS} ${CARD_PAD}`}>
      <CardHeader label="Intervenciones activas" count={interventions.length > 0 ? interventions.length : null} />

      {interventions.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-6">
          <ParticleLogo size={96} />
          <p className="mt-2 text-[14px] text-[#D4D4D4]">Aún no hay intervenciones activas</p>
          <p className="text-[12.5px] text-[#767676]">Aparecen aquí cuando un SPC pasa a Intervención.</p>
        </div>
      ) : (
        <div className="ador-stagger mt-3 divide-y divide-white/[0.06]">
          {interventions.map((item, i) => (
            <InterventionRow key={i} {...item} />
          ))}
        </div>
      )}
    </div>
  )
}
