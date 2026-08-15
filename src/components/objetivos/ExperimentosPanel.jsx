import { useEffect, useState } from 'react'
import { EXPERIMENT_STATUSES, experimentStatusColor } from '../../lib/objetivos'
import { subscribeExperimentos, createExperimento, updateExperimento, deleteExperimento } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { CloseIcon } from '../icons'

function ExperimentRow({ experimento, actorName }) {
  const [editingResult, setEditingResult] = useState(false)
  const [result, setResult] = useState(experimento.result || '')
  const showToast = useToast()

  const setStatus = (status) => {
    withTimeout(updateExperimento(experimento.id, { status })).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  }

  const saveResult = () => {
    withTimeout(updateExperimento(experimento.id, { result: result.trim() })).catch((error) =>
      showToast(`No se pudo guardar: ${error.message}`)
    )
    setEditingResult(false)
  }

  const remove = () => {
    withTimeout(deleteExperimento(experimento.id)).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
  }

  const status = EXPERIMENT_STATUSES.find((s) => s.id === experimento.status) || EXPERIMENT_STATUSES[0]

  return (
    <div className="flex flex-col gap-1.5 py-3 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] text-[#F5F5F5]">{experimento.hypothesis}</p>
        <button
          type="button"
          onClick={remove}
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[#444444] hover:bg-white/[0.08] hover:text-[#F5F5F5]"
        >
          <CloseIcon size={10} />
        </button>
      </div>

      {editingResult ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type="text"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveResult()}
            onBlur={saveResult}
            placeholder="¿Qué pasó?"
            className="w-full rounded-lg border border-white/[0.1] bg-[#1A1A1A] px-2 py-1 text-[12px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
          />
        </div>
      ) : (
        experimento.result && <p className="text-[12px] text-[#888888]">→ {experimento.result}</p>
      )}

      <div className="flex items-center gap-1.5">
        {EXPERIMENT_STATUSES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStatus(s.id)}
            className="rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors duration-150"
            style={{
              background: status.id === s.id ? `${s.color}22` : 'transparent',
              color: status.id === s.id ? s.color : '#444444',
            }}
          >
            {s.label}
          </button>
        ))}
        {!experimento.result && !editingResult && (
          <button type="button" onClick={() => setEditingResult(true)} className="ml-auto text-[11px] text-[#1E5FAD] hover:underline">
            + Resultado
          </button>
        )}
      </div>
    </div>
  )
}

function NewExperimentRow({ objetivos, actorName, onDone }) {
  const [hypothesis, setHypothesis] = useState('')
  const [objetivoId, setObjetivoId] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const save = async () => {
    if (!hypothesis.trim() || saving) return
    setSaving(true)
    try {
      await withTimeout(createExperimento({ hypothesis: hypothesis.trim(), objetivoId: objetivoId || null }, actorName))
      onDone()
    } catch (error) {
      showToast(`No se pudo registrar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] p-3">
      <textarea
        autoFocus
        value={hypothesis}
        onChange={(e) => setHypothesis(e.target.value)}
        rows={2}
        placeholder="Hipótesis: si hacemos X, esperamos Y..."
        className="w-full resize-none rounded-lg border border-white/[0.08] bg-[#1A1A1A] px-2.5 py-1.5 text-[12px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
      />
      {objetivos.length > 0 && (
        <select
          value={objetivoId}
          onChange={(e) => setObjetivoId(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#1A1A1A] px-2.5 py-1.5 text-[12px] text-[#F5F5F5] outline-none"
        >
          <option value="">Sin vincular a un Objetivo</option>
          {objetivos.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="text-[12px] text-[#888888] hover:text-[#F5F5F5]">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!hypothesis.trim() || saving}
          onClick={save}
          className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-40"
        >
          {saving ? 'Guardando…' : 'Registrar'}
        </button>
      </div>
    </div>
  )
}

// The Growth/Validation Log from the spec — deliberately its own concept,
// separate from Objetivos' progress check-ins: a check-in tracks "how is
// this goal trending," an experiment records "did this specific bet pay
// off," independent of whether it's linked to a KR. Lateral panel, same
// slot pattern as IniciativasPanel/Workspace's DecisionesPanel.
export default function ExperimentosPanel({ objetivos, actorName }) {
  const [experimentos, setExperimentos] = useState([])
  const [adding, setAdding] = useState(false)

  useEffect(() => subscribeExperimentos(setExperimentos), [])

  const sorted = [...experimentos].sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))

  return (
    <div className="ador-glass ador-grain rounded-2xl px-5 py-5">
      <div className="flex items-center justify-between">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Experimentos
        </span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: experimentStatusColor('pendiente'), animation: 'ador-pulse 2.4s ease-in-out infinite' }} />
      </div>

      {adding && <div className="mt-3"><NewExperimentRow objetivos={objetivos} actorName={actorName} onDone={() => setAdding(false)} /></div>}

      {sorted.length === 0 && !adding ? (
        <p className="mt-4 text-[13px] font-light text-[#444444]">Sin experimentos registrados — prueba, mide, aprende.</p>
      ) : (
        <div className="mt-1 flex flex-col divide-y divide-white/[0.06]">
          {sorted.map((e) => (
            <ExperimentRow key={e.id} experimento={e} actorName={actorName} />
          ))}
        </div>
      )}

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 w-full rounded-[10px] border py-2 text-[12px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10"
          style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
        >
          + Registrar experimento
        </button>
      )}
    </div>
  )
}
