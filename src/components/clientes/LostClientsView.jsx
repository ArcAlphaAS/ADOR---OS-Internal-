import { clientType, STAGES } from '../../lib/clientStages'
import { restoreClient } from '../../lib/firestore'

function formatDate(value) {
  const date = value?.toDate?.()
  if (!date) return '—'
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LostClientsView({ clients, onOpenClient, actorName }) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <div className="ador-skeleton h-[2px] w-1/4 rounded-full" />
        <p className="text-[14px] font-light text-[#444444]">Sin SPC/SP perdidos.</p>
      </div>
    )
  }

  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {['Organización', 'Etapa al perder', 'Razón', 'Fecha', ''].map((label) => (
              <th key={label} className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[#444444]">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const stage = STAGES.find((s) => s.id === client.stage)
            return (
              <tr
                key={client.id}
                onClick={() => onOpenClient(client)}
                className="group cursor-pointer border-b border-white/[0.04] transition-colors duration-150 hover:bg-white/[0.03]"
              >
                <td className="px-5 py-3">
                  <div className="text-[13px] font-medium text-[#F5F5F5]">{client.name}</div>
                  <div className="text-[11px] text-[#888888]">{clientType(client.stage)}</div>
                </td>
                <td className="px-5 py-3 text-[12px] text-[#888888]">{stage?.label || '—'}</td>
                <td className="px-5 py-3 text-[12px] text-[#E05252]">{client.lostReason}</td>
                <td className="px-5 py-3 text-[12px] text-[#888888]">{formatDate(client.lostAt)}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      restoreClient(client, actorName)
                    }}
                    className="rounded-full px-3 py-1 text-[11px] font-medium text-[#888888] opacity-0 transition-opacity duration-150 hover:text-[#F5F5F5] group-hover:opacity-100"
                  >
                    Restaurar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
