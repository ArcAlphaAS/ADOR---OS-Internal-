import { statusMeta } from '../../lib/directorio'
import Avatar from '../shell/Avatar'
import { MailIcon, PinIcon, ClockIcon, CloseIcon, EditIcon } from '../icons'

// The right-column detail shown when a person is selected — deliberately
// truncated at "Áreas de responsabilidad" per direct instruction: the
// reference image this was adapted from also had "Reporta a"/"Trabaja con"/
// "Proyectos activos"/"Objetivos" below that, but none of those have a real
// data source yet (no team-membership graph, no project-assignment link),
// so showing them would mean fabricating numbers — cut for now rather than
// faked. Revisit once Equipos/roles has a real assignment model.
export default function PersonDetailPanel({ person, onClose, onEdit }) {
  const meta = statusMeta(person.status)

  return (
    <div className="ador-glass ador-grain rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: `${meta.color}22`, color: meta.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]">
            <EditIcon size={14} />
          </button>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]">
            <CloseIcon size={14} />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <Avatar photoURL={person.photoDataUrl} displayName={person.name} size={64} />
        <h3 className="mt-3 text-[17px] font-semibold text-[#F5F5F5]">{person.name}</h3>
        <p className="text-[13px] text-[#888888]">{person.role}</p>
        {person.quote && <p className="mt-2 text-[12px] italic text-[#666666]">"{person.quote}"</p>}
      </div>

      {(person.email || person.location || person.timezone) && (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-white/[0.06] pt-4">
          {person.email && (
            <div className="flex items-center gap-2 text-[12px] text-[#888888]">
              <MailIcon size={13} className="text-[#444444]" /> {person.email}
            </div>
          )}
          {person.location && (
            <div className="flex items-center gap-2 text-[12px] text-[#888888]">
              <PinIcon size={13} className="text-[#444444]" /> {person.location}
            </div>
          )}
          {person.timezone && (
            <div className="flex items-center gap-2 text-[12px] text-[#888888]">
              <ClockIcon size={13} className="text-[#444444]" /> {person.timezone}
            </div>
          )}
        </div>
      )}

      {person.about && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="mb-1.5 font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Sobre mí
          </p>
          <p className="text-[13px] leading-relaxed text-[#888888]">{person.about}</p>
        </div>
      )}

      {person.tags?.length > 0 && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="mb-2 font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Áreas de responsabilidad
          </p>
          <div className="flex flex-wrap gap-1.5">
            {person.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-[#F5F5F5]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
