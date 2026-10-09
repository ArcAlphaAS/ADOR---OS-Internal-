import { motion } from 'framer-motion'
import { firstName } from '../../lib/user'
import { useHomeData } from '../../hooks/useHomeData'
import { useFinanceData } from '../../hooks/useFinanceData'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import GreetingBlock from './GreetingBlock'
import TuDiaCard from './TuDiaCard'
import AttentionCard from './AttentionCard'
import WeeklySummaryCard from './WeeklySummaryCard'
import FinanceBlock from './FinanceBlock'
import InterventionsBlock from './InterventionsBlock'
import LatestNewsCard from './LatestNewsCard'
import CommunityCard from './CommunityCard'
import HomePeople from './HomePeople'

// Orchestrates a staggered reveal instead of the whole page fading in as one
// block — each section settles in slightly after the last. Only opacity/y
// live on these wrapper divs (never on an .ador-glass element directly): see
// NotificationCenter.jsx for why combining `transform` with `backdrop-filter`
// on the same element breaks the blur in Chromium.
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}
// Inicio asks Google Calendar for the next two weeks (not the current
// week) so "Próxima reunión" still finds something on a Friday afternoon.
const nextTwoWeeks = () => {
  const start = new Date()
  const end = new Date(start.getTime() + 14 * 86400000)
  return { start, end }
}

// The next thing on your calendar: a meeting with other guests if there is
// one, otherwise your next timed event. All-day events (holidays,
// "vacaciones") aren't meetings. One that already started but hasn't ended
// counts — it shows as "ahora".
function pickNextMeeting(events) {
  const now = Date.now()
  const timed = events
    .filter((e) => !e.allDay && e.end && new Date(e.end).getTime() > now)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
  const e = timed.find((x) => x.isMeeting) || timed[0]
  if (!e) return null
  return { title: e.title, start: new Date(e.start), inProgress: new Date(e.start).getTime() <= now, isMeeting: e.isMeeting, link: e.htmlLink }
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
}

export default function HomeScreen({ user, onNavigate }) {
  const { interventions } = useHomeData(user?.uid)
  // Same numbers as Finanzas (client payments + manual incomes).
  const finance = useFinanceData()
  const calendar = useGoogleCalendar(user?.uid, { initialRange: nextTwoWeeks })
  const nextMeeting = calendar.status === 'ready' ? pickNextMeeting(calendar.events) : null

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:gap-10 lg:px-12 lg:pt-16"
    >
      <motion.div variants={itemVariants}>
        <GreetingBlock name={firstName(user)} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <TuDiaCard user={user} nextMeeting={nextMeeting} calendarStatus={calendar.status} onNavigate={onNavigate} />
      </motion.div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
        <motion.div variants={itemVariants}>
          <AttentionCard finance={finance} uid={user?.uid} onNavigate={onNavigate} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <WeeklySummaryCard />
        </motion.div>
      </div>

      <HomePeople>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
          <motion.div variants={itemVariants}>
            <LatestNewsCard uid={user?.uid} onNavigate={onNavigate} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <CommunityCard user={user} onNavigate={onNavigate} />
          </motion.div>
        </div>
      </HomePeople>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_1.3fr] lg:gap-8">
        <motion.div variants={itemVariants}>
          <FinanceBlock
            hasData={finance.movements.length > 0}
            ingresosDelMes={finance.ingresosDelMes}
            ingresosDeltaPct={finance.ingresosDeltaPct}
            series={finance.series}
            onOpen={() => onNavigate?.('finanzas')}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <InterventionsBlock interventions={interventions} />
        </motion.div>
      </div>
    </motion.div>
  )
}
