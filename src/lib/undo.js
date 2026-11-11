// Deshacer: acciones que se pueden revertir (borrar una tarea, completarla, moverla de etapa…)
// se registran aquí. Aparece un aviso con "Deshacer" unos segundos y ⌘Z / Ctrl+Z revierte la
// última. Cada acción dura 30 s; pasado ese tiempo ya no se puede revertir.
let seq = 0
let entries = []
const TTL = 30000

export function registerUndo(message, fn) {
  const id = ++seq
  entries = [...entries.filter((e) => Date.now() - e.at < TTL), { id, fn, at: Date.now(), message }]
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ador:undo-toast', { detail: { id, message } }))
  return id
}

export async function runUndo(id) {
  const entry = id ? entries.find((e) => e.id === id) : [...entries].reverse().find((e) => Date.now() - e.at < TTL)
  if (!entry) return false
  entries = entries.filter((e) => e.id !== entry.id)
  try {
    await entry.fn()
    window.dispatchEvent(new CustomEvent('ador:undone', { detail: { message: entry.message } }))
    return true
  } catch (e) {
    window.dispatchEvent(new CustomEvent('ador:fail', { detail: { message: 'No se pudo deshacer.' } }))
    return false
  }
}
