// Diagnóstico de pantalla (Administración → Datos): pinta el fondo de magenta, marca los bordes
// reales de la ventana (línea cian abajo, verde arriba) y dibuja barras de prueba con distintas
// unidades de altura. Sirve para ver en un teléfono qué parte de la pantalla usa la app.
export function toggleScreenDiagnostic() {
  const on = document.documentElement.classList.toggle('ador-diag')
  document.getElementById('ador-diag-probes')?.remove()
  if (!on) return false
  const wrap = document.createElement('div')
  wrap.id = 'ador-diag-probes'
  const mk = (h, pos, left, color) => `<i style="position:${pos};top:0;left:${left}px;width:10px;height:${h};background:${color};z-index:2147483646"></i>`
  wrap.innerHTML = [
    mk('100vh', 'fixed', 4, '#ff3b30'), mk('100dvh', 'fixed', 16, '#34c759'), mk('100lvh', 'fixed', 28, '#0a84ff'), mk('100svh', 'fixed', 40, '#ffd60a'), mk('932px', 'fixed', 52, '#ffffff'),
    mk('932px', 'absolute', 70, '#ff9500'), mk('100lvh', 'absolute', 82, '#bf5af2'),
  ].join('')
  document.body.appendChild(wrap)
  return true
}

export function screenInfo() {
  try {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;left:0;top:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden'
    document.body.appendChild(probe)
    const inset = parseFloat(getComputedStyle(probe).paddingBottom) || 0
    probe.remove()
    const vv = window.visualViewport
    return `Pantalla ${window.screen.width}×${window.screen.height} · ventana ${window.innerWidth}×${window.innerHeight} · visible ${Math.round(vv?.height || 0)} · margen inferior ${inset} · ${window.navigator.standalone ? 'app instalada' : 'navegador'}`
  } catch {
    return ''
  }
}
