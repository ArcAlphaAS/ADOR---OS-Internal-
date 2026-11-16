// Suelta un <audio> por completo cuando termina: sin esto el sistema lo sigue mostrando en
// "Reproduciendo" (barra de notificaciones / Centro de control) aunque ya acabó.
export function releaseAudio(audio) {
  try {
    if (!audio) return
    audio.onerror = null // al soltar el audio el navegador avisa de "sin fuente": no es un fallo
    audio.ontimeupdate = null
    audio.onended = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    }
  } catch {
    /* nunca debe romper la reproducción */
  }
}
