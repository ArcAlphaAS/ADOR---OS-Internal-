import { useState } from 'react'
import { motion } from 'framer-motion'
import { currencyPEN } from '../../lib/clientStages'
import { quarterLabel } from '../../lib/finance'
import { setQuarterlyTarget } from '../../lib/firestore'
import { EditIcon } from '../icons'

export default function QuarterlyGoalCard({ quarterKey, target, recaudado }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(target || '')

  const pct = target ? Math.min(100, Math.round((recaudado / target) * 100)) : 0

  const save = () => {
    const amount = Number(draft)
    if (amount > 0) setQuarterlyTarget(amount)
    setEditing(false)
  }

  return (
    <div className="ador-glass ador-grain rounded-[16px] px-6 py-5">
      <div className="flex items-center justify-between">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Meta del Trimestre — {quarterLabel(quarterKey)}
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(target || '')
              setEditing(true)
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            <EditIcon size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Monto objetivo"
            className="w-full rounded-lg border border-white/[0.1] bg-[#1A1A1A] px-2.5 py-1.5 text-[16px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
          />
          <button type="button" onClick={save} className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12px] font-medium">
            Guardar
          </button>
        </div>
      ) : !target ? (
        <p className="mt-3 text-[13px] font-light text-[#444444]">Sin meta definida — haz clic en el lápiz</p>
      ) : (
        <>
          <span className="mt-1 block font-semibold text-[24px] text-[#F5F5F5]">{currencyPEN.format(target)}</span>
          <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#1E5FAD' }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#F5F5F5]">{pct}%</span>
            <span className="text-[12px] text-[#888888]">
              {currencyPEN.format(recaudado)} de {currencyPEN.format(target)} recaudado
            </span>
          </div>
        </>
      )}
    </div>
  )
}
