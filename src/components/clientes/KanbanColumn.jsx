import { useRef, useEffect } from 'react'
import ClientCard from './ClientCard'

export default function KanbanColumn({ stage, clients, registerRef, onOpenClient, onDropStage, resolveDropStage, justConvertedId }) {
  const ref = useRef(null)

  useEffect(() => {
    registerRef(stage.id, ref.current)
    return () => registerRef(stage.id, null)
  }, [registerRef, stage.id])

  return (
    <div
      ref={ref}
      className="flex flex-shrink-0 flex-col rounded-2xl"
      style={{ width: 280, background: 'rgba(255,255,255,0.02)', padding: 16 }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[13px] font-medium text-[#F5F5F5]">{stage.label}</span>
        <span className="text-[11px] text-[#444444]">{clients.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {clients.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.06] py-8">
            <span className="text-[12px] text-[#444444]">Sin SPC en esta etapa</span>
          </div>
        ) : (
          clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onOpen={onOpenClient}
              onDropStage={onDropStage}
              resolveDropStage={resolveDropStage}
              justConverted={client.id === justConvertedId}
            />
          ))
        )}
      </div>
    </div>
  )
}
