import { motion } from 'framer-motion'
import { CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon } from '../icons'

function formatDate(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// Collapsible so it doesn't permanently eat 280px of width when Workspace's
// main content already needs the room — collapses to a slim 56px rail with
// just an icon + count, expandable on demand. Preference persists per user
// the same way the Lista/Kanban/Timeline view choice does (workspaceView).
export default function DecisionesPanel({ decisions, onRegister, collapsed, onToggleCollapse }) {
  const latest = [...decisions]
    .filter((d) => d.decidedAt?.toDate)
    .sort((a, b) => b.decidedAt.toDate() - a.decidedAt.toDate())
    .slice(0, 3)

  if (collapsed) {
    return (
      <div className="flex h-full w-14 flex-shrink-0 flex-col items-center gap-4 border-l border-white/[0.06] py-6">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Mostrar Decisiones"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
        >
          <ArrowLeftIcon size={14} />
        </button>
        <div className="flex flex-col items-center gap-1.5">
          <CheckCircleIcon size={16} style={{ color: '#B8860B' }} />
          {decisions.length > 0 && (
            <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-[#888888]">
              {decisions.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRegister}
          title="Registrar Decisión"
          className="mt-auto flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-150 hover:bg-[#1E5FAD]/10"
          style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
        >
          +
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-full w-[280px] flex-shrink-0 flex-col border-l border-white/[0.06] px-5 py-6"
    >
      <div className="flex items-center justify-between">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Decisiones
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Achicar"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
        >
          <ArrowRightIcon size={12} />
        </button>
      </div>

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
    </motion.div>
  )
}
