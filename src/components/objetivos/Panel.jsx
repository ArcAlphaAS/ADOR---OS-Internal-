// Contenedor común de los paneles de abajo en Objetivos (Iniciativas, Métricas, Experimentos, Decisiones):
// título en 15 px a la izquierda, una sola acción discreta a la derecha, y el contenido. Un mismo estilo
// para los cuatro, en lugar de cada uno con su encabezado y sus botones.
export default function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`flex flex-col rounded-[24px] bg-[#1C1C1E] p-6 ${className}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-[#F5F5F5]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-[#8E8E93]">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  )
}

export const PanelAction = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="-mr-2 flex-shrink-0 rounded-full px-3 py-1 text-[13px] font-medium text-[#F4EEE2] transition-colors hover:bg-white/[0.08]">
    {children}
  </button>
)

export const PanelEmpty = ({ children }) => (
  <p className="flex flex-1 items-center py-6 text-[14px] leading-relaxed text-[#6E6E73]">{children}</p>
)
