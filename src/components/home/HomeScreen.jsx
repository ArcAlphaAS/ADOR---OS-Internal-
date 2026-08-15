import { motion } from 'framer-motion'
import { firstName } from '../../lib/user'
import { useHomeData } from '../../hooks/useHomeData'
import { useTodaysBirthdays } from '../../hooks/useTodaysBirthdays'
import BirthdayBanner from './BirthdayBanner'
import GreetingBlock from './GreetingBlock'
import MetricsBlock from './MetricsBlock'
import FinanceBlock from './FinanceBlock'
import TasksTodayBlock from './TasksTodayBlock'
import InterventionsBlock from './InterventionsBlock'
import MeetingDecisionBlock from './MeetingDecisionBlock'
import ActivityBlock from './ActivityBlock'
import QuickLinksBlock from './QuickLinksBlock'

// Orchestrates a staggered reveal instead of the whole page fading in as one
// block — each section settles in slightly after the last. Only opacity/y
// live on these wrapper divs (never on an .ador-glass element directly): see
// NotificationCenter.jsx for why combining `transform` with `backdrop-filter`
// on the same element breaks the blur in Chromium.
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

export default function HomeScreen({ user, onNavigate }) {
  const {
    pipelineSPCCount,
    activeSPCount,
    tasksTodayCount,
    tasksTodayRows,
    interventions,
    upcomingMeeting,
    latestDecision,
    revenueSeries,
    latestRevenueAmount,
    revenueChangePct,
  } = useHomeData(user?.uid)

  const birthdays = useTodaysBirthdays()

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-10 px-12 pb-16 pt-16"
    >
      <motion.div variants={itemVariants}>
        <BirthdayBanner birthdays={birthdays} currentUserId={user?.uid} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <GreetingBlock name={firstName(user)} />
      </motion.div>

      {/* Two-column "sections" layout (per reference dashboard shared by user,
          2026-08-14): left = chart-driven overview + its paired secondary
          cards, right = at-a-glance stats + a real data table underneath —
          mirrors "My Campaigns" + "Total Balance"/"Popular Campaigns". */}
      <div className="grid grid-cols-[1fr_1.3fr] items-start gap-6">
        <div className="flex flex-col gap-6">
          <motion.div variants={itemVariants}>
            <FinanceBlock
              latestRevenueAmount={latestRevenueAmount}
              revenueChangePct={revenueChangePct}
              revenueSeries={revenueSeries}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MeetingDecisionBlock upcomingMeeting={upcomingMeeting} latestDecision={latestDecision} />
          </motion.div>
        </div>

        <div className="flex flex-col gap-6">
          <motion.div variants={itemVariants}>
            <MetricsBlock
              onNavigate={onNavigate}
              pipelineSPCCount={pipelineSPCCount}
              activeSPCount={activeSPCount}
              tasksTodayCount={tasksTodayCount}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <TasksTodayBlock tasks={tasksTodayRows} />
          </motion.div>
        </div>
      </div>

      <motion.div variants={itemVariants}>
        <InterventionsBlock interventions={interventions} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <ActivityBlock />
      </motion.div>
      <motion.div variants={itemVariants}>
        <QuickLinksBlock />
      </motion.div>
    </motion.div>
  )
}
