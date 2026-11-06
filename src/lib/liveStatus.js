import { useSyncExternalStore } from 'react'

// Lo que la "isla" de la esquina muestra. Un solo lugar donde cualquier parte
// de la app avisa que algo está pasando ahora mismo:
//   beginWrite()/endWrite()  → guardando (lo llama withTimeout, o sea toda escritura)
//   setThinking(true|false)  → ADOR IA pensando
// "saving" solo se muestra si tarda más de 350 ms (para que no parpadee en
// escrituras instantáneas) y, al terminar, deja un "Guardado" de ~1 s.
const state = { writes: 0, saving: false, saved: false, thinking: false }
const listeners = new Set()
let snapshot = { ...state }
const emit = () => {
  snapshot = { ...state }
  listeners.forEach((l) => l())
}
let showTimer, savedTimer, shownAt = 0

export function beginWrite() {
  state.writes += 1
  if (state.writes === 1) {
    clearTimeout(savedTimer)
    state.saved = false
    showTimer = setTimeout(() => {
      if (state.writes > 0) {
        state.saving = true
        shownAt = Date.now()
        emit()
      }
    }, 350)
  }
}

export function endWrite() {
  state.writes = Math.max(0, state.writes - 1)
  if (state.writes > 0) return
  clearTimeout(showTimer)
  if (!state.saving) return
  const wait = Math.max(0, 700 - (Date.now() - shownAt))
  setTimeout(() => {
    if (state.writes > 0) return
    state.saving = false
    state.saved = true
    emit()
    savedTimer = setTimeout(() => {
      state.saved = false
      emit()
    }, 1100)
  }, wait)
}

export function setThinking(on) {
  state.thinking = on
  emit()
}

const subscribe = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
export const useLiveStatus = () => useSyncExternalStore(subscribe, () => snapshot)
