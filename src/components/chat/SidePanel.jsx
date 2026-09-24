import { CloseIcon } from '../icons'

// The one frame every right-hand panel in Comunicación uses — Perfil,
// Detalles, Hilo — so they share width, padding, header and close button
// instead of each having its own (they had drifted to 280/290/340 px with
// different paddings). Header stays put; the body scrolls. The thread
// panel passes its own body layout (its composer sits at the bottom).
// On phones it covers the conversation full-screen (above the bottom bar's
// space) instead of squeezing in beside it.
export default function SidePanel({ title, subtitle, onClose, children, bodyClassName }) {
  return (
    <aside className="fixed inset-0 z-[46] flex flex-col bg-[#0A0A0A] p-3 pb-[calc(72px+env(safe-area-inset-bottom))] md:static md:z-auto md:w-[320px] md:flex-shrink-0 md:bg-transparent md:p-0">
      <div className="ador-glass ador-grain flex min-h-0 flex-1 flex-col rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 pt-4 pb-3.5">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[#F5F5F5]">{title}</p>
            {subtitle && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#8A8A8A]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} title="Cerrar" className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#8A8A8A] hover:bg-white/[0.06] hover:text-[#F5F5F5]">
            <CloseIcon size={12} />
          </button>
        </div>
        <div className={bodyClassName || 'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4'}>{children}</div>
      </div>
    </aside>
  )
}
