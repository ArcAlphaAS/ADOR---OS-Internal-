import { useEffect, useState } from 'react'
import { getActiveSeasons, seasonBadge } from '../../lib/seasons'
import useSeasonsOff from '../../hooks/useSeasons'

function getGreeting(hour, name) {
  if (hour >= 6 && hour < 13) return `Buenos días, ${name}.`
  if (hour >= 13 && hour < 19) return `Buenas tardes, ${name}.`
  return `Buenas noches, ${name}.`
}

function formatDate(date) {
  const text = date.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// A few phrases per time-of-day so the greeting doesn't read identically
// every single day. Picked via a day-of-year seed — stable within a day,
// rotates day to day, no randomness that would feel erratic on refresh.
const SUBTEXT_VARIANTS = {
  morning: ['Hoy es un buen día para construir.', 'Un nuevo día, foco claro.', 'Empecemos con intención.'],
  afternoon: ['Sigamos avanzando.', 'A mitad de camino, sin perder el rumbo.', 'La tarde para ejecutar.'],
  evening: ['Cerrando el día con ADOR.', 'Buen momento para revisar lo avanzado.', 'El día casi termina — bien hecho.'],
}

function getBucket(hour) {
  if (hour >= 6 && hour < 13) return 'morning'
  if (hour >= 13 && hour < 19) return 'afternoon'
  return 'evening'
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date - start) / 86400000)
}

// Seasonal phrases only on the day itself (`always`): a month-long season
// like October would otherwise repeat "spooky season" every single day.
function getSubtext(date, seasonsOff) {
  const bucket = getBucket(date.getHours())
  const dayItself = seasonsOff ? null : getActiveSeasons(date).find((s) => s.always)
  const variants = dayItself?.phrases?.[bucket] || SUBTEXT_VARIANTS[bucket]
  return variants[dayOfYear(date) % variants.length]
}

export default function GreetingBlock({ name }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const seasonsOff = useSeasonsOff()
  const badge = seasonsOff ? null : seasonBadge(now)

  return (
    <div>
      <h1
        className="font-semibold tracking-[-0.02em]"
        style={{
          fontSize: 42,
          backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.85) 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {getGreeting(now.getHours(), name)}
      </h1>
      <div className="mt-2 flex items-center gap-2.5">
        <p className="text-[14px] font-light text-[#888888]">{formatDate(now)}</p>
        {badge && (
          <span
            title={badge.label}
            className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] py-1 pl-2 pr-3 text-[11.5px] font-medium tracking-[0.01em] text-[#C4C4C4]"
          >
            <span className="flex items-center">
              {badge.colors.map((color, i) => (
                <span
                  key={color + i}
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: color,
                    marginLeft: i === 0 ? 0 : -3,
                    boxShadow: '0 0 0 1.5px #0A0A0A',
                  }}
                />
              ))}
            </span>
            {badge.label}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[13px] font-light text-[#666666]">{getSubtext(now, seasonsOff)}</p>
    </div>
  )
}
