import { useEffect, useMemo, useState } from 'react'
import { subscribeTaskAlerts, markTaskAlertRead } from '../lib/firestore'

// Bell items for @mentions and comments on tasks you're on (`taskAlerts`,
// written by addTaskComment). Clicking one opens the task and marks it read;
// opening the task any other way clears them too (TaskComments).
export function useTaskAlerts(uid, onNavigate) {
  const [alerts, setAlerts] = useState([])
  useEffect(() => {
    if (!uid || uid === 'preview') return
    return subscribeTaskAlerts(uid, setAlerts)
  }, [uid])
  return useMemo(
    () =>
      alerts
        .map((a) => ({
          key: `taskalert:${a.id}`,
          at: a.createdAt?.toMillis?.() || 0,
          text: a.kind === 'mention' ? `@ ${a.fromName} te mencionó en “${a.taskTitle}”` : `💬 ${a.fromName} comentó en “${a.taskTitle}”`,
          time: '',
          onClick: () => {
            markTaskAlertRead(a.id).catch(() => {})
            onNavigate?.('workspace', { type: 'task', id: a.taskId })
          },
        }))
        .sort((x, y) => y.at - x.at),
    [alerts, onNavigate]
  )
}
