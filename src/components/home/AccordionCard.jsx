import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { haptic } from '../../lib/haptics'

// Tarjeta plegable del teléfono: cerrada es una fila compacta (título, una línea, flecha);
// abierta se despliega con resorte y toma un velo de luz cálida en la esquina, como las
// tarjetas desplegables de iOS. Solo una suele estar abierta, así la pantalla respira.
export default function AccordionCard({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`ador-acc overflow-hidden rounded-[28px] transition-colors duration-300 ${open ? 'ador-glow ador-acc-open' : 'bg-[#1C1C1E]'}`}>
      <button type="button" aria-expanded={open} onClick={() => { haptic(); setOpen((v) => !v) }} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold text-[#F5F5F5]">{title}</span>
          {subtitle && <span className="block truncate text-[13.5px] text-[#8E8E93]">{subtitle}</span>}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[#CFCFCF]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 34 }} className="overflow-hidden">
            <div className="ador-acc-body pb-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
