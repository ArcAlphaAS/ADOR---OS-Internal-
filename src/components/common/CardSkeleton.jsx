// Tarjetas de carga: la misma forma que una tarea, con el brillo suave de ADOR OS. Se
// usan mientras llegan los datos para que la pantalla no parezca vacía.
export default function CardSkeleton({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-[22px] bg-[#1C1C1E] px-4 py-3.5" style={{ opacity: 1 - i * 0.15 }}>
          <span className="ador-skeleton h-[26px] w-[26px] flex-shrink-0 rounded-full" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="ador-skeleton h-[14px] rounded-full" style={{ width: `${68 - (i % 3) * 14}%` }} />
            <span className="ador-skeleton h-[11px] w-[38%] rounded-full" />
          </span>
        </div>
      ))}
    </div>
  )
}
