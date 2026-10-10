import { currencyPEN, contractStatus } from '../../lib/clientStages'
import CardHeader, { CARD_PAD, CARD_RADIUS } from '../home/CardHeader'

const card = `ador-glass ador-grain ${CARD_RADIUS} ${CARD_PAD}`
const money = (n) => currencyPEN.format(Math.round(n))
const PERIOD_MONTHS = { mes: 1, trimestre: 3, anio: 12 }

// ───────────────────────── Ingreso recurrente ─────────────────────────
// What comes in on a schedule: contracts and subscriptions with active
// billing, converted to a monthly figure. The number that tells you how much
// of the company's income is predictable.
export function IngresoRecurrenteCard({ clients, onNavigate }) {
  const recurring = clients
    .filter((c) => c.billing?.active && (c.billing.modality === 'contrato' || c.billing.modality === 'suscripcion') && !c.completed && !c.lost)
    .map((c) => {
      const months = PERIOD_MONTHS[c.billing.every] || 1
      return { client: c, monthly: (Number(c.billing.amount) || 0) / months, status: contractStatus(c) }
    })
    .sort((a, b) => b.monthly - a.monthly)
  const mrr = recurring.reduce((s, r) => s + r.monthly, 0)
  const renewals = recurring.filter((r) => r.status && r.status.days !== null).sort((a, b) => a.status.days - b.status.days)
  const next = renewals[0]

  return (
    <div className={card}>
      <CardHeader label="Ingreso recurrente" count={recurring.length || null} />
      {recurring.length === 0 ? (
        <div className="mt-4">
          <p className="text-[13.5px] text-[#7A7A7A]">Todavía no hay contratos ni suscripciones activos.</p>
          <button type="button" onClick={() => onNavigate?.('clientes')} className="mt-2 text-[13px] font-medium text-[#F4EEE2] transition-opacity hover:opacity-80">
            Configurar un servicio en Clientes →
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3.5">
              <p className="text-[11px] text-[#767676]">Por mes (MRR)</p>
              <p className="mt-1 text-[20px] font-semibold tabular-nums tracking-tight text-[#F5F5F5]">{money(mrr)}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3.5">
              <p className="text-[11px] text-[#767676]">Por año (ARR)</p>
              <p className="mt-1 text-[20px] font-semibold tabular-nums tracking-tight text-[#F5F5F5]">{money(mrr * 12)}</p>
            </div>
          </div>
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {recurring.slice(0, 4).map((r) => (
              <li key={r.client.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#E8E8E8]">{r.client.name}</span>
                <span className="flex-shrink-0 text-[11.5px] text-[#767676]">{r.client.billing.modality === 'contrato' ? 'Contrato' : 'Suscripción'}</span>
                <span className="w-24 flex-shrink-0 text-right text-[13px] tabular-nums text-[#F5F5F5]">{money(r.monthly)}/mes</span>
              </li>
            ))}
          </ul>
          {next && (
            <p className="mt-3 rounded-xl px-3 py-2 text-[12px]" style={{ background: next.status.days <= 90 ? 'rgba(232,193,90,0.1)' : 'rgba(255,255,255,0.04)', color: next.status.days <= 90 ? '#E8C15A' : '#9A9A9A' }}>
              Próxima renovación: {next.client.name} · {next.status.days <= 0 ? 'ya terminó' : `en ${next.status.days} días`}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ──────────────────── Cuentas por cobrar por antigüedad ────────────────────
// Not just "how much is owed" but how late it is: the older, the harder it is
// to collect.
const BUCKETS = [
  { id: 'ok', label: 'Al corriente', color: '#4CAF50', test: (d) => d === null || d >= 0 },
  { id: '30', label: 'Vencido 1–30 días', color: '#E8C15A', test: (d) => d < 0 && d >= -30 },
  { id: '60', label: 'Vencido 31–60 días', color: '#F08A4B', test: (d) => d < -30 && d >= -60 },
  { id: '60+', label: 'Vencido +60 días', color: '#EF5350', test: (d) => d < -60 },
]

export function AntiguedadCobrosCard({ pendingPayments, onOpen }) {
  const today = new Date(new Date().toDateString())
  const sums = BUCKETS.map((b) => ({ ...b, amount: 0, count: 0 }))
  for (const p of pendingPayments) {
    const days = p.date ? Math.round((new Date(`${p.date}T00:00:00`) - today) / 86400000) : null
    const bucket = sums.find((b) => b.test(days))
    if (bucket) {
      bucket.amount += p.amount
      bucket.count += 1
    }
  }
  const total = sums.reduce((s, b) => s + b.amount, 0)
  const overdue = sums.filter((b) => b.id !== 'ok').reduce((s, b) => s + b.amount, 0)

  return (
    <div className={card}>
      <CardHeader label="Cuentas por cobrar · antigüedad" action={total > 0 ? <button type="button" onClick={onOpen}>Detalle</button> : null} />
      {total === 0 ? (
        <p className="mt-4 text-[13.5px] text-[#7A7A7A]">No hay nada pendiente de cobro.</p>
      ) : (
        <>
          <p className="mt-4 text-[26px] font-semibold tabular-nums tracking-tight text-[#F5F5F5]">{money(total)}</p>
          <p className="text-[12px]" style={{ color: overdue > 0 ? '#EF8A88' : '#767676' }}>
            {overdue > 0 ? `${money(overdue)} ya vencido` : 'Nada vencido'}
          </p>
          <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            {sums.filter((b) => b.amount > 0).map((b) => (
              <div key={b.id} style={{ width: `${(b.amount / total) * 100}%`, background: b.color }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {sums.map((b) => (
              <li key={b.id} className="flex items-center gap-2.5" style={{ opacity: b.amount > 0 ? 1 : 0.4 }}>
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: b.color }} />
                <span className="min-w-0 flex-1 text-[12.5px] text-[#E8E8E8]">{b.label}</span>
                <span className="text-[12px] tabular-nums text-[#B5B5B5]">{money(b.amount)}</span>
                <span className="w-6 text-right text-[11px] tabular-nums text-[#767676]">{b.count || ''}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// ───────────────────────── Ingresos por cliente ─────────────────────────
// Who the year's income comes from, and whether too much depends on one.
export function IngresosPorClienteCard({ movements }) {
  const year = String(new Date().getFullYear())
  const byClient = new Map()
  for (const m of movements) {
    if (m.type !== 'ingreso' || !m.date?.startsWith(year)) continue
    const key = m.source === 'client' ? m.name : m.clientName || 'Sin cliente'
    byClient.set(key, (byClient.get(key) || 0) + m.amount)
  }
  const rows = [...byClient.entries()].sort((a, b) => b[1] - a[1])
  const total = rows.reduce((s, [, v]) => s + v, 0)
  const top = rows[0]
  const concentration = total && top ? (top[1] / total) * 100 : 0

  return (
    <div className={card}>
      <CardHeader label={`Ingresos por cliente · ${year}`} />
      {rows.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-[#7A7A7A]">Cuando registres ingresos, verás de quién viene cada sol.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-3.5">
            {rows.slice(0, 5).map(([name, amount]) => (
              <li key={name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] text-[#E8E8E8]">{name}</span>
                  <span className="flex-shrink-0 text-[12.5px] tabular-nums text-[#B5B5B5]">
                    {money(amount)} <span className="text-[#767676]">· {Math.round((amount / total) * 100)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-[#F4EEE2]/80 transition-all duration-700" style={{ width: `${(amount / rows[0][1]) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {rows.length > 1 && concentration >= 50 && (
            <p className="mt-4 rounded-xl px-3 py-2 text-[12px] text-[#E8C15A]" style={{ background: 'rgba(232,193,90,0.1)' }}>
              {Math.round(concentration)}% de los ingresos del año viene de {top[0]}. Conviene diversificar.
            </p>
          )}
        </>
      )}
    </div>
  )
}
