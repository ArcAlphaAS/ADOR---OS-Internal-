import { useState } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'
import AdorMark from './AdorMark'

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c7 0 11 7 11 7a13.6 13.6 0 0 1-3.4 4.1M6.6 6.6C3.4 8.5 1 12 1 12s4 7 11 7a10.4 10.4 0 0 0 5.4-1.5" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

const glassInput =
  'w-full rounded-xl bg-[#1A1A1A] border px-4 py-[14px] text-[14px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150'

export default function LoginScreen({ onSubmit, onForgotPassword, error, notice }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!onSubmit) return
    setSubmitting(true)
    try {
      await onSubmit({ email, password })
    } finally {
      setSubmitting(false)
    }
  }

  const borderColor = (focused) =>
    error
      ? 'rgba(255,100,100,0.3)'
      : focused
        ? 'rgba(255,255,255,0.2)'
        : 'rgba(255,255,255,0.08)'

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-[#0A0A0A]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at center, rgba(30,95,173,0.08) 0%, transparent 70%)',
      }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          width: 900,
          height: 260,
          left: '50%',
          top: '38%',
          transform: 'translate(-50%, -50%) rotate(-22deg)',
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.05) 45%, rgba(30,95,173,0.10) 55%, transparent)',
          filter: 'blur(40px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        className="ador-grain w-[380px] rounded-[32px] border border-white/[0.08] bg-white/[0.04] p-10"
        style={{
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow:
            '0 40px 80px -24px rgba(0,0,0,0.65), 0 12px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.03)',
        }}
      >
        <div className="flex justify-center">
          <AdorMark size={22} color="#888888" />
        </div>
        <div className="mt-5 flex items-baseline justify-center gap-[7px]">
          <Logo size={22} />
          <span className="font-semibold text-[#F5F5F5]" style={{ fontSize: 22, letterSpacing: '0.15em' }}>
            OS
          </span>
        </div>
        <div className="my-8 h-px bg-white/[0.06]" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              placeholder="Correo electrónico"
              autoComplete="email"
              className={glassInput}
              style={{ borderColor: borderColor(emailFocused) }}
            />
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="Contraseña"
                autoComplete="current-password"
                className={glassInput}
                style={{ borderColor: borderColor(passwordFocused), paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#888888] transition-colors hover:bg-white/[0.06] hover:text-[#F5F5F5]"
                tabIndex={-1}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {error && (
              <p className="mt-2 px-1 text-[12px] text-[#888888]">{error}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onForgotPassword?.(email)}
            className="self-end text-[12px] text-[#888888] transition-colors hover:text-[#F5F5F5]"
          >
            Olvidé mi contraseña
          </button>

          {notice && (
            <p className="-mt-2 text-right text-[12px] text-[#888888]">{notice}</p>
          )}

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.15 }}
            className="ador-btn-primary mt-1 w-full rounded-xl py-[14px] text-[14px] font-medium"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </motion.button>
        </form>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="text-[12px] text-[#444444]"
      >
        Acceso por invitación únicamente
      </motion.p>
    </div>
  )
}
