// Sonidos muy suaves, generados al vuelo (sin archivos): un toque al enviar un mensaje y un
// par de notas al completar algo. Se pueden apagar con "Activar o desactivar sonidos" en la
// paleta de comandos (⌘K). Respetan "reducir movimiento" y se activan con el primer toque.
const KEY = 'ador_sounds'
let ctx = null

export const soundsOn = () => {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
export function setSoundsOn(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* sin almacenamiento */
  }
}

// El contexto de audio vive solo unos segundos: uno abierto todo el tiempo mantiene el
// dispositivo en "modo reproducción" y degrada el micrófono al grabar notas de voz
// (más bajo y sin nitidez, sobre todo en iPhone y con la cancelación de eco).
let closeTimer = null
function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    ctx?.close?.().catch(() => {})
    ctx = null
  }, 3000)
  return ctx
}

function tone(c, freq, start, dur, gain) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq, c.currentTime + start)
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g).connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.02)
}

export function playSound(kind) {
  try {
    if (!soundsOn()) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const c = audio()
    if (!c) return
    const go = () => {
      if (kind === 'send') {
        tone(c, 880, 0, 0.09, 0.05)
      } else if (kind === 'done') {
        tone(c, 659, 0, 0.14, 0.05)
        tone(c, 988, 0.07, 0.2, 0.045)
      }
    }
    if (c.state === 'running') go()
    else c.resume().then(go).catch(() => {})
  } catch {
    /* nunca debe romper la acción */
  }
}
