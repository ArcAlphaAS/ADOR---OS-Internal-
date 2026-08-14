import { useCallback, useRef } from 'react'
import { STAGES } from '../../lib/clientStages'
import KanbanColumn from './KanbanColumn'

export default function KanbanBoard({ clients, onOpenClient, onDropStage, justConvertedId }) {
  const columnRefs = useRef({})

  const registerRef = useCallback((stageId, el) => {
    columnRefs.current[stageId] = el
  }, [])

  const resolveDropStage = useCallback((x, y) => {
    for (const stageId of Object.keys(columnRefs.current)) {
      const el = columnRefs.current[stageId]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return stageId
      }
    }
    return null
  }, [])

  const byStage = STAGES.map((stage) => ({
    stage,
    items: clients.filter((c) => c.stage === stage.id),
  }))

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {byStage.map(({ stage, items }) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          clients={items}
          registerRef={registerRef}
          onOpenClient={onOpenClient}
          onDropStage={onDropStage}
          resolveDropStage={resolveDropStage}
          justConvertedId={justConvertedId}
        />
      ))}
    </div>
  )
}
