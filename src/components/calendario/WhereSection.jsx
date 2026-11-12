import { useState } from 'react'

// "¿Cómo se reúnen?": Google Meet, Discord, presencial u otro enlace. Es la forma de decir dónde
// es un evento sin tener que saber qué escribir en un campo de "lugar": eliges una opción y
// solo se pide lo que esa opción necesita. Se guarda en el campo "lugar" del evento de Google
// (Meet crea su propio enlace), así que se ve igual en cualquier calendario.
export const MODES = [
  { id: 'meet', label: 'Google Meet', icon: <><rect x="3" y="6" width="13" height="12" rx="2.5" /><path d="M16 10.5l5-3v9l-5-3z" /></> },
  { id: 'discord', label: 'Discord', icon: <><path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v7a3.5 3.5 0 0 1-3.5 3.5H12l-4 3.5V17a3.5 3.5 0 0 1-3-3.5z" /><circle cx="9.5" cy="10" r="1" fill="currentColor" /><circle cx="14.5" cy="10" r="1" fill="currentColor" /></> },
  { id: 'presencial', label: 'Presencial', icon: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></> },
  { id: 'enlace', label: 'Otro enlace', icon: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></> },
]
export const DISCORD_DEFAULT = 'canal oficial de ADOR'

// Lugares presenciales que ya usaron: los de tus eventos recientes y los que guardó este navegador.
const PLACES_KEY = 'ador_places'
export function rememberedPlaces(events = []) {
  let saved = []
  try { saved = JSON.parse(localStorage.getItem(PLACES_KEY) || '[]') } catch { saved = [] }
  const fromEvents = [...events]
    .sort((a, b) => new Date(b.start) - new Date(a.start))
    .map((e) => (e.location || '').trim())
    .filter((l) => l && !/^discord\b/i.test(l) && !/^https?:\/\//i.test(l) && l.length <= 80)
  const seen = new Set()
  return [...saved, ...fromEvents].filter((l) => { const k = l.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 5)
}
export function savePlace(place) {
  const v = (place || '').trim()
  if (!v) return
  try {
    const cur = JSON.parse(localStorage.getItem(PLACES_KEY) || '[]').filter((x) => x.toLowerCase() !== v.toLowerCase())
    localStorage.setItem(PLACES_KEY, JSON.stringify([v, ...cur].slice(0, 8)))
  } catch { /* sin almacenamiento */ }
}
export const mapsUrl = (place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`

// A partir de un evento que ya existe, deduce cómo se reúnen.
export function modeFromEvent(ev, wantsMeet) {
  const loc = (ev?.location || '').trim()
  if (ev?.meetLink || wantsMeet) return 'meet'
  if (/^discord\b/i.test(loc)) return 'discord'
  if (/^https?:\/\//i.test(loc)) return 'enlace'
  return loc ? 'presencial' : 'none'
}
export function discordChannelOf(loc) {
  const rest = (loc || '').replace(/^discord\s*[·\-–:]?\s*/i, '').trim()
  return rest.toLowerCase() === DISCORD_DEFAULT.toLowerCase() ? '' : rest
}
// Lo que se guarda en el campo "lugar" del evento.
export function locationFor({ mode, place, channel, fallback }) {
  if (mode === 'discord') return `Discord · ${channel.trim() || DISCORD_DEFAULT}`
  if (mode === 'presencial' || mode === 'enlace') return place.trim()
  if (mode === 'meet') return fallback || ''
  return ''
}

export default function WhereSection({ mode, setMode, place, setPlace, channel, setChannel, hasMeetLink, phone, suggestions = [] }) {
  const [picked, setPicked] = useState(false) // solo se enfoca el campo si lo acabas de elegir tú
  const pick = (id) => { setPicked(true); setMode((cur) => (cur === id ? 'none' : id)) }
  const chip = (m) => {
    const on = mode === m.id
    return (
      <button
        key={m.id}
        type="button"
        onClick={() => pick(m.id)}
        aria-pressed={on}
        className={`flex flex-shrink-0 items-center gap-2 rounded-full transition-colors ${phone ? 'px-4 py-2.5 text-[14.5px]' : 'px-3.5 py-2 text-[13px]'}`}
        style={on ? { background: '#F5F5F5', color: '#0A0A0A', fontWeight: 600 } : { background: 'rgba(255,255,255,0.07)', color: '#D0D0D0' }}
      >
        <svg width={phone ? 18 : 16} height={phone ? 18 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{m.icon}</svg>
        {m.label}
      </button>
    )
  }
  const field = `w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 ${phone ? 'py-3 text-[16px]' : 'py-2.5 text-[13.5px]'} text-[#F5F5F5] placeholder:text-[#767676] outline-none transition-colors focus:border-white/[0.22]`
  const note = `mt-3 ${phone ? 'text-[13.5px]' : 'text-[12.5px]'} leading-snug text-[#8A8A8A]`
  return (
    <div>
      <div className={`flex gap-2 ${phone ? 'flex-wrap' : 'flex-wrap'}`}>{MODES.map(chip)}</div>
      {mode === 'meet' && (
        <p className={note}>{hasMeetLink ? '✓ Este evento ya tiene su enlace de Google Meet.' : 'Se crea un enlace de Google Meet al guardar y se agrega a la invitación.'}</p>
      )}
      {mode === 'discord' && (
        <div className="mt-3">
          <p className={`${note} !mt-0 mb-2`}>La reunión es por Discord, en el canal oficial de ADOR. Todos ya saben dónde entrar.</p>
          <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Sala o canal de voz (opcional)" className={field} />
        </div>
      )}
      {mode === 'presencial' && (
        <div className="mt-3">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A8A]" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
            <input value={place} onChange={(e) => setPlace(e.target.value)} autoFocus={picked} placeholder="¿Dónde será? Oficina, dirección o sala" className={`${field} !pl-10`} />
          </div>
          {suggestions.length > 0 && place.trim().toLowerCase() !== suggestions[0].toLowerCase() && (
            <div className="mt-2.5">
              <p className={`mb-1.5 ${phone ? 'text-[12.5px]' : 'text-[11.5px]'} text-[#767676]`}>Lugares anteriores</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.filter((x) => x.toLowerCase() !== place.trim().toLowerCase()).map((x) => (
                  <button key={x} type="button" onClick={() => setPlace(x)} className={`max-w-full truncate rounded-full bg-white/[0.07] ${phone ? 'px-3.5 py-2 text-[14px]' : 'px-3 py-1.5 text-[12.5px]'} text-[#D0D0D0] transition-colors hover:bg-white/[0.12]`}>{x}</button>
                ))}
              </div>
            </div>
          )}
          {place.trim().length >= 3 && (
            <a href={mapsUrl(place.trim())} target="_blank" rel="noreferrer" className={`mt-2.5 inline-flex items-center gap-1.5 ${phone ? 'text-[14px]' : 'text-[12.5px]'} font-medium text-[#F4EEE2] hover:underline`}>
              Ver en Google Maps
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9" /></svg>
            </a>
          )}
        </div>
      )}
      {mode === 'enlace' && (
        <div className="mt-3">
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Pega el enlace (Zoom, Teams…)" inputMode="url" autoCapitalize="none" autoCorrect="off" className={field} />
        </div>
      )}
      {mode === 'none' && <p className={note}>Elige cómo se reúnen. Si lo dejas sin elegir, el evento queda sin lugar.</p>}
    </div>
  )
}
