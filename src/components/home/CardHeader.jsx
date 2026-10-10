// One header for every Inicio card: small label on the left, optional count or
// status dot, and an optional quiet action on the right. Keeping this in one
// place is what makes the page read as ordered.
export const CARD_PAD = 'px-7 py-6 sm:px-8 sm:py-7'
export const CARD_RADIUS = 'rounded-[24px]'

export default function CardHeader({ label, count, dot, action }) {
  return (
    <div className="flex items-center gap-2.5">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">{label}</h3>
      {count != null && <span className="text-[12px] tabular-nums text-[#767676]">{count}</span>}
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot, animation: 'ador-pulse 2s ease-in-out infinite' }} />}
      {action && <span className="ml-auto text-[12px] font-medium text-[#F4EEE2]">{action}</span>}
    </div>
  )
}

// A zone groups cards under a quiet title, so the page reads Hoy → Pulso → Equipo.
export function Zone({ title, children }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="text-[12px] font-medium tracking-[0.04em] text-[#767676]">{title}</span>
        <span className="h-px flex-1 bg-white/[0.06]" />
      </div>
      {children}
    </section>
  )
}
