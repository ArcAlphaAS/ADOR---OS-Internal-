import { useEffect, useSyncExternalStore } from 'react'
import { subscribeSeasonSettings } from '../lib/firestore'

// The company-wide on/off for the seasonal touches (the badge and the day-of
// greeting phrases): settings/seasons.off, changed by admins in
// Administración → Datos. One module-level store so every consumer agrees.

let state = { off: false }
const listeners = new Set()

function setOff(off) {
  if (off === state.off) return
  state = { off }
  listeners.forEach((l) => l())
}

const subscribe = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export default function useSeasonsOff() {
  return useSyncExternalStore(subscribe, () => state).off
}

// Mounted once in AppShell.
export function useSeasonRuntime() {
  useEffect(() => subscribeSeasonSettings((settings) => setOff(!!settings.off)), [])
}
