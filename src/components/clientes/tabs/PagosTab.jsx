import { useState } from 'react'
import { motion } from 'framer-motion'
import { updateClient, registerPayment } from '../../../lib/firestore'
import { PAGO1_PERCENT, PAGO2_PERCENT, currencyPEN } from '../../../lib/clientStages'
import { CheckCircleIcon } from '../../icons'
import { useToast } from '../../../hooks/useToast'

function PaymentBlock({ client, actorName, paymentKey, percent, locked }) {
  const showToast = useToast()
  const payment = client[paymentKey] || {}
  const received = payment.status === 'Recibido'
  const amount = client.montoAcordado ? (client.montoAcordado * percent) / 100 : payment.amount || 0
  const label = paymentKey === 'pago1' ? `Pago 1 — ${percent}%` : `Pago 2 — ${percent}%`

  return (
    <div className="ador-glass ador-grain rounded-2xl p-5" style={{ opacity: locked ? 0.5 : 1 }}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#F5F5F5]">{label}</span>
        {received && <CheckCircleIcon size={18} style={{ color: '#1E5FAD' }} />}
      </div>
      <div className="mt-2 text-[22px] font-semibold text-[#F5F5F5]">{currencyPEN.format(amount)}</div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <label
            className="mb-1 block font-medium text-[#444444]"
            style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Fecha
          </label>
          <input
            type="date"
            disabled={locked}
            value={payment.date || ''}
            onChange={(e) => updateClient(client.id, { [paymentKey]: { ...payment, date: e.target.value } })}
            className="rounded-lg border border-white/[0.08] bg-[#1A1A1A] px-2.5 py-1.5 text-[12px] text-[#F5F5F5] outline-none"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {!locked &&
          (received ? (
            <span className="text-[12px] text-[#1E5FAD]">Recibido</span>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await registerPayment(client, paymentKey, amount, actorName)
                showToast(`${label} registrado como recibido.`)
              }}
              className="ador-btn-primary rounded-full px-4 py-1.5 text-[12px] font-medium"
            >
              Marcar recibido
            </button>
          ))}
        {locked && <span className="text-[12px] text-[#444444]">Bloqueado</span>}
      </div>
    </div>
  )
}

export default function PagosTab({ client, actorName }) {
  const [total, setTotal] = useState(client.montoAcordado || '')
  const pago1Received = client.pago1?.status === 'Recibido'
  const pago2Received = client.pago2?.status === 'Recibido'
  const bothReceived = pago1Received && pago2Received

  const totalReceived =
    (pago1Received ? ((client.montoAcordado || 0) * PAGO1_PERCENT) / 100 : 0) +
    (pago2Received ? ((client.montoAcordado || 0) * PAGO2_PERCENT) / 100 : 0)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label
          className="mb-1.5 block font-medium text-[#444444]"
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Monto acordado (soles)
        </label>
        <input
          type="number"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          onBlur={() => {
            const parsed = Number(total) || 0
            if (parsed !== (client.montoAcordado || 0)) updateClient(client.id, { montoAcordado: parsed })
          }}
          placeholder="0"
          className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
        />
      </div>

      <PaymentBlock client={client} actorName={actorName} paymentKey="pago1" percent={PAGO1_PERCENT} locked={false} />
      <PaymentBlock
        client={client}
        actorName={actorName}
        paymentKey="pago2"
        percent={PAGO2_PERCENT}
        locked={!pago1Received}
      />

      <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
        <span className="text-[12px] text-[#888888]">Total recibido</span>
        <span className="text-[14px] font-semibold text-[#F5F5F5]">{currencyPEN.format(totalReceived)}</span>
      </div>

      {bothReceived && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex items-center justify-center gap-2 rounded-xl py-3"
          style={{ background: 'rgba(30,95,173,0.18)', border: '1px solid rgba(30,95,173,0.35)' }}
        >
          <CheckCircleIcon size={16} style={{ color: '#1E5FAD' }} />
          <span className="text-[13px] font-medium text-[#1E5FAD]">Intervención Pagada</span>
        </motion.div>
      )}
    </div>
  )
}
