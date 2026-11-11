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

// Esqueleto de una pantalla completa de tarjetas (Finanzas, Objetivos…): una tarjeta grande,
// una fila de tres pequeñas y un bloque de gráfico, con el mismo brillo suave.
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando">
      <div className="rounded-[28px] bg-[#1C1C1E] p-5">
        <span className="ador-skeleton block h-[12px] w-[24%] rounded-full" />
        <span className="ador-skeleton mt-4 block h-[34px] w-[62%] rounded-full" />
        <span className="ador-skeleton mt-6 block h-[46px] w-full rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[22px] bg-[#1C1C1E] p-4">
            <span className="ador-skeleton mx-auto block h-[18px] w-[70%] rounded-full" />
            <span className="ador-skeleton mx-auto mt-3 block h-[11px] w-[50%] rounded-full" />
          </div>
        ))}
      </div>
      <div className="rounded-[28px] bg-[#1C1C1E] p-5">
        <span className="ador-skeleton block h-[12px] w-[30%] rounded-full" />
        <span className="ador-skeleton mt-5 block h-[96px] w-full rounded-[14px]" />
      </div>
    </div>
  )
}
