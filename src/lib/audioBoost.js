// Subida de volumen al reproducir una nota de voz que quedó baja. Se calcula al grabar
// (`boost` = cuántas veces subir) y se aplica aquí con Web Audio, con un limitador al final
// para no distorsionar. Sin `boost` (o menor a 1,05) el audio suena tal cual.
export function attachBoost(audio, boost) {
  if (!boost || boost <= 1.05) return null
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    const ctx = new AC()
    const src = ctx.createMediaElementSource(audio)
    const gain = ctx.createGain()
    gain.gain.value = boost
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -3
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.002
    limiter.release.value = 0.08
    src.connect(gain)
    gain.connect(limiter)
    limiter.connect(ctx.destination)
    return ctx
  } catch {
    return null
  }
}
