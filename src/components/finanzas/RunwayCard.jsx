import { useState } from 'react'
import { currencyPEN } from '../../lib/clientStages'
import { setCashBalance } from '../../lib/firestore'
import { EditIcon } from '../icons'

function ProjectionRow({ label, value }) {
  const negative = value < 0
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[#888888]">{label}</span>
      <span className="text-[14px] font-medium" style={{ color: negative ? '#E05252' : '#F5F5F5' }}>
        {currencyPEN.format(value)}
      </span>
    </div>
  )
}

// The one forward-looking card in Finanzas — everything else on this
// dashboard is a this-month/this-quarter actual. There's no bank
// integration, so `cashBalance` is the one figure a founder has to type in
// by hand; the projection combines it with the same burn rate and pending
// SP payments the rest of the dashboard already computes, not a separate
// manually-entered forecast.
export default function RunwayCard({ cashBalance, monthlyBurnRate, projectedIn30, projectedIn60 }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cashBalance || '')

  const save = () => {
    const amount = Number(draft)
    if (amount >= 0) setCashBalance(amount)
    setEditing(false)
  }

  return (
    <div className="ador-glass ador-grain rounded-[16px] px-6 py-5">
      <div className="flex items-center justify-between">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Proyección de Caja
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(cashBalance || '')
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
            placeholder="Caja actual en banco"
            className="w-full rounded-lg border border-white/[0.1] bg-[#1A1A1A] px-2.5 py-1.5 text-[16px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
          />
          <button type="button" onClick={save} className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12px] font-medium">
            Guardar
          </button>
        </div>
      ) : !cashBalance ? (
        <p className="mt-3 text-[13px] font-light text-[#444444]">Sin caja registrada — haz clic en el lápiz</p>
      ) : (
        <>
          <span className="mt-1 block font-semibold text-[24px] text-[#F5F5F5]">{currencyPEN.format(cashBalance)}</span>
          <p className="mt-0.5 text-[11px] text-[#444444]">Caja actual · quema promedio {currencyPEN.format(monthlyBurnRate)}/mes</p>
          <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-3">
            <ProjectionRow label="En 30 días" value={projectedIn30} />
            <ProjectionRow label="En 60 días" value={projectedIn60} />
          </div>
        </>
      )}
    </div>
  )
}
