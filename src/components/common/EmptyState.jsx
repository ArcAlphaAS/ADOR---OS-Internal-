// Un solo estado vacío para toda la app: un título corto, una línea que explica
// qué va a haber aquí y, si existe, una acción clara. Evita que cada módulo invente
// el suyo (texto gris suelto, "Sin datos todavía"…).
export default function EmptyState({ title, hint, actionLabel, onAction, compact = false, className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'gap-1 py-5' : 'gap-1.5 py-9'} ${className}`}>
      <p className="text-[14px] font-medium text-[#CFCFCF]">{title}</p>
      {hint && <p className="max-w-[300px] text-[12.5px] leading-relaxed text-[#8A8A8A]">{hint}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-2 rounded-full border border-white/[0.14] px-4 py-1.5 text-[12.5px] font-medium text-[#F4EEE2] transition-colors hover:bg-white/[0.06]">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
