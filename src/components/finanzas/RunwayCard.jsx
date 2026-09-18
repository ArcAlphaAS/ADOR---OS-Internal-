import { useState } from 'react'
import { currencyPEN } from '../../lib/clientStages'
import { setCashBalance } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { EditIcon, PlusIcon } from '../icons'

function ProjectionRow({ label, value, bold }) {
  const negative = value < 0
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'text-[12.5px] font-medium text-[#888888]' : 'text-[12px] text-[#888888]'}>{label}</span>
      <span className={bold ? 'text-[16px] font-semibold' : 'text-[14px] font-medium'} style={{ color: negative ? '#E05252' : '#F5F5F5' }}>
        {currencyPEN.format(value)}
      </span>
    </div>
  )
}

// A small stacked bar next to the numbers, matching the reference image —
// three segments stacked bottom-to-top: caja actual (blue, the base),
// what the next 30 days add (green, can be a thin sliver or absent if the
// 30-day delta is flat/negative), and what days 31-90 add on top of that
// (a lighter blue). Heights are proportional to real projected values, not
// decorative — clamped at 0 so a negative delta just doesn't grow the bar
// rather than rendering a broken negative-height segment.
function ProjectionBar({ cashBalance, projectedIn30, projectedIn90 }) {
  const total = Math.max(projectedIn90, cashBalance, 1)
  const baseH = Math.max(0, (cashBalance / total) * 100)
  const midH = Math.max(0, ((projectedIn30 - cashBalance) / total) * 100)
  const topH = Math.max(0, ((projectedIn90 - projectedIn30) / total) * 100)

  return (
    <div className="flex h-[110px] w-6 flex-shrink-0 flex-col-reverse overflow-hidden rounded-md bg-white/[0.04]">
      <div style={{ height: `${baseH}%`, background: '#1E5FAD' }} />
      <div style={{ height: `${midH}%`, background: '#4CAF50' }} />
      <div style={{ height: `${topH}%`, background: '#3A8DE8' }} />
    </div>
  )
}

// The one forward-looking card in Finanzas — everything else on this
// dashboard is a this-month/this-quarter actual. There's no bank
// integration, so `cashBalance` is the one figure a founder has to type in
// by hand; the projection combines it with the same burn rate and pending
// SP payments the rest of the dashboard already computes, not a separate
// manually-entered forecast.
export default function RunwayCard({ cashBalance, monthlyBurnRate, projectedIn30, projectedIn90, inflowIn30, inflowIn90 }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cashBalance || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const showToast = useToast()

  const openEdit = () => {
    setDraft(cashBalance || '')
    setError('')
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(cashBalance || '')
    setError('')
    setEditing(false)
  }

  const save = async () => {
    const amount = Number(draft)
    if (draft.toString().trim() === '' || Number.isNaN(amount) || amount < 0) {
      setError('Ingresa un monto válido.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await withTimeout(setCashBalance(amount))
      setEditing(false)
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
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
        {!editing && cashBalance > 0 && (
          <button
            type="button"
            onClick={openEdit}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            <EditIcon size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1A1A1A] px-2.5 py-1.5 focus-within:border-white/[0.2]">
              <span className="text-[14px] text-[#666666]">S/</span>
              <input
                type="number"
                min="0"
                autoFocus
                value={draft}
                disabled={saving}
                onChange={(e) => {
                  setDraft(e.target.value)
                  if (error) setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    cancelEdit()
                  }
                }}
                placeholder="Caja actual en banco"
                className="w-full bg-transparent text-[16px] text-[#F5F5F5] outline-none disabled:opacity-50"
              />
            </div>
            <button type="button" onClick={save} disabled={saving} className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-60">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={cancelEdit} disabled={saving} className="rounded-lg px-2 py-1.5 text-[12px] text-[#888888] transition-colors duration-150 hover:text-[#F5F5F5] disabled:opacity-50">
              Cancelar
            </button>
          </div>
          {error && <p className="text-[11.5px] text-[#EF5350]">{error}</p>}
          <p className="text-[11px] text-[#444444]">Esc para cerrar sin guardar.</p>
        </div>
      ) : !cashBalance ? (
        <button
          type="button"
          onClick={openEdit}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.14] py-3 text-[13px] text-[#666666] transition-colors duration-150 hover:border-white/[0.24] hover:text-[#888888]"
        >
          <PlusIcon size={13} /> Registrar caja disponible
        </button>
      ) : (
        <div className="mt-4 flex items-stretch gap-4">
          <ProjectionBar cashBalance={cashBalance} projectedIn30={projectedIn30} projectedIn90={projectedIn90} />
          <div className="flex flex-1 flex-col justify-between gap-2.5">
            <ProjectionRow label="Caja actual" value={cashBalance} />
            <ProjectionRow label="Próximos 30 días" value={inflowIn30} />
            <ProjectionRow label="Próximos 90 días" value={inflowIn90} />
            <div className="border-t border-white/[0.06] pt-2.5">
              <ProjectionRow label="Caja proyectada" value={projectedIn90} bold />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
