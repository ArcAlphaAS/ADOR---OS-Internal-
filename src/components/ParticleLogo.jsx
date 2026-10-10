import { useEffect, useRef } from 'react'

// The ADOR mark drawn as hundreds of tiny strokes. The shape is not drawn by
// hand: /logo.svg is painted on an off-screen canvas, its covered pixels are
// sampled, and one stroke is placed on each — so whatever logo is in
// public/logo.svg is the silhouette (swap the file and this follows).
//
// Motion: the strokes fly in and assemble, then keep breathing (each one
// rotates a little, and a soft wave of brightness crosses the mark). Pointer
// or finger near the mark pushes strokes aside — on touch screens that is
// switched off and the animation is lightened (fewer strokes, ~30 fps), since
// there is no hover and phones should spend as little as possible. When `scatter` turns true they
// disperse outward and fade (used when leaving the welcome screen). With
// prefers-reduced-motion it is drawn once, still.
const LOGO_SRC = '/logo.svg'
const LOGO_RATIO = 71.039 / 76.304

const ease = (v) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3)

export default function ParticleLogo({ size = 260, scatter = false, className = '' }) {
  const canvasRef = useRef(null)
  const scatterAt = useRef(0)

  useEffect(() => {
    scatterAt.current = scatter ? performance.now() : 0
  }, [scatter])

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
    let last = 0
    let pts = []
    let raf = 0
    let alive = true
    let pointer = null
    const t0 = performance.now()

    const draw = (now) => {
      if (!alive) return
      if (!reduce) raf = requestAnimationFrame(draw)
      if (document.hidden) return
      if (touch && now - last < 33) return
      last = now
      const t = reduce ? 99 : (now - t0) / 1000
      const so = scatterAt.current ? Math.min(1, (now - scatterAt.current) / 700) : 0
      ctx.clearRect(0, 0, size, size)
      ctx.lineCap = 'round'
      ctx.lineWidth = size < 140 ? 1 : 1.35
      for (let i = 0; i < pts.length; i += 1) {
        const p = pts[i]
        const e = ease((t - p.delay) / 1.5)
        let x = p.x + (1 - e) * p.ox
        let y = p.y + (1 - e) * p.oy
        if (so) {
          x += (p.x - size / 2) * so * 1.6
          y += (p.y - size / 2) * so * 1.6
        }
        if (pointer) {
          const dx = x - pointer.x
          const dy = y - pointer.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 46 && d > 0.1) {
            const f = (1 - d / 46) * 14
            x += (dx / d) * f
            y += (dy / d) * f
          }
        }
        const angle = p.angle + (reduce ? 0 : Math.sin(t * 0.9 + p.phase) * 0.55) + (1 - e) * 2
        const wave = 0.5 + 0.5 * Math.sin(t * 1.3 - (p.x + p.y) / 55)
        const alpha = e * (reduce ? 0.85 : 0.5 + 0.5 * wave) * (1 - so)
        ctx.strokeStyle = `rgba(245,245,245,${alpha.toFixed(3)})`
        const cx = Math.cos(angle) * p.len
        const cy = Math.sin(angle) * p.len
        ctx.beginPath()
        ctx.moveTo(x - cx, y - cy)
        ctx.lineTo(x + cx, y + cy)
        ctx.stroke()
      }
    }

    const img = new Image()
    img.onload = () => {
      if (!alive) return
      const off = document.createElement('canvas')
      off.width = size
      off.height = size
      const octx = off.getContext('2d', { willReadFrequently: true })
      const w = size * 0.82
      const h = w * LOGO_RATIO
      octx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      const data = octx.getImageData(0, 0, size, size).data
      // Small marks (empty states) need a fixed fine grain, or the strokes vanish.
      const small = size < 140
      const step = (small ? 3 : size / 36) * (touch ? 1.3 : 1)
      const next = []
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const jx = x + (Math.random() - 0.5) * step * 0.6
          const jy = y + (Math.random() - 0.5) * step * 0.6
          const idx = (Math.round(jy) * size + Math.round(jx)) * 4
          if (data[idx + 3] > 140) {
            next.push({
              x: jx,
              y: jy,
              angle: Math.random() * Math.PI,
              phase: Math.random() * 6.28,
              delay: Math.random() * 0.9,
              ox: (Math.random() - 0.5) * 90,
              oy: (Math.random() - 0.5) * 90,
              len: small ? 1.2 + Math.random() * 0.6 : size / 150 + Math.random() * (size / 190),
            })
          }
        }
      }
      pts = next
      raf = requestAnimationFrame(draw)
    }
    img.src = LOGO_SRC

    const onMove = (ev) => {
      const r = canvas.getBoundingClientRect()
      pointer = { x: ev.clientX - r.left, y: ev.clientY - r.top }
    }
    const onLeave = () => { pointer = null }
    if (!touch) {
      canvas.addEventListener('pointermove', onMove)
      canvas.addEventListener('pointerleave', onLeave)
      canvas.addEventListener('pointerup', onLeave)
    }

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerup', onLeave)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label="ADOR"
    />
  )
}
