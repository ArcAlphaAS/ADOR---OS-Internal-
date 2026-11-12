import { useState } from 'react'
import usePhone from '../../hooks/usePhone'
// One header for every Inicio card: small label on the left, optional count or
// status dot, and an optional quiet action on the right. Keeping this in one
// place is what makes the page read as ordered.
export const CARD_PAD = 'px-7 py-6 sm:px-8 sm:py-7'
export const CARD_RADIUS = 'rounded-[24px]'

export default function CardHeader({ label, count, dot, action }) {
  return (
    <div className="ador-ch flex items-center gap-2.5">
      <h3 className="text-[13px] font-medium tracking-[0.005em] text-[#A8A8A8]">{label}</h3>
      {count != null && <span className="text-[12px] tabular-nums text-[#8A8A8A]">{count}</span>}
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot, animation: 'ador-pulse 2s ease-in-out infinite' }} />}
      {action && <span className="ml-auto text-[12px] font-medium text-[#F4EEE2]">{action}</span>}
    </div>
  )
}

// A zone groups cards under a quiet title. Little space inside a zone, a lot
// between zones, so the page reads as three blocks (Hoy → Pulso → Equipo)
// instead of nine boxes. On phones a secondary zone can start folded.
export function Zone({ title, children, foldOnPhone = false }) {
  const phone = usePhone()
  const [open, setOpen] = useState(!foldOnPhone)
  const folded = phone && foldOnPhone && !open
  return (
    <section className="flex flex-col gap-4">
      {title && <div className="flex items-center gap-4">
        <span className="text-[14px] font-medium text-[#8A8A8A]">{title}</span>
        <span className="h-px flex-1 bg-white/[0.06]" />
        {phone && foldOnPhone && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-[12.5px] font-medium text-[#F4EEE2]">
            {open ? 'Ocultar' : 'Ver'}
          </button>
        )}
      </div>}
      {!folded && children}
    </section>
  )
}
