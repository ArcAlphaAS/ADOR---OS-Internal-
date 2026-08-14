function formatDate(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function DecisionesPanel({ decisions, onRegister }) {
  const latest = [...decisions]
    .filter((d) => d.decidedAt?.toDate)
    .sort((a, b) => b.decidedAt.toDate() - a.decidedAt.toDate())
    .slice(0, 3)

  return (
    <div className="flex h-full w-[280px] flex-shrink-0 flex-col border-l border-white/[0.06] px-5 py-6">
      <span
        className="font-medium text-[#444444]"
        style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        Decisiones
      </span>

      {latest.length === 0 ? (
        <p className="mt-8 text-center text-[13px] font-light text-[#444444]">Sin decisiones registradas</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-white/[0.06]">
          {latest.map((d) => (
            <div key={d.id} className="flex flex-col gap-1.5 py-3.5 first:pt-0">
              <p className="line-clamp-2 text-[13px] text-[#F5F5F5]">{d.title}</p>
              {d.linkedName && <span className="text-[11px] text-[#1E5FAD]">{d.linkedName}</span>}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#444444]">{formatDate(d.decidedAt)}</span>
                <span className="text-[11px] text-[#444444]">{d.registeredBy}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onRegister}
        className="mt-6 w-full rounded-[10px] border py-2.5 text-[13px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10"
        style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
      >
        + Registrar Decisión
      </button>
    </div>
  )
}
