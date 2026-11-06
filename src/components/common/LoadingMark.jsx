// La pantallita de carga de ADOR OS: el logo en un círculo negro que respira y
// seis puntos que lo rodean encendiéndose en cadena (el mismo gesto de la
// píldora de la esquina). Solo es bonita: aparece si la espera dura más de un
// parpadeo (ador-skeleton-in), así lo instantáneo nunca la muestra.
export default function LoadingMark({ label = 'Cargando', size = 60, full = false }) {
  const ring = size * 0.78
  return (
    <div className={`ador-skeleton-in flex flex-col items-center justify-center gap-6 ${full ? 'h-full min-h-[60vh] w-full' : 'py-24'}`} role="status" aria-label={label}>
      <div className="relative flex items-center justify-center" style={{ width: size + 44, height: size + 44 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 block h-[5px] w-[5px]"
            style={{ margin: '-2.5px 0 0 -2.5px', transform: `rotate(${i * 60}deg) translateY(-${ring}px)` }}
          >
            <span className="block h-full w-full rounded-full bg-[#F4EEE2]" style={{ animation: `ador-orbit 1.3s ease-in-out ${i * 0.2}s infinite` }} />
          </span>
        ))}
        <span
          className="flex items-center justify-center rounded-full bg-black ring-1 ring-white/[0.1]"
          style={{ width: size, height: size, animation: 'ador-pulse 2.4s ease-in-out infinite' }}
        >
          <img src="/logo.svg" alt="" width={size * 0.46} height={size * 0.46} draggable={false} />
        </span>
      </div>
      {label && <span className="text-[13px] tracking-[0.04em] text-[#767676]">{label}</span>}
    </div>
  )
}
