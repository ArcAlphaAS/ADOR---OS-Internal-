import { currencyPEN } from '../../lib/clientStages'
import CardHeader, { CARD_PAD, CARD_RADIUS } from '../home/CardHeader'

function dueLabel(date) {
  if (!date) return { text: 'Sin fecha', color: '#767676' }
  const days = Math.round((new Date(`${date}T00:00:00`) - new Date(new Date().toDateString())) / 86400000)
  if (days < 0) return { text: `Vencido hace ${-days} d`, color: '#EF5350' }
  if (days === 0) return { text: 'Vence hoy', color: '#E8C15A' }
  if (days === 1) return { text: 'Vence mañana', color: '#E8C15A' }
  return { text: `En ${days} días`, color: '#767676' }
}

// Who owes ADOR money and when it is due — the reference's "Upcoming
// payments", for what comes in. Clicking opens the Por cobrar drill-down.
export default function ProximosCobrosCard({ pendingPayments, onOpen }) {
  const shown = pendingPayments.slice(0, 5)
  return (
    <div className={`ador-glass ador-grain ${CARD_RADIUS} ${CARD_PAD}`}>
      <CardHeader label="Próximos cobros" count={pendingPayments.length || null} action={pendingPayments.length > 0 ? <button type="button" onClick={onOpen}>Ver todos</button> : null} />
      {shown.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-[#7A7A7A]">Nada pendiente de cobro. Todo al día.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {shown.map((p, i) => {
            const due = dueLabel(p.date)
            return (
              <li key={`${p.clientId}-${i}`}>
                <button type="button" onClick={onOpen} className="flex w-full items-center gap-3.5 py-3 text-left">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#2C2C2E] text-[13px] font-medium text-[#D9CFBF]">{(p.clientName || '?').charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-[#F0F0F0]">{p.clientName}</span>
                    <span className="block truncate text-[12px] text-[#767676]">{p.label}</span>
                  </span>
                  <span className="flex-shrink-0 text-right">
                    <span className="block text-[14px] font-medium tabular-nums text-[#F5F5F5]">{currencyPEN.format(p.amount)}</span>
                    <span className="block text-[11.5px]" style={{ color: due.color }}>{due.text}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
