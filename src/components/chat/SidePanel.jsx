import { motion } from 'framer-motion'
import { CloseIcon } from '../icons'
import { swipeToClose } from '../../lib/motion'

// The one frame every right-hand panel in Comunicación uses — Perfil,
// Detalles, Hilo — so they share width, padding, header and close button.
// Escritorio: una columna de 320 px junto al chat, con su cabecera y su botón de cerrar.
// Teléfono: una pantalla completa como las de iOS — barra superior con "‹ Atrás" a la
// izquierda y el título al centro (respetando la zona del reloj y la isla), contenido
// debajo y deslizar desde el borde izquierdo para volver. Antes era una tarjeta con la
// X pegada arriba, tapada por la hora, sin forma clara de salir.
export default function SidePanel({ title, subtitle, onClose, children, bodyClassName }) {
  const phone = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches
  return (
    <motion.aside
      {...(phone ? swipeToClose('x', onClose) : {})}
      className="ador-kb-fit fixed inset-0 z-[46] flex flex-col bg-[#000000] pb-[env(safe-area-inset-bottom)] md:static md:z-auto md:w-[320px] md:flex-shrink-0 md:bg-transparent md:p-0 md:pb-0"
    >
      {/* Teléfono: barra superior estilo iOS */}
      <div className="relative z-10 flex flex-shrink-0 items-center px-2 pb-1 pt-[calc(env(safe-area-inset-top)+4px)] md:hidden">
        <button type="button" onClick={onClose} aria-label="Atrás" className="flex min-h-[44px] items-center gap-0.5 rounded-full pl-1 pr-3 text-[17px] text-[#F4EEE2] active:opacity-60">
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M10 2 2 10l8 8" /></svg>
          Atrás
        </button>
        <p className="pointer-events-none absolute inset-x-0 bottom-0 top-[env(safe-area-inset-top)] flex items-center justify-center truncate px-24 text-[16px] font-semibold text-[#F5F5F5]">{title}</p>
      </div>

      <div className="ador-glass ador-grain flex min-h-0 flex-1 flex-col md:rounded-2xl max-md:!border-0 max-md:!bg-transparent max-md:!shadow-none max-md:!backdrop-blur-none">
        {/* Escritorio: cabecera con cerrar */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 pt-4 pb-3.5 max-md:hidden">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[#F5F5F5]">{title}</p>
            {subtitle && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#8A8A8A]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} title="Cerrar" className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#8A8A8A] hover:bg-white/[0.06] hover:text-[#F5F5F5]">
            <CloseIcon size={12} />
          </button>
        </div>
        <div className={bodyClassName || 'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4 max-md:gap-4 max-md:px-4'}>{children}</div>
      </div>
    </motion.aside>
  )
}
