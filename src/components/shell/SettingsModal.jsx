import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

export default function SettingsModal({ user, onClose, onResetPassword, onShowOnboarding }) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const handleResetPassword = async () => {
    if (!user?.email) return
    setError('')
    setStatus('')
    setSending(true)
    try {
      await onResetPassword(user.email)
      setStatus('Te enviamos un correo para restablecer tu contraseña.')
    } catch {
      setError('No pudimos enviar el correo.')
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-modal-surface ador-grain w-[380px] rounded-[28px] p-8">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Configuración</h2>
          <p className="mt-1 text-[13px] text-[#888888]">{user?.email}</p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose()
                onShowOnboarding()
              }}
              className="ador-glass w-full rounded-xl px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.06]"
            >
              <span className="block text-[13px] font-medium text-[#F5F5F5]">Conoce ADOR OS</span>
              <span className="mt-0.5 block text-[12px] text-[#888888]">Un repaso rápido de cada módulo</span>
            </button>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={sending}
              className="ador-glass w-full rounded-xl px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.06] disabled:opacity-60"
            >
              <span className="block text-[13px] font-medium text-[#F5F5F5]">Cambiar contraseña</span>
              <span className="mt-0.5 block text-[12px] text-[#888888]">
                Te enviaremos un correo para restablecerla
              </span>
            </button>

            {status && <p className="mt-1 px-1 text-[12px] text-[#888888]">{status}</p>}
            {error && <p className="mt-1 px-1 text-[12px] text-[#888888]">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
