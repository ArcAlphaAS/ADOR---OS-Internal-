import { useEffect, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import Logo from './Logo'

// Step two of the way in (step one is SplashScreen's welcome). Both fields
// are visible at once, joined in one block, so the phone's password manager
// can fill email and password together.
const SLOW = [0.22, 1, 0.36, 1]
const rise = (delay) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: SLOW },
})

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c7 0 11 7 11 7a13.6 13.6 0 0 1-3.4 4.1M6.6 6.6C3.4 8.5 1 12 1 12s4 7 11 7a10.4 10.4 0 0 0 5.4-1.5" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

export default function LoginScreen({ onSubmit, onForgotPassword, onBack, error, notice }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const shake = useAnimationControls()

  // A short sideways nudge when a sign-in attempt fails.
  useEffect(() => {
    if (error) shake.start({ x: [0, -4, 4, -3, 0], transition: { duration: 0.3 } })
  }, [error, shake])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!onSubmit || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({ email, password })
    } finally {
      setSubmitting(false)
    }
  }

  const message = error || notice
  const messageColor = error ? '#EF5350' : '#8A8A8A'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 flex flex-col bg-[#000000] px-6 pb-8 pt-[calc(env(safe-area-inset-top)+20px)] sm:px-10"
    >
      <div className="flex h-9 items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Volver"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] text-[#F5F5F5] transition-colors hover:bg-white/[0.06]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          )}
          <img src="/logo.svg" alt="" width={22} height={20} style={{ height: 20, width: 22 }} />
          <div className="flex items-baseline gap-[5px]">
            <Logo size={13} />
            <span className="text-[13px] font-medium text-[#9A9A9A]">OS</span>
          </div>
        </div>
        <span className="hidden text-[13px] text-[#767676] sm:block">Acceso por invitación</span>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-[340px]">
          <motion.div
            {...rise(0.05)}
            className="mb-[22px] flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.09] bg-[#0F0F0F]"
          >
            <img src="/logo.svg" alt="ADOR" width={22} height={20} style={{ height: 20, width: 22 }} />
          </motion.div>
          <motion.h1 {...rise(0.12)} className="text-[26px] font-semibold tracking-[-0.03em] text-[#FAFAFA]">
            Bienvenido de nuevo
          </motion.h1>
          <motion.p {...rise(0.18)} className="mb-[26px] mt-2 text-[14px] leading-relaxed text-[#8A8A8A]">
            Inicia sesión para continuar en ADOR OS.
          </motion.p>

          <form onSubmit={handleSubmit}>
            <motion.div {...rise(0.24)}>
            <motion.div
              animate={shake}
              className="overflow-hidden rounded-[10px] border bg-[#0A0A0A] transition-[border-color,box-shadow] duration-150 focus-within:border-[#FAFAFA] focus-within:shadow-[0_0_0_3px_rgba(250,250,250,0.07)]"
              style={{ borderColor: error ? '#5A2A2A' : '#262626' }}
            >
              <label className="flex h-[52px] items-center gap-3 px-4 text-[#5E5E5E] sm:h-12">
                <MailIcon />
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label="Correo electrónico"
                  className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-[#FAFAFA] outline-none placeholder:text-[#5E5E5E]"
                />
              </label>
              <label className="flex h-[52px] items-center gap-3 border-t border-[#1C1C1C] px-4 text-[#5E5E5E] sm:h-12">
                <LockIcon />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(Boolean(e.getModifierState?.('CapsLock')))}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  aria-label="Contraseña"
                  className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-[#FAFAFA] outline-none placeholder:text-[#5E5E5E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-md text-[#6B6B6B] transition-colors hover:text-[#EDEDED]"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </label>
            </motion.div>
            </motion.div>

            <div className="flex min-h-[34px] items-center text-[12.5px]" style={{ color: capsLock && !message ? '#A1A1A1' : messageColor }}>
              {message || (capsLock ? 'Bloq Mayús está activado.' : '')}
            </div>

            <motion.button
              {...rise(0.3)}
              type="submit"
              disabled={submitting}
              className="ador-btn-glass flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] text-[15px] font-medium sm:h-[46px]"
            >
              {submitting ? (
                <>
                  <span className="h-[15px] w-[15px] animate-spin rounded-full border-2 border-[#FAFAFA] border-r-transparent" />
                  Ingresando
                </>
              ) : (
                <>
                  Continuar
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </motion.button>
          </form>

          <motion.div {...rise(0.36)} className="mt-4 flex justify-center sm:justify-start">
            <button
              type="button"
              onClick={() => onForgotPassword?.(email)}
              className="text-[13px] text-[#8A8A8A] transition-colors hover:text-[#EDEDED]"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </motion.div>
          <p className="mt-6 text-center text-[12.5px] text-[#767676] sm:hidden">Acceso por invitación únicamente</p>
        </div>
      </div>
    </motion.div>
  )
}
