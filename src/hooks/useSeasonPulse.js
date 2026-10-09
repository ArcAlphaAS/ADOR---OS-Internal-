import { useSyncExternalStore } from 'react'
import { getActiveSeasons } from '../lib/seasons'

// Decides *when* the seasonal touches are visible. The point is that they
// breathe: a few seconds after opening ADOR OS the season fades in, stays for
// ~15s, fades out, and returns every few minutes. It's a work tool first —
// the mood should be noticed, never lived with. One module-level store so the
// edge glow (SeasonAmbient) and Home's badge always appear together.

const FIRST_DELAY = [5000, 9000]
const HOLD = [14000, 20000]
const GAP = [180000, 420000]
const OFF_KEY = 'ador_seasons_off'

const rand = ([a, b]) => a + Math.random() * (b - a)

function readOff() {
  try {
    return localStorage.getItem(OFF_KEY) === '1'
  } catch {
    return false
  }
}

let state = { on: false, season: null, off: readOff() }
let cycle = 0
let started = false
let timer = null
const listeners = new Set()

function emit(next) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

function show() {
  const seasons = getActiveSeasons(new Date())
  if (state.off || seasons.length === 0) {
    timer = setTimeout(show, rand(GAP))
    return
  }
  // Alternate between overlapping seasons across cycles (October has three).
  emit({ on: true, season: seasons[cycle % seasons.length] })
  cycle += 1
  timer = setTimeout(() => {
    emit({ on: false })
    timer = setTimeout(show, rand(GAP))
  }, rand(HOLD))
}

export function startSeasonPulse() {
  if (started) return
  started = true
  timer = setTimeout(show, rand(FIRST_DELAY))
}

export function setSeasonsOff(off) {
  try {
    if (off) localStorage.setItem(OFF_KEY, '1')
    else localStorage.removeItem(OFF_KEY)
  } catch {
    /* private mode — the preference just won't persist */
  }
  emit(off ? { off: true, on: false } : { off: false })
}

const subscribe = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export default function useSeasonPulse() {
  return useSyncExternalStore(subscribe, () => state)
}
