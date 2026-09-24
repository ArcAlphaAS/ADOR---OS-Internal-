import { CalendarIcon, CheckCircleIcon } from '../icons'

function InfoCard({ Icon, iconColor, title, content, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="ador-glass ador-grain ador-card-hover block w-full rounded-2xl px-6 py-5 text-left">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color: iconColor, animation: 'ador-pulse 3s ease-in-out infinite' }} />
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          {title}
        </span>
      </div>
      <div className="mt-3 text-[14px] font-light text-[#888888]">{content}</div>
    </Tag>
  )
}

const meetingFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

// Próxima reunión reads your own Google Calendar (the same connection as
// Calendario). Not connected → an invitation to connect instead of a
// permanent "sin reuniones" that could never change.
function meetingContent(meeting, status) {
  if (status === 'disconnected' || status === 'needsReconnect') return 'Conecta tu Google Calendar para verla aquí →'
  if (status === 'checking' || status === 'loading' || status === 'connecting') return 'Buscando en tu calendario…'
  if (status === 'error') return 'No se pudo leer tu calendario — ábrelo para reintentar.'
  if (!meeting) return 'Nada en tu calendario las próximas dos semanas'
  return (
    <>
      <span className="block truncate font-normal text-[#DDDDDD]">{meeting.title}</span>
      <span className="block text-[13px]" style={{ color: meeting.inProgress ? '#4CAF50' : '#888888' }}>
        {meeting.inProgress ? 'Ahora — en curso' : meetingFormatter.format(meeting.start)}
      </span>
    </>
  )
}

export default function MeetingDecisionBlock({ meeting, calendarStatus, onOpenCalendar, latestDecision }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
      <InfoCard
        Icon={CalendarIcon}
        iconColor="#1E5FAD"
        title={meeting && !meeting.isMeeting ? 'Próximo evento' : 'Próxima Reunión'}
        content={meetingContent(meeting, calendarStatus)}
        onClick={onOpenCalendar}
      />
      <InfoCard
        Icon={CheckCircleIcon}
        iconColor="#B8860B"
        title="Última Decisión"
        content={
          latestDecision
            ? `${latestDecision.title}${latestDecision.clientName ? ` — ${latestDecision.clientName}` : ''}`
            : 'Sin decisiones registradas'
        }
      />
    </div>
  )
}
