// Fondo de las iniciales cuando alguien no tiene foto: un degradado suave y estable
// (siempre el mismo para la misma persona), tomado de la paleta de iOS pero apagado
// para que una lista llena de avatares no se vuelva un arcoíris.
const GRADIENTS = [
  ['#D98A1E', '#A85F00'], ['#2FA84F', '#1B7A35'], ['#3A8EE8', '#2260B8'], ['#A55BD8', '#7A3BAA'],
  ['#D8445F', '#A82744'], ['#4FA9CC', '#2F7C9E'], ['#C9A227', '#9A7A12'], ['#6360C8', '#4745A0'],
]
export function avatarGradient(seed) {
  const s = String(seed || '?')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const [a, b] = GRADIENTS[h % GRADIENTS.length]
  return `linear-gradient(145deg, ${a}, ${b})`
}
