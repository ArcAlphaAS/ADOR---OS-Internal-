import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { SPRING } from '../../lib/motion'

// Choose how a photo is cropped before it's saved: drag to move, slider (or
// mouse wheel) to zoom, then "Usar foto" bakes exactly what's inside the
// frame into a small JPEG data URL (same Storage-free approach as every other
// photo in the app). Profile and Directorio photos use a round 1:1 frame;
// Comunidad photos a 4:3 one, where "Usar completa" keeps the whole picture.
const FRAME_W = 300

export default function PhotoCropper({ file, aspect = 1, round = false, outWidth = 256, quality = 0.85, title = 'Encuadra tu foto', allowFull = false, onDone, onSkip, onCancel }) {
  const FRAME_H = Math.round(FRAME_W / aspect)
  const [img, setImg] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => setImg(el)
    el.onerror = () => onCancel?.()
    el.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Geometry: the photo always covers the frame (scale ≥ cover), and the
  // offset is clamped so no empty edge ever shows.
  const base = img ? Math.max(FRAME_W / img.width, FRAME_H / img.height) : 1
  const s = base * zoom
  const dw = img ? img.width * s : 0
  const dh = img ? img.height * s : 0
  const clampOff = (o, z = zoom) => {
    if (!img) return o
    const sc = base * z
    const mx = Math.max(0, (img.width * sc - FRAME_W) / 2)
    const my = Math.max(0, (img.height * sc - FRAME_H) / 2)
    return { x: Math.max(-mx, Math.min(mx, o.x)), y: Math.max(-my, Math.min(my, o.y)) }
  }
  const changeZoom = (z) => {
    const nz = Math.max(1, Math.min(4, z))
    setZoom(nz)
    setOff((o) => clampOff(o, nz))
  }

  const confirm = () => {
    const k = outWidth / FRAME_W
    const canvas = document.createElement('canvas')
    canvas.width = outWidth
    canvas.height = Math.round(outWidth / aspect)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, (FRAME_W / 2 - dw / 2 + off.x) * k, (FRAME_H / 2 - dh / 2 + off.y) * k, dw * k, dh * k)
    onDone(canvas.toDataURL('image/jpeg', quality))
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 backdrop-blur-[10px]"
      onClick={onCancel}
    >
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING} onClick={(e) => e.stopPropagation()}>
        <div className="ador-modal-surface ador-grain w-[360px] max-w-full rounded-[28px] p-7">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">{title}</h2>
          <p className="mt-1 text-[12px] text-[#888888]">Arrastra para mover, usa el zoom para acercar.</p>

          <div className="mt-5 flex justify-center">
            <div
              className={`relative cursor-grab touch-none select-none overflow-hidden bg-black active:cursor-grabbing ${round ? 'rounded-full' : 'rounded-2xl'}`}
              style={{ width: FRAME_W, height: FRAME_H, maxWidth: '100%' }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                dragRef.current = { x: e.clientX, y: e.clientY, start: off }
              }}
              onPointerMove={(e) => {
                const d = dragRef.current
                if (d) setOff(clampOff({ x: d.start.x + (e.clientX - d.x), y: d.start.y + (e.clientY - d.y) }))
              }}
              onPointerUp={() => (dragRef.current = null)}
              onPointerCancel={() => (dragRef.current = null)}
              onWheel={(e) => changeZoom(zoom - e.deltaY * 0.002)}
            >
              {img ? (
                <img
                  src={img.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none"
                  style={{ width: dw, height: dh, left: FRAME_W / 2 - dw / 2 + off.x, top: FRAME_H / 2 - dh / 2 + off.y }}
                />
              ) : (
                <div className="ador-skeleton h-full w-full" />
              )}
            </div>
          </div>

          <label className="mt-5 flex items-center gap-3 text-[12px] text-[#888888]">
            Zoom
            <input type="range" min="1" max="4" step="0.02" value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} className="flex-1 accent-[#E8C15A]" />
            <span className="w-10 text-right tabular-nums text-[#BBBBBB]">{Math.round(zoom * 100)}%</span>
          </label>

          <div className="mt-6 flex items-center justify-end gap-2">
            {allowFull && (
              <button type="button" onClick={onSkip} className="mr-auto text-[12.5px] text-[#999999] hover:text-[#F5F5F5]">
                Usar completa
              </button>
            )}
            <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-[13px] text-[#888888] hover:text-[#F5F5F5]">
              Cancelar
            </button>
            <button type="button" onClick={confirm} disabled={!img} className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium disabled:opacity-50">
              Usar foto
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
