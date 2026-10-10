import { useEffect, useState } from 'react'
import { saveClientServices } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { useClientServices } from '../../hooks/useClientServices'
import { MODALITIES } from '../../lib/clientStages'

// The kinds of service ADOR sells ("Intervención", "Suscripción mensual"…).
// They are what you pick when opening a new service for a client that came
// back (Clientes → Completados → Nuevo servicio) and what the ficha shows.
// Ids are fixed when a type is created; renaming only changes its label, so
// existing clients keep pointing at the right type.
const slug = (label) =>
  label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'servicio'

export default function ServicesTab({ user }) {
  const showToast = useToast()
  const current = useClientServices()
  const [rows, setRows] = useState(null)
  const [saving, setSaving] = useState(false)

  const norm = (list) => list.map((s) => ({ id: s.id, label: s.label, modality: s.modality || 'proyecto' }))
  useEffect(() => {
    if (rows === null) setRows(norm(current))
  }, [current, rows])

  if (!rows) return null
  const dirty = JSON.stringify(rows.map(({ isNew, ...r }) => r)) !== JSON.stringify(norm(current))
  const actorName = user?.displayName || user?.email?.split('@')[0] || 'Admin'

  const update = (i, label) => setRows((r) => r.map((s, idx) => (idx === i ? { ...s, label } : s)))
  const setModality = (i, modality) => setRows((r) => r.map((s, idx) => (idx === i ? { ...s, modality } : s)))
  const add = () =>
    setRows((r) => {
      let id = 'servicio'
      let n = 2
      const taken = new Set(r.map((s) => s.id))
      while (taken.has(id)) id = `servicio_${n++}`
      return [...r, { id, label: '', modality: 'proyecto', isNew: true }]
    })
  const remove = (i) => setRows((r) => r.filter((_, idx) => idx !== i))

  const save = async () => {
    const cleaned = rows.map((s) => ({ ...s, label: s.label.trim() })).filter((s) => s.label)
    if (cleaned.length === 0) {
      showToast('Deja al menos un tipo de servicio.')
      return
    }
    // New types get their id from the label (once, here); existing keep theirs.
    const taken = new Set(cleaned.filter((s) => !s.isNew).map((s) => s.id))
    const finalRows = cleaned.map((s) => {
      if (!s.isNew) return { id: s.id, label: s.label, modality: s.modality || 'proyecto' }
      let id = slug(s.label)
      let n = 2
      while (taken.has(id)) id = `${slug(s.label)}_${n++}`
      taken.add(id)
      return { id, label: s.label, modality: s.modality || 'proyecto' }
    })
    setSaving(true)
    try {
      await withTimeout(saveClientServices(finalRows, actorName))
      setRows(null)
      showToast('Servicios guardados.')
    } catch (e) {
      showToast(`No se pudo guardar: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-[#888888]">
        Los tipos de servicio que ofrece ADOR y su <strong className="font-medium text-[#DDDDDD]">modalidad de cobro</strong>: <em>Proyecto fijo</em> (2 pagos, 60 % y 40 %), <em>Contrato</em> (periodo base con opciones de renovación), <em>Suscripción</em> (cobro que se repite) o <em>Pago único</em>. Se eligen al definir el servicio de un cliente. Puedes renombrarlos, cambiar su modalidad, añadir o quitar; los clientes que ya usan un tipo lo conservan.
      </p>
      <div className="ador-glass ador-grain divide-y divide-white/[0.06] rounded-2xl">
        {rows.map((s, i) => (
          <div key={s.id + i} className="flex items-center gap-3 px-5 py-3">
            <input
              value={s.label}
              onChange={(e) => update(i, e.target.value)}
              placeholder="Nombre del servicio"
              autoFocus={s.isNew}
              className="min-w-0 flex-1 rounded-[10px] border border-[#262626] bg-[#0A0A0A] px-3.5 py-2 text-[14px] text-[#F5F5F5] outline-none placeholder:text-[#4A4A4A] focus:border-[#F5F5F5]/60"
            />
            <select
              value={s.modality}
              onChange={(e) => setModality(i, e.target.value)}
              aria-label="Modalidad de cobro"
              title={MODALITIES.find((m) => m.id === s.modality)?.hint}
              className="flex-shrink-0 rounded-[10px] border border-[#262626] bg-[#0A0A0A] px-3 py-2 text-[13px] text-[#C8C8C8] outline-none focus:border-[#F5F5F5]/60"
            >
              {MODALITIES.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={rows.length === 1}
              aria-label={`Quitar ${s.label || 'servicio'}`}
              className="rounded-full px-3 py-1.5 text-[12px] text-[#767676] transition-colors hover:text-[#EF5350] disabled:opacity-30"
            >
              Quitar
            </button>
          </div>
        ))}
        <div className="px-5 py-3">
          <button type="button" onClick={add} className="text-[13px] font-medium text-[#F4EEE2] hover:underline">
            + Añadir tipo de servicio
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-[#888888]">{dirty ? 'Cambios sin guardar' : 'Todo guardado'}</span>
        <button type="button" onClick={save} disabled={!dirty || saving} className="ador-btn-primary rounded-full px-5 py-2 text-[13px] font-medium disabled:opacity-40">
          {saving ? 'Guardando…' : 'Guardar servicios'}
        </button>
      </div>
    </div>
  )
}
