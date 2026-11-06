// Un solo lugar para avisar que una acción falló. Antes varias acciones
// (confirmar asistencia, votar, confirmar lectura…) fallaban en silencio y el botón
// parecía roto. Ahora todo fallo visible llega al mismo aviso, con el mismo tono.
export function friendlyError(e) {
  const code = e?.code || ''
  const msg = String(e?.message || e || '')
  if (code.includes('permission-denied') || /permission/i.test(msg)) return 'No tienes permiso para hacer esto.'
  if (code.includes('unavailable') || /network|offline|Failed to fetch/i.test(msg)) return 'Sin conexión estable. Inténtalo de nuevo en un momento.'
  if (/Tardó demasiado|timeout/i.test(msg)) return 'Tardó demasiado. Revisa tu conexión e inténtalo otra vez.'
  return 'No se pudo completar. Inténtalo de nuevo.'
}

export function notifyFail(e) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('ador:fail', { detail: { message: friendlyError(e) } }))
}
