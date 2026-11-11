// Un toque físico sutil al tocar, deslizar, mantener pulsado o confirmar.
// - Android (Chrome / app instalada): vibración corta (navigator.vibrate).
// - iPhone (iOS 17.4+): Safari no expone vibración, pero un interruptor nativo
//   (<input type="checkbox" switch>) al cambiar de estado hace el "tic" del
//   sistema. Se activa con un label oculto; solo funciona dentro de un gesto
//   del usuario (un toque), que es justo cuando lo usamos.
// Tipos: 'tap' (ligero), 'success' (doble, al completar) y 'heavy' (mantener).
let iosLabel = null
function iosTick() {
  if (typeof document === 'undefined') return false
  if (!iosLabel) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    label.appendChild(input)
    document.body.appendChild(label)
    iosLabel = label
  }
  iosLabel.click()
  return true
}

const isIOS = () => typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent)

export function haptic(kind = 'tap') {
  try {
    if (typeof navigator === 'undefined') return
    if (navigator.vibrate) {
      navigator.vibrate(kind === 'success' ? [10, 40, 16] : kind === 'heavy' ? 18 : 8)
      return
    }
    if (isIOS()) {
      iosTick()
      if (kind === 'success') setTimeout(iosTick, 90)
    }
  } catch {
    /* ignore */
  }
}
