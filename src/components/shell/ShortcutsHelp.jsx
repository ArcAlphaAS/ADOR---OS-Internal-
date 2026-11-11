import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRING } from '../../lib/motion'
import { useEscape } from '../../hooks/useEscape'

// Ventana con todos los atajos de teclado (⌘/ o ?).
const GROUPS = [
  { title: 'General', rows: [['⌘K', 'Paleta de comandos'], ['⌘/', 'Ver estos atajos'], ['⌘Z', 'Deshacer la última acción'], ['Esc', 'Cerrar paneles y ventanas']] },
  { title: 'Ir a', rows: [['⌥1', 'Inicio'], ['⌥2', 'Workspace'], ['⌥3', 'Objetivos'], ['⌥4', 'Clientes'], ['⌥5', 'Finanzas'], ['⌥6', 'Comunicación'], ['⌥7', 'Calendario'], ['⌥8', 'Conocimiento'], ['⌥9', 'News']] },
]

export default function ShortcutsHelp({ open, onClose }) {
  return createPortal(
    <AnimatePresence>{open && <Panel onClose={onClose} />}</AnimatePresence>,
    document.body
  )
}

function Panel({ onClose }) {
  useEscape(onClose)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[6px]" onMouseDown={onClose}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.985 }} transition={SPRING} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-[560px]" role="dialog" aria-label="Atajos de teclado">
        <div className="ador-modal-surface rounded-[24px] p-7">
          <h2 className="text-[19px] font-semibold text-[#F5F5F5]">Atajos de teclado</h2>
          <div className="mt-5 grid grid-cols-1 gap-7 sm:grid-cols-2">
            {GROUPS.map((g) => (
              <section key={g.title}>
                <h3 className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#8A8A8A]">{g.title}</h3>
                <ul className="flex flex-col gap-1.5">
                  {g.rows.map(([k, label]) => (
                    <li key={k} className="flex items-center justify-between gap-3 text-[13.5px] text-[#E4E4E4]">
                      <span>{label}</span>
                      <kbd className="rounded-md bg-white/[0.09] px-2 py-0.5 text-[12px] text-[#CFCFCF]">{k}</kbd>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="mt-6 text-[12px] text-[#8A8A8A]">En Windows usa Ctrl en lugar de ⌘ y Alt en lugar de ⌥.</p>
        </div>
      </motion.div>
    </motion.div>
  )
}
