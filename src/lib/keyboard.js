// The on-screen keyboard on phones. iOS doesn't shrink the page when the
// keyboard opens — it slides the whole page up underneath it, so the chat's
// text box could end up hidden or the screen jumpy. This sizes the app to
// the part of the screen that's actually visible (visualViewport) and
// marks <html class="kb-open"> while the keyboard is up, so the bottom tab
// bar steps aside and the box sits right on top of the keyboard.
export function installKeyboardHandling() {
  const vv = window.visualViewport
  if (!vv || !window.matchMedia('(pointer: coarse)').matches) return
  const root = document.documentElement
  const update = () => {
    root.style.setProperty('--app-h', `${Math.round(vv.height)}px`)
    const open = window.innerHeight - vv.height > 140
    root.classList.toggle('kb-open', open)
    // Undo iOS's own slide-up so the resized app lines up with the screen.
    if (window.scrollY !== 0) window.scrollTo(0, 0)
  }
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  update()
}
