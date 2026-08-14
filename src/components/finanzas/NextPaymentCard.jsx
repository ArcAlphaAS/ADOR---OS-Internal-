import { currencyPEN } from '../../lib/clientStages'

function formatDate(dateStr) {
  if (!dateStr) return 'Sin fecha definida'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long' })
}

// "What's coming in next, and who do we need to follow up with" — a real
// decision input, unlike a generic promo/upsell card.
export default function NextPaymentCard({ payment }) {
  return (
    <div className="ador-glass ador-grain rounded-[16px] px-6 py-5">
      <span
        className="font-medium text-[#444444]"
        style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        Próximo Cobro
      </span>

      {!payment ? (
        <p className="mt-5 text-center text-[13px] font-light text-[#444444]">Sin pagos pendientes</p>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-semibold text-[13px]"
            style={{ background: 'rgba(30,95,173,0.16)', color: '#1E5FAD' }}
          >
            {payment.clientName?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-[#F5F5F5]">{payment.clientName}</div>
            <div className="text-[11px] text-[#888888]">
              {payment.label} · {formatDate(payment.date)}
            </div>
          </div>
          <span className="flex-shrink-0 text-[14px] font-semibold text-[#F5F5F5]">
            {currencyPEN.format(payment.amount)}
          </span>
        </div>
      )}
    </div>
  )
}
