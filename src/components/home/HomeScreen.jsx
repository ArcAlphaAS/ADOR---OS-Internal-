import { motion } from 'framer-motion'
import { firstName } from '../../lib/user'
import { useHomeData } from '../../hooks/useHomeData'
import GreetingBlock from './GreetingBlock'
import MetricsBlock from './MetricsBlock'
import FinanceBlock from './FinanceBlock'
import TasksTodayBlock from './TasksTodayBlock'
import InterventionsBlock from './InterventionsBlock'
import MeetingDecisionBlock from './MeetingDecisionBlock'
import ActivityBlock from './ActivityBlock'
import QuickLinksBlock from './QuickLinksBlock'

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-10 px-12 pb-16"
    >
      <GreetingBlock name={firstName(user)} />

      {/* Two-column "sections" layout (per reference dashboard shared by user,
          2026-08-14): left = chart-driven overview + its paired secondary
          cards, right = at-a-glance stats + a real data table underneath —
          mirrors "My Campaigns" + "Total Balance"/"Popular Campaigns". */}
      <div className="grid grid-cols-[1fr_1.3fr] items-start gap-6">
        <div className="flex flex-col gap-6">
          <FinanceBlock
            latestRevenueAmount={latestRevenueAmount}
            revenueChangePct={revenueChangePct}
            revenueSeries={revenueSeries}
          />
          <MeetingDecisionBlock upcomingMeeting={upcomingMeeting} latestDecision={latestDecision} />
        </div>

        <div className="flex flex-col gap-6">
          <MetricsBlock
            onNavigate={onNavigate}
            pipelineSPCCount={pipelineSPCCount}
            activeSPCount={activeSPCount}
            tasksTodayCount={tasksTodayCount}
          />
          <TasksTodayBlock tasks={tasksTodayRows} />
        </div>
      </div>

      <InterventionsBlock interventions={interventions} />
      <ActivityBlock />
      <QuickLinksBlock />
    </motion.div>
  )
}
