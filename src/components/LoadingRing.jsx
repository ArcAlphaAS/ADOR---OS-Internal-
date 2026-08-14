// Six-dot chase ring, used as a quiet loading/brand motif on Splash and Login.
export default function LoadingRing({ size = 28, dotSize = 4, color = '#F5F5F5' }) {
  const radius = size / 2 - dotSize / 2

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60 * Math.PI) / 180
        const x = radius + radius * Math.cos(angle)
        const y = radius + radius * Math.sin(angle)
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              width: dotSize,
              height: dotSize,
              left: x,
              top: y,
              borderRadius: '9999px',
              background: color,
              animation: 'ador-spin-dot 1.4s ease-in-out infinite',
              animationDelay: `${(i * 1.4) / 6}s`,
            }}
          />
        )
      })}
    </div>
  )
}
