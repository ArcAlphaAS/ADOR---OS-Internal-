// Compartir con la hoja nativa del sistema (Mensajes, WhatsApp, AirDrop, Copiar…) cuando
// existe; si no (computadora sin soporte), copia el enlace y lo avisa.
export async function shareLink({ title, text, path }, showToast) {
  const url = new URL(path, window.location.origin).href
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url })
      return
    }
    await navigator.clipboard.writeText(url)
    showToast?.('Enlace copiado.')
  } catch (e) {
    // Cancelar la hoja de compartir no es un error.
    if (e?.name !== 'AbortError') showToast?.('No se pudo compartir.')
  }
}
