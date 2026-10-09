import { useSyncExternalStore } from 'react'
import { getActiveSeasons } from '../lib/seasons'

// Decides *when* the seasonal touches are visible. It's a work tool first —
// the mood should be noticed, never lived with:
//  - On "the day itself" (Oct 31, Dec 24/25/31, Jan 1… — `season.always`) the
//    glow stays on all day.
//  - Any other day it breathes: it appears the first time a person opens ADOR
//    OS that day (a few seconds after loading), stays ~15s, fades, and comes
//    back every 3–5 minutes.
// The on/off switch is company-wide (settings/seasons.off, set by admins in
// Administración → Datos) and arrives through setSeasonsOffRemote.
// One module-level store so the edge glow (SeasonAmbient) and Home's badge
// always appear together.

const FIRST_OPEN_DELAY = [2500, 4000] // first open of the day
const LATER_OPEN_DELAY = [180000, 300000] // reopening the same day
const HOLD = [14000, 20000]
const GAP = [180000, 300000]
const RECHECK_ALWAYS = 5 * 60 * 1000
const SEEN_KEY = 'ador_season_seen_day'

const rand = ([a, b]) => a + Math.random() * (b - a)

let state = { on: false, season: null, off: false }
let cycle = 0
let started = false
let timer = null
const listeners = new Set()

function emit(next) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// True the first time this browser opens ADOR OS on a given day.
function firstOpenToday() {
  try {
    const first = localStorage.getItem(SEEN_KEY) !== todayKey()
    localStorage.setItem(SEEN_KEY, todayKey())
    return first
  } catch {
    return true
  }
}

function show() {
  clearTimeout(timer)
  const seasons = state.off ? [] : getActiveSeasons(new Date())
  const always = seasons.find((s) => s.always)

  if (always) {
    // The day itself: stays on; re-check (midnight rolls the date over).
    emit({ on: true, season: always })
    timer = setTimeout(show, RECHECK_ALWAYS)
    return
  }

  if (seasons.length === 0) {
    if (state.on) emit({ on: false })
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
  // The day itself is on from the moment you open the app, every time.
  const dayItself = getActiveSeasons(new Date()).some((s) => s.always)
  timer = setTimeout(show, rand(firstOpenToday() || dayItself ? FIRST_OPEN_DELAY : LATER_OPEN_DELAY))
}

// Called with the company-wide setting. Turning it off hides everything right
// away; turning it back on shows it again.
export function setSeasonsOffRemote(off) {
  if (off === state.off) return
  emit(off ? { off: true, on: false } : { off: false })
  if (started) {
    clearTimeout(timer)
    timer = setTimeout(show, off ? rand(GAP) : rand(FIRST_OPEN_DELAY))
  }
}

const subscribe = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export default function useSeasonPulse() {
  return useSyncExternalStore(subscribe, () => state)
}
