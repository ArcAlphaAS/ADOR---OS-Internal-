// The on-screen keyboard on phones. iOS doesn't shrink the page when the
// keyboard opens — it slides the whole page up underneath it, so the chat's
// text box could end up hidden or the screen jumpy. This sizes the app to
// the part of the screen that's actually visible (visualViewport) and
// marks <html class="kb-open"> while the keyboard is up, so the bottom tab
// bar steps aside and the box sits right on top of the keyboard.
// iPhone con la app instalada: a veces la altura que reporta el sistema queda más
// corta que la pantalla real y sobra una franja negra abajo. Medimos esa diferencia y la
// exponemos como --ios-gap para que la raíz, la barra y las hojas lleguen al borde real.
function installIosGap() {
  const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  if (!standalone || !/iP(hone|ad)/.test(navigator.userAgent)) return
  const root = document.documentElement
  const measure = () => {
    if (root.classList.contains('kb-open')) return
    const portrait = window.innerHeight >= window.innerWidth
    const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
    const gap = Math.round(screenH - window.innerHeight)
    root.style.setProperty('--ios-gap', gap > 12 && gap < 140 ? `${gap}px` : '0px')
  }
  measure()
  window.addEventListener('resize', measure)
  window.addEventListener('orientationchange', () => setTimeout(measure, 300))
}

export function installKeyboardHandling() {
  installIosGap()
  const vv = window.visualViewport
  if (!vv || !window.matchMedia('(pointer: coarse)').matches) return
  const root = document.documentElement
  const update = () => {
    root.style.setProperty('--app-h', `${Math.round(vv.height)}px`)
    // iOS a veces no encoge la pantalla: desplaza la parte visible hacia abajo.
    root.style.setProperty('--app-top', `${Math.round(vv.offsetTop)}px`)
    const open = window.innerHeight - vv.height > 100
    root.classList.toggle('kb-open', open)
    // Undo iOS's own slide-up so the resized app lines up with the screen.
    if (window.scrollY !== 0) window.scrollTo(0, 0)
  }
  // iOS tarda en avisar que el teclado ya está: al tocar un campo, medimos varias
  // veces mientras sube, para que la caja de escribir quede siempre encima.
  const settle = () => [0, 80, 200, 400, 800].forEach((t) => setTimeout(update, t))
  document.addEventListener('focusin', (e) => {
    if (!/^(INPUT|TEXTAREA)$/.test(e.target?.tagName)) return
    settle()
    setTimeout(() => e.target.scrollIntoView?.({ block: 'nearest' }), 420)
  })
  document.addEventListener('focusout', settle)
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  update()
}
