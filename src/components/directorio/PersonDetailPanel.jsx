import { statusMeta, nextOccurrence, dayMonthLabel, tenureLabel } from '../../lib/directorio'
import Avatar from '../shell/Avatar'
import { MailIcon, PinIcon, ClockIcon, CloseIcon, EditIcon } from '../icons'
import { resendAccessEmail } from '../../lib/invite'
import { useToast } from '../../hooks/useToast'

// The right-column detail shown when a person is selected — deliberately
// truncated at "Áreas de responsabilidad" per direct instruction: the
// reference image this was adapted from also had "Reporta a"/"Trabaja con"/
// "Proyectos activos"/"Objetivos" below that, but none of those have a real
// data source yet (no team-membership graph, no project-assignment link),
// so showing them would mean fabricating numbers — cut for now rather than
// faked. Revisit once Equipos/roles has a real assignment model.
export default function PersonDetailPanel({ person, people = [], onClose, onEdit, onMessage }) {
  const meta = statusMeta(person.status)
  const showToast = useToast()
  const resend = () => resendAccessEmail(person.email).then(() => showToast(`Invitación reenviada a ${person.email}.`)).catch((e) => showToast(`No se pudo reenviar: ${e.message}`))
  const boss = people.find((p) => p.id === person.reportsTo)
  const directs = people.filter((p) => p.reportsTo === person.id)
  const bday = nextOccurrence(person.birthday)
  const anniv = nextOccurrence(person.startDate)
  const tenure = tenureLabel(person.startDate)
  const account = person.noAccess ? null : person.invited ? { label: 'Invitado — aún no ha entrado', color: '#E8C15A' } : person.linkedUserId ? { label: 'Tiene acceso a ADOR OS', color: '#4CAF50' } : { label: 'Solo ficha — sin cuenta en ADOR OS', color: '#8A8A8A' }

  return (
    <div className="ador-glass ador-grain rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: `${meta.color}22`, color: meta.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button type="button" onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]">
              <EditIcon size={14} />
            </button>
          )}
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]">
            <CloseIcon size={14} />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <Avatar photoURL={person.photoDataUrl} displayName={person.name} size={64} />
        <h3 className="mt-3 text-[17px] font-semibold text-[#F5F5F5]">{person.name}</h3>
        <p className="text-[13px] text-[#888888]">{person.role}</p>
        {person.noAccess && (
          <p className="mt-2 rounded-lg bg-[#EF5350]/10 px-2.5 py-1.5 text-[12px] leading-snug text-[#EF9A98]">
            Su cuenta ya no tiene acceso a ADOR OS. Si esta persona salió del equipo, puedes eliminar su ficha desde el menú de la tabla.
          </p>
        )}
        {account && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px]" style={{ color: account.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: account.color }} /> {account.label}
          </p>
        )}
        {person.invited && onEdit && person.email && (
          <button type="button" onClick={resend} className="mt-2 rounded-full bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-[#F5F5F5] hover:bg-white/[0.14]">Reenviar invitación</button>
        )}
        {person.quote && <p className="mt-2 text-[12px] italic text-[#8A8A8A]">"{person.quote}"</p>}
      </div>

      {onMessage && person.linkedUserId && !person.noAccess && (
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onMessage} className="ador-btn-primary flex-1 rounded-full py-2 text-[13px] font-medium">Escribirle</button>
          {person.email && <button type="button" onClick={() => navigator.clipboard?.writeText(person.email)} className="rounded-full bg-white/[0.08] px-4 py-2 text-[12.5px] text-[#F5F5F5] hover:bg-white/[0.14]">Copiar correo</button>}
        </div>
      )}

      {(boss || directs.length > 0) && (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-white/[0.06] pt-4 text-[12.5px] text-[#888888]">
          {boss && <p>Reporta a <span className="font-medium text-[#F5F5F5]">{boss.name}</span></p>}
          {directs.length > 0 && <p>{directs.length === 1 ? '1 persona a su cargo' : `${directs.length} personas a su cargo`}: <span className="text-[#B5B5B5]">{directs.map((d) => d.name.split(' ')[0]).join(', ')}</span></p>}
        </div>
      )}

      {(bday || anniv || tenure) && (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-white/[0.06] pt-4 text-[12.5px] text-[#888888]">
          {tenure && <p>{tenure}</p>}
          {bday && <p>🎂 Cumple el {dayMonthLabel(bday.date)}{bday.days === 0 ? ' — ¡hoy!' : bday.days <= 30 ? ` · en ${bday.days} días` : ''}</p>}
          {anniv && anniv.years >= 1 && anniv.days <= 60 && <p>✨ {anniv.years} {anniv.years === 1 ? 'año' : 'años'} en ADOR {anniv.days === 0 ? 'hoy' : `en ${anniv.days} días`}</p>}
        </div>
      )}

      {(person.email || person.location || person.timezone) && (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-white/[0.06] pt-4">
          {person.email && (
            <div className="flex items-center gap-2 text-[12px] text-[#888888]">
              <MailIcon size={13} className="text-[#8A8A8A]" /> {person.email}
            </div>
          )}
          {person.location && (
            <div className="flex items-center gap-2 text-[12px] text-[#888888]">
              <PinIcon size={13} className="text-[#8A8A8A]" /> {person.location}
            </div>
          )}
          {person.timezone && (
            <div className="flex items-center gap-2 text-[12px] text-[#888888]">
              <ClockIcon size={13} className="text-[#8A8A8A]" /> {person.timezone}
            </div>
          )}
        </div>
      )}

      {person.about && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="mb-1.5 font-medium text-[#8A8A8A]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Sobre mí
          </p>
          <p className="text-[13px] leading-relaxed text-[#888888]">{person.about}</p>
        </div>
      )}

      {person.tags?.length > 0 && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="mb-2 font-medium text-[#8A8A8A]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
