import { useEffect, useMemo } from 'react'
import useSeasonPulse, { startSeasonPulse, setSeasonsOffRemote } from '../../hooks/useSeasonPulse'
import { subscribeSeasonSettings } from '../../lib/firestore'

// A faint glow along the screen edges (plus a few drifting motes on key days)
// that fades in for ~15s and goes away again — see useSeasonPulse. Fixed,
// pointer-events none, so it can never block a click. Kept out of the center
// on purpose: content stays on a clean black.

const MOTE_COUNT = 14

function Motes({ color, snow }) {
  const motes = useMemo(
    () =>
      Array.from({ length: MOTE_COUNT }, (_, i) => ({
        left: 4 + ((i * 97) % 92),
        size: snow ? 2 + (i % 3) : 2 + (i % 2),
        delay: (i % 7) * 1.1,
        duration: 11 + (i % 5) * 2.2,
        drift: ((i % 5) - 2) * 14,
      })),
    [snow]
  )
  return motes.map((m, i) => (
    <span
      key={i}
      className="absolute rounded-full"
      style={{
        left: `${m.left}%`,
        [snow ? 'top' : 'bottom']: -10,
        width: m.size,
        height: m.size,
        background: snow ? 'rgba(255,255,255,0.8)' : color,
        boxShadow: snow ? 'none' : `0 0 8px ${color}`,
        opacity: 0,
        '--drift': `${m.drift}px`,
        animation: `${snow ? 'ador-mote-fall' : 'ador-mote-rise'} ${m.duration}s ${m.delay}s linear infinite`,
      }}
    />
  ))
}

export default function SeasonAmbient() {
  const { on, season } = useSeasonPulse()

  useEffect(() => {
    startSeasonPulse()
    // Company-wide switch (admins: Administración → Datos).
    return subscribeSeasonSettings((settings) => setSeasonsOffRemote(!!settings.off))
  }, [])

  if (!season) return null

  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const tint = season.tint

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[4] overflow-hidden"
      style={{ opacity: on ? 1 : 0, transition: `opacity ${on ? 3200 : 4500}ms ease-in-out` }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(ellipse 70% 38% at 8% -6%, ${tint}2E, transparent 70%)`,
            `radial-gradient(ellipse 60% 34% at 96% 104%, ${tint}26, transparent 70%)`,
          ].join(', '),
        }}
      />
      {on && !reduced && season.motes && <Motes color={tint} snow={season.motes === 'snow'} />}
    </div>
  )
}
