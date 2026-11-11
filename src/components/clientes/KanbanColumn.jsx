import { useRef, useEffect } from 'react'
import { stageColor } from '../../lib/clientStages'
import { PlusIcon } from '../icons'
import ClientCard from './ClientCard'

export default function KanbanColumn({ stage, clients, users, registerRef, onOpenClient, onContextClient, onDropStage, resolveDropStage, justConvertedId, onAddOpportunity, highlight, dragging, onDragHover, actorName }) {
  const ref = useRef(null)

  useEffect(() => {
    registerRef(stage.id, ref.current)
    return () => registerRef(stage.id, null)
  }, [registerRef, stage.id])

  return (
    <div
      ref={ref}
      className="flex flex-shrink-0 flex-col rounded-2xl transition-all duration-200"
      style={{
        width: 280,
        padding: 16,
        background: highlight ? 'rgba(244,238,226,0.07)' : 'rgba(255,255,255,0.02)',
        boxShadow: highlight ? 'inset 0 0 0 1.5px rgba(244,238,226,0.35)' : 'none',
        opacity: dragging && !highlight ? 0.72 : 1,
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: stageColor(stage.id) }} />
            <span className="truncate text-[13px] font-medium text-[#F5F5F5]">{stage.label}</span>
          </div>
          {stage.description && <p className="mt-0.5 truncate text-[11px] text-[#8A8A8A]">{stage.description}</p>}
        </div>
        <span className="flex-shrink-0 text-[11px] text-[#8A8A8A]">{clients.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {clients.length === 0 ? (
          <button
            type="button"
            onClick={onAddOpportunity}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] py-8 text-[#8A8A8A] transition-colors duration-150 hover:border-white/[0.16] hover:text-[#8A8A8A]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.1]">
              <PlusIcon size={13} />
            </span>
            <span className="px-3 text-center text-[12px] leading-snug">{stage.type === 'SP' ? 'Aquí aparecen los SP cuando una oportunidad pasa a Intervención Activa.' : `${stage.description}. Arrastra una oportunidad aquí o añade una nueva.`}</span>
          </button>
        ) : (
          clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              users={users}
              onOpen={onOpenClient}
              onContext={onContextClient}
              onDropStage={onDropStage}
              resolveDropStage={resolveDropStage}
              justConverted={client.id === justConvertedId}
              onDragHover={onDragHover}
              actorName={actorName}
            />
          ))
        )}
        {clients.length > 0 && (
          <button
            type="button"
            onClick={onAddOpportunity}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-2.5 text-[12px] text-[#8A8A8A] transition-colors duration-150 hover:border-white/[0.16] hover:text-[#888888]"
          >
            <PlusIcon size={12} /> Añadir oportunidad
          </button>
        )}
      </div>
    </div>
  )
}
