import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

function ResultGroup({ label, items, onSelect }) {
  if (items.length === 0) return null
  return (
    <div>
      <span
        className="block px-4 pb-1 pt-3 font-medium text-[#444444]"
        style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        {label}
      </span>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(item.id)}
          className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left transition-colors duration-150 hover:bg-white/[0.06]"
        >
          <span className="min-w-0 flex-1 truncate text-[13px] text-[#F5F5F5]">{item.title}</span>
          <span className="flex-shrink-0 text-[11px] text-[#666666]">{item.code || item.subtitle}</span>
        </button>
      ))}
    </div>
  )
}

// Same portal + split-wrapper pattern as NotificationCenter.jsx: the
// transform-animated wrapper and the ador-glass surface are two separate
// elements, otherwise Chromium drops the backdrop blur (see that file for
// the full explanation). onMouseDown/preventDefault on each result button
// stops the input's onBlur from closing this dropdown before the click's
// own onClick has a chance to fire — the same race flagged in CLAUDE.md's
// Clientes testing notes.
export default function SearchResults({ results, anchorRect, onSelectClient, onSelectTask, onSelectDecision }) {
  if (!anchorRect) return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="z-50"
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 8,
        left: anchorRect.left,
        width: Math.max(anchorRect.width, 260),
      }}
    >
      <div className="ador-glass ador-grain max-h-[360px] overflow-y-auto rounded-2xl py-2">
        {!results.hasResults ? (
          <p className="px-4 py-6 text-center text-[13px] font-light text-[#444444]">Sin resultados</p>
        ) : (
          <>
            <ResultGroup label="Clientes" items={results.clients} onSelect={onSelectClient} />
            <ResultGroup label="Tareas" items={results.tasks} onSelect={onSelectTask} />
            <ResultGroup label="Decisiones" items={results.decisions} onSelect={onSelectDecision} />
          </>
        )}
      </div>
    </motion.div>,
    document.body
  )
}
