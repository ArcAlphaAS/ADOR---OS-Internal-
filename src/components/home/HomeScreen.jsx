import { motion } from 'framer-motion'
import { firstName } from '../../lib/user'
import { useHomeData } from '../../hooks/useHomeData'
import GreetingBlock from './GreetingBlock'
import MetricsBlock from './MetricsBlock'
import InterventionsBlock from './InterventionsBlock'
import MeetingDecisionBlock from './MeetingDecisionBlock'
import ActivityBlock from './ActivityBlock'
import QuickLinksBlock from './QuickLinksBlock'

export default function HomeScreen({ user, onNavigate }) {
  const {
    activeClientsCount,
    activeInterventionsCount,
    tasksTodayCount,
    interventions,
    upcomingMeeting,
    latestDecision,
  } = useHomeData(user?.uid)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-10 px-12 pb-16"
    >
      <GreetingBlock name={firstName(user)} />
      <MetricsBlock
        onNavigate={onNavigate}
        activeClientsCount={activeClientsCount}
        activeInterventionsCount={activeInterventionsCount}
        tasksTodayCount={tasksTodayCount}
      />
      <InterventionsBlock interventions={interventions} />
      <MeetingDecisionBlock upcomingMeeting={upcomingMeeting} latestDecision={latestDecision} />
      <ActivityBlock />
      <QuickLinksBlock />
    </motion.div>
  )
}
