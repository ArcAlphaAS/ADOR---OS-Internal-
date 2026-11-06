import { useEffect } from 'react'

// Etiquetas para lectores de pantalla sin tocar cientos de botones a mano:
// - botones/enlaces que solo tienen un icono toman el nombre de su `title`;
// - campos sin etiqueta toman su `placeholder`;
// - los paneles tipo modal (.ador-modal-surface) se anuncian como diálogo.
// Corre con un pequeño retraso tras cada cambio de pantalla, sin costo apreciable.
function polish(root) {
  root.querySelectorAll('button:not([aria-label]), a[href]:not([aria-label]), [role="button"]:not([aria-label])').forEach((el) => {
    if (el.textContent.trim()) return
    const label = el.getAttribute('title')
    if (label) el.setAttribute('aria-label', label)
  })
  root.querySelectorAll('input:not([aria-label]):not([type="hidden"]), textarea:not([aria-label]), select:not([aria-label])').forEach((el) => {
    if (el.labels?.length) return
    const label = el.getAttribute('placeholder') || el.getAttribute('title')
    if (label) el.setAttribute('aria-label', label)
  })
  root.querySelectorAll('.ador-modal-surface:not([role])').forEach((el) => {
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-modal', 'true')
    const heading = el.querySelector('h1, h2, h3')
    if (heading?.textContent) el.setAttribute('aria-label', heading.textContent.trim().slice(0, 80))
  })
}

export function useA11yPolish() {
  useEffect(() => {
    let timer = null
    const run = () => {
      timer = null
      polish(document.body)
    }
    const obs = new MutationObserver(() => {
      if (!timer) timer = setTimeout(run, 400)
    })
    obs.observe(document.body, { childList: true, subtree: true })
    run()
    return () => {
      obs.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [])
}
