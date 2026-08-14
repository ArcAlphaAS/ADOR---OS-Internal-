import { motion } from 'framer-motion'
import { firstName } from '../../lib/user'
import GreetingBlock from './GreetingBlock'
import MetricsBlock from './MetricsBlock'
import InterventionsBlock from './InterventionsBlock'
import MeetingDecisionBlock from './MeetingDecisionBlock'
import ActivityBlock from './ActivityBlock'
import QuickLinksBlock from './QuickLinksBlock'

export default function HomeScreen({ user, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex max-w-[1160px] flex-col gap-10 px-10 pb-16"
    >
      <GreetingBlock name={firstName(user)} />
      <MetricsBlock onNavigate={onNavigate} />
      <InterventionsBlock />
      <MeetingDecisionBlock />
      <ActivityBlock />
      <QuickLinksBlock />
    </motion.div>
  )
}
