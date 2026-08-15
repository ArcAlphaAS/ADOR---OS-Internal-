import { CalendarIcon, CheckCircleIcon } from '../icons'

function InfoCard({ Icon, iconColor, title, content }) {
  return (
    <div className="ador-glass ador-grain ador-card-hover rounded-2xl px-6 py-5">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color: iconColor, animation: 'ador-pulse 3s ease-in-out infinite' }} />
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          {title}
        </span>
      </div>
      <p className="mt-3 text-[14px] font-light text-[#888888]">{content}</p>
    </div>
  )
}

const meetingFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

export default function MeetingDecisionBlock({ upcomingMeeting, latestDecision }) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <InfoCard
        Icon={CalendarIcon}
        iconColor="#1E5FAD"
        title="Próxima Reunión"
        content={
          upcomingMeeting
            ? `${upcomingMeeting.title}${upcomingMeeting.clientName ? ` — ${upcomingMeeting.clientName}` : ''} — ${meetingFormatter.format(upcomingMeeting.startsAt.toDate())}`
            : 'Sin reuniones programadas'
        }
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
