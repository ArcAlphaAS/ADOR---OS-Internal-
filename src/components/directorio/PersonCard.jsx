import { statusMeta } from '../../lib/directorio'
import Avatar from '../shell/Avatar'

// The large "Dirección" card — photo, live status, name, role, and their
// tags (free-text areas of focus, not a single `area` — a director's remit
// usually spans more than one, unlike a regular Equipo row's single Área
// column). Reused nowhere else on purpose: Equipo intentionally reads as a
// denser table, not a second row of these same big cards.
export default function PersonCard({ person, selected, onClick }) {
  const meta = statusMeta(person.status)

  return (
    <button
      type="button"
      onClick={onClick}
      className="ador-glass ador-grain flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition-colors duration-150 hover:bg-white/[0.04]"
      style={selected ? { boxShadow: '0 0 0 1.5px #1E5FAD' } : undefined}
    >
      <Avatar photoURL={person.photoDataUrl} displayName={person.name} size={56} />
      <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: meta.color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
        {meta.label}
      </div>
      <div>
        <p className="text-[15px] font-semibold text-[#F5F5F5]">{person.name}</p>
        <p className="text-[13px] text-[#888888]">{person.role}</p>
      </div>
      {person.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {person.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-[#888888]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}
