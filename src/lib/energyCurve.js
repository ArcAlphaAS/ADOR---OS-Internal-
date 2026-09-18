// A generic, "typical day" energy curve — the common chronobiology pattern
// (mid-morning peak, post-lunch trough, smaller late-afternoon rise), not
// derived from any real biometric/sleep data this app has access to.
// Deliberately kept generic and always labeled as a general pattern
// wherever it's shown (never "your energy" or anything implying it's
// measured) — presenting it as personal/real would violate this app's own
// rule against ever showing a number that looks measured but isn't. Only
// shown on Calendario's Día view, per direct user request: the point is
// flagging when to schedule the day's hardest/most demanding work, not a
// wellness dashboard.
const POINTS = [
  { h: 0, v: 15 },
  { h: 6, v: 25 },
  { h: 7, v: 45 },
  { h: 9, v: 85 },
  { h: 10, v: 97 },
  { h: 11.5, v: 88 },
  { h: 13, v: 55 },
  { h: 14, v: 38 },
  { h: 15.5, v: 55 },
  { h: 16.5, v: 78 },
  { h: 18, v: 60 },
  { h: 20, v: 38 },
  { h: 22, v: 22 },
  { h: 24, v: 15 },
]

export function energyAt(hour) {
  for (let i = 0; i < POINTS.length - 1; i++) {
    const a = POINTS[i]
    const b = POINTS[i + 1]
    if (hour >= a.h && hour <= b.h) {
      const t = (hour - a.h) / (b.h - a.h)
      return a.v + (b.v - a.v) * t
    }
  }
  return POINTS[POINTS.length - 1].v
}

export const ENERGY_POINTS = POINTS

// The two windows worth flagging as "do the hard thing now" — matches the
// two local maxima in the curve above.
export const ENERGY_PEAKS = [
  { start: 9, end: 11.5 },
  { start: 15.5, end: 17 },
]
