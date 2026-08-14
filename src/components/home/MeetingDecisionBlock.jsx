import { CalendarIcon, CheckCircleIcon } from '../icons'

function InfoCard({ Icon, iconColor, title, content }) {
  return (
    <div className="ador-glass ador-grain rounded-2xl px-6 py-5">
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

export default function MeetingDecisionBlock() {
  return (
    <div className="grid grid-cols-2 gap-5">
      <InfoCard
        Icon={CalendarIcon}
        iconColor="#1E5FAD"
        title="Próxima Reunión"
        content="Sin reuniones programadas"
      />
      <InfoCard
        Icon={CheckCircleIcon}
        iconColor="#B8860B"
        title="Última Decisión"
        content="Sin decisiones registradas"
      />
    </div>
  )
}
