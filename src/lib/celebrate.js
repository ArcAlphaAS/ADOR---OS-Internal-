import { haptic } from './haptics'

// Achievement moments: anything can call celebrate({ title, subtitle }) and
// AchievementMoment (mounted once in AppShell) shows it. Detection of *what*
// deserves one lives in hooks/useAchievements.js.
export const MOMENT_EVENT = 'ador:moment'

export function celebrate(detail) {
  if (typeof window === 'undefined') return
  haptic('success')
  window.dispatchEvent(new CustomEvent(MOMENT_EVENT, { detail }))
}
