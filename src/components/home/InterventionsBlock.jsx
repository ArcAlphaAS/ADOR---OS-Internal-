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
        <p className="mt-1.5 text-[11.5px] text-[#8A8A8A]">Semana {week} de {totalWeeks}</p>
      </div>
    </div>
  )
}

export default function InterventionsBlock({ interventions = [], loading = false }) {
  return (
    <div className={`ador-glass ador-quiet ador-grain ador-card-hover h-full ${CARD_RADIUS} ${CARD_PAD}`}>
      <CardHeader label="Intervenciones activas" count={interventions.length > 0 ? interventions.length : null} />

      {loading ? (
        <div className="mt-4 space-y-5" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3.5">
              <span className="ador-skeleton h-10 w-10 flex-shrink-0 rounded-full" />
              <div className="flex-1">
                <div className="ador-skeleton h-3 w-1/2 rounded-full" />
                <div className="ador-skeleton mt-3 h-[5px] w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : interventions.length === 0 ? (
        <div className="flex items-center gap-5 py-5">
          <div className="flex-shrink-0"><ParticleLogo size={84} /></div>
          <div className="min-w-0">
            <p className="text-[15px] font-light text-[#E4E4E4]">Aún no hay intervenciones activas</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-[#8A8A8A]">Aparecen aquí solas cuando un SPC pasa a Intervención Activa en Clientes.</p>
          </div>
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
