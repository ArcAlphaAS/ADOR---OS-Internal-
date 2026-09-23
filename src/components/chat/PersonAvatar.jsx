import { createContext, useContext } from 'react'
import { presenceOf, userLabel } from '../../lib/chat'

// Who's who, shared by every avatar inside Comunicación without threading
// users/directory/presence through each component. Provided once by
// ChatModule.jsx.
export const ChatPeopleContext = createContext({ users: [], directory: [], presence: {} })

export function usePerson(uid) {
  const { users, directory, presence } = useContext(ChatPeopleContext)
  const user = uid ? users.find((u) => u.id === uid) : null
  const entry = uid ? directory.find((p) => p.linkedUserId === uid) : null
  return {
    name: entry?.name || (user ? userLabel(user) : null),
    // Directorio photo first (curated), then the one on the account profile.
    photo: entry?.photoDataUrl || user?.photoDataUrl || null,
    presence: uid ? presence[uid] : null,
  }
}

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

// Every face in the chat. Real photo when there is one (Directorio or the
// person's own profile); otherwise initials on a warm graphite disc that
// belongs to the chat's graphite-and-gold palette (the shell's blue
// fallback clashed with it). `showPresence` adds the status dot: green en
// línea, amber ausente, red no molestar, violet en reunión.
export default function PersonAvatar({ uid, name, size = 28, showPresence = false, photo: photoOverride }) {
  const person = usePerson(uid)
  const label = person.name || name || '?'
  const photo = photoOverride || person.photo
  const dot = showPresence ? presenceOf(person.presence) : null

  return (
    <span className="relative inline-flex flex-shrink-0" title={dot ? `${label} · ${dot.label}` : undefined}>
      {photo ? (
        <img src={photo} alt="" referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />
      ) : (
        <span
          className="flex items-center justify-center rounded-full font-medium"
          style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38), background: '#26231E', color: '#D9CFBF', boxShadow: 'inset 0 0 0 1px rgba(232,193,90,0.14)' }}
        >
          {initials(label)}
        </span>
      )}
      {dot?.color && (
        <span
          className="absolute rounded-full ring-2 ring-[#0A0A0A]"
          style={{ background: dot.color, width: Math.max(7, size * 0.3), height: Math.max(7, size * 0.3), right: -1, bottom: -1 }}
        />
      )}
    </span>
  )
}
