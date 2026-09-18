import { useRef, useEffect } from 'react'
import { stageColor } from '../../lib/clientStages'
import { PlusIcon } from '../icons'
import ClientCard from './ClientCard'

export default function KanbanColumn({ stage, clients, users, registerRef, onOpenClient, onDropStage, resolveDropStage, justConvertedId, onAddOpportunity }) {
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
      <div className="mb-3 flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: stageColor(stage.id) }} />
            <span className="truncate text-[13px] font-medium text-[#F5F5F5]">{stage.label}</span>
          </div>
          {stage.description && <p className="mt-0.5 truncate text-[11px] text-[#666666]">{stage.description}</p>}
        </div>
        <span className="flex-shrink-0 text-[11px] text-[#444444]">{clients.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {clients.length === 0 ? (
          <button
            type="button"
            onClick={onAddOpportunity}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] py-8 text-[#444444] transition-colors duration-150 hover:border-white/[0.16] hover:text-[#666666]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.1]">
              <PlusIcon size={13} />
            </span>
            <span className="text-[12px]">Sin oportunidades en esta etapa.</span>
          </button>
        ) : (
          clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              users={users}
              onOpen={onOpenClient}
              onDropStage={onDropStage}
              resolveDropStage={resolveDropStage}
              justConverted={client.id === justConvertedId}
            />
          ))
        )}
        {clients.length > 0 && (
          <button
            type="button"
            onClick={onAddOpportunity}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-2.5 text-[12px] text-[#666666] transition-colors duration-150 hover:border-white/[0.16] hover:text-[#888888]"
          >
            <PlusIcon size={12} /> Añadir oportunidad
          </button>
        )}
      </div>
    </div>
  )
}
