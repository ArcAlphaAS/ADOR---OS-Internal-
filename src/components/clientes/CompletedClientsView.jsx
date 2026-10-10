import { allPayments, clientType, currencyPEN, serviceLabel } from '../../lib/clientStages'

function formatDate(value) {
  const date = value?.toDate?.()
  if (!date) return '—'
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Clients whose work is done (Completado). They keep their history and
// payments; "Nuevo servicio" brings one back to the pipeline.
export default function CompletedClientsView({ clients, services, onOpenClient, onContextClient, onNewService }) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <div className="ador-skeleton h-[2px] w-1/4 rounded-full" />
        <p className="text-[14px] font-light text-[#767676]">Todavía no hay clientes completados.</p>
      </div>
    )
  }

  return (
    <div className="ador-glass ador-grain overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {['Organización', 'Servicio', 'Completado', 'Cobrado', 'Ciclos', ''].map((label) => (
              <th key={label} className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[#767676]">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const received = allPayments(client)
              .filter((p) => p.payment?.status === 'Recibido')
              .reduce((sum, p) => sum + (Number(p.payment.amount) || 0), 0)
            const cycles = (client.serviceHistory?.length || 0) + 1
            return (
              <tr
                key={client.id}
                onClick={() => onOpenClient(client)}
                onContextMenu={(e) => {
                  if (!onContextClient) return
                  e.preventDefault()
                  onContextClient(client, e.clientX, e.clientY)
                }}
                className="group cursor-pointer border-b border-white/[0.04] transition-colors duration-150 hover:bg-white/[0.03]"
              >
                <td className="px-5 py-3">
                  <div className="text-[13px] font-medium text-[#F5F5F5]">{client.name}</div>
                  <div className="text-[11px] text-[#888888]">{clientType(client.stage)}{client.code ? ` · ${client.code}` : ''}</div>
                </td>
                <td className="px-5 py-3 text-[12px] text-[#C8C8C8]">{serviceLabel(client.serviceType, services)}</td>
                <td className="px-5 py-3 text-[12px] text-[#888888]">{formatDate(client.completedAt)}</td>
                <td className="px-5 py-3 text-[12px] text-[#C8C8C8]">{received ? currencyPEN.format(received) : '—'}</td>
                <td className="px-5 py-3 text-[12px] text-[#888888]">{cycles}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onNewService(client)
                    }}
                    className="rounded-full border border-white/[0.14] px-3 py-1 text-[11.5px] font-medium text-[#F5F5F5] transition-colors hover:bg-white/10"
                  >
                    Nuevo servicio
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
