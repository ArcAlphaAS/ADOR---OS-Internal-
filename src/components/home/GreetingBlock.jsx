import { useEffect, useState } from 'react'

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

function getSubtext(date) {
  const variants = SUBTEXT_VARIANTS[getBucket(date.getHours())]
  return variants[dayOfYear(date) % variants.length]
}

export default function GreetingBlock({ name }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="pb-0 pt-16">
      <h1
        className="font-semibold tracking-[-0.02em]"
        style={{
          fontSize: 56,
          backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.85) 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {getGreeting(now.getHours(), name)}
      </h1>
      <p className="mt-2 text-[14px] font-light text-[#888888]">{formatDate(now)}</p>
      <p className="mt-0.5 text-[13px] font-light text-[#666666]">{getSubtext(now)}</p>
    </div>
  )
}
