// Actualizar de verdad. En el iPhone con la app instalada, recargar a secas puede
// volver a servir la copia guardada de la página (y por eso "Actualizar" reaparecía
// hasta abrir Safari). Primero se obliga al sistema a traer la página nueva
// (cache: 'reload' reemplaza la copia guardada, también la de la ruta "/" con la que
// arranca el icono) y se avisa al service worker; después se recarga.
export async function applyUpdate() {
  try {
    await Promise.all([
      fetch('/', { cache: 'reload' }),
      fetch('/index.html', { cache: 'reload' }),
      fetch(`/version.json?t=${Date.now()}`, { cache: 'reload' }),
    ])
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || []
    await Promise.all(regs.map((r) => r.update().catch(() => {})))
  } catch {
    // sin conexión: la recarga normal decide
  }
  window.location.reload()
}
