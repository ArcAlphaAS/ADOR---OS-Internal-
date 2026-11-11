import { useEffect, useRef } from 'react'

// El "núcleo" de ADOR IA: una esfera hecha de cientos de trazos diminutos (el mismo
// lenguaje de la pantalla de bienvenida), con una cinta de luz que la recorre y un borde
// que brilla. En reposo gira despacio; mientras piensa (`busy`) gira y fluye más rápido y
// respira. Al aparecer, los trazos vuelan desde fuera y se ensamblan. Con
// "reducir movimiento" se dibuja una vez, quieta. En teléfono usa menos trazos y ~30 fps.
const ease = (v) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3)

export default function ParticleCore({ size = 150, busy = false, className = '' }) {
  const canvasRef = useRef(null)
  const busyRef = useRef(busy)
  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const touch = window.matchMedia?.('(hover: none), (pointer: coarse)').matches

    const total = Math.round(Math.max(120, Math.min(900, size * 5.2)) * (touch ? 0.62 : 1))
    const bandShare = 0.44
    const pts = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < total; i += 1) {
      const band = i < total * bandShare
      if (band) {
        pts.push({ band: true, s: Math.random() * Math.PI * 2, w: (Math.random() - 0.5) * 0.34, sp: 0.5 + Math.random() * 0.6, r: 1 + Math.random() * 0.05, len: 3 + Math.random() * 4, a: 0.55 + Math.random() * 0.45, delay: Math.random() * 0.9, ox: (Math.random() - 0.5) * size * 1.6, oy: (Math.random() - 0.5) * size * 1.6 })
      } else {
        const k = i - total * bandShare
        const n = total * (1 - bandShare)
        const y = 1 - (k / (n - 1)) * 2
        const rad = Math.sqrt(Math.max(0, 1 - y * y))
        const th = golden * k
        pts.push({ band: false, x: Math.cos(th) * rad, y, z: Math.sin(th) * rad, len: 2 + Math.random() * 3, a: 0.5 + Math.random() * 0.5, delay: Math.random() * 1.1, ox: (Math.random() - 0.5) * size * 1.6, oy: (Math.random() - 0.5) * size * 1.6 })
      }
    }

    let raf = 0
    let alive = true
    let last = 0
    let rot = 0
    let flow = 0
    let prev = performance.now()
    const t0 = prev
    const R = size * 0.385
    const c = size / 2
    const tilt = 0.42

    const draw = (now) => {
      if (!alive) return
      if (!reduce) raf = requestAnimationFrame(draw)
      if (document.hidden) return
      if (touch && now - last < 33) return
      last = now
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const b = busyRef.current
      rot += dt * (b ? 0.9 : 0.28)
      flow += dt * (b ? 2.2 : 0.7)
      const t = reduce ? 99 : (now - t0) / 1000
      const pulse = b ? 1 + 0.035 * Math.sin(t * 5) : 1 + 0.012 * Math.sin(t * 1.6)
      ctx.clearRect(0, 0, size, size)
      ctx.lineCap = 'round'
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineWidth = size < 100 ? 1 : 1.3
      const cr = Math.cos(rot)
      const sr = Math.sin(rot)
      const ct = Math.cos(tilt)
      const st = Math.sin(tilt)
      for (let i = 0; i < pts.length; i += 1) {
        const p = pts[i]
        let x3
        let y3
        let z3
        let rr = 1
        if (p.band) {
          const s = p.s + flow * p.sp
          const lat = 0.62 * Math.sin(s * 1.0 + flow * 0.45) * Math.cos(s * 0.5) + p.w
          const cl = Math.cos(lat)
          x3 = Math.cos(s) * cl
          y3 = Math.sin(lat)
          z3 = Math.sin(s) * cl
          rr = p.r
        } else {
          x3 = p.x
          y3 = p.y
          z3 = p.z
        }
        // gira alrededor de Y y se inclina
        const xr = x3 * cr + z3 * sr
        const zr = -x3 * sr + z3 * cr
        const yt = y3 * ct - zr * st
        const zt = y3 * st + zr * ct
        const e = ease((t - p.delay) / 1.4)
        const x = c + xr * R * rr * pulse * e + (1 - e) * p.ox
        const y = c + yt * R * rr * pulse * e + (1 - e) * p.oy
        const front = (zt + 1) / 2 // 0 atrás → 1 adelante
        const rim = 1 - Math.abs(zt) // el borde de la esfera brilla
        const alpha = (p.band ? 0.35 + 0.65 * front : 0.06 + 0.42 * Math.pow(rim, 1.6) + 0.14 * front) * p.a * e * (p.band ? 1.25 : 1)
        if (alpha < 0.03) continue
        const ang = Math.atan2(y - c, x - c) + Math.PI / 2
        const len = p.len * (size < 100 ? 0.6 : 1) * (0.7 + 0.3 * front)
        const dx = Math.cos(ang) * len * 0.5
        const dy = Math.sin(ang) * len * 0.5
        ctx.strokeStyle = p.band ? `rgba(214,226,255,${Math.min(1, alpha)})` : `rgba(244,238,226,${Math.min(1, alpha)})`
        ctx.beginPath()
        ctx.moveTo(x - dx, y - dy)
        ctx.lineTo(x + dx, y + dy)
        ctx.stroke()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [size])

  return (
    <span className={`relative inline-flex flex-shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden>
      <span
        className="absolute rounded-full"
        style={{
          inset: '10%',
          background: 'radial-gradient(circle, rgba(110,150,255,0.5) 0%, rgba(150,130,255,0.26) 42%, transparent 70%)',
          filter: `blur(${Math.max(8, size * 0.12)}px)`,
          animation: `ador-orb-glow ${busy ? 1.4 : 3.6}s ease-in-out infinite`,
        }}
      />
      <canvas ref={canvasRef} style={{ width: size, height: size }} className="relative" />
    </span>
  )
}
