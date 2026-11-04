import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import PushNotificationsCard from './PushNotificationsCard'
import Avatar from './Avatar'
import { useUserPhoto } from '../../hooks/useUserPhoto'
import { SPRING } from '../../lib/motion'
import { useEscape } from '../../hooks/useEscape'

const sun = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
const moon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>

// Selector Oscuro / Claro con indicador que se desliza (estilo iOS).
function ThemeToggle() {
  const [light, setLight] = useState(() => document.documentElement.classList.contains('light'))
  const set = (next) => {
    document.documentElement.classList.toggle('light', next)
    try { localStorage.setItem('ador_theme', next ? 'light' : 'dark') } catch { /* sin almacenamiento */ }
    setLight(next)
  }
  return (
    <div className="flex rounded-xl bg-white/[0.06] p-[3px]">
      {[[false, 'Oscuro', moon], [true, 'Claro', sun]].map(([value, label, icon]) => (
        <button
          key={label}
          type="button"
          onClick={() => set(value)}
          className="relative flex flex-1 items-center justify-center gap-2 rounded-[9px] py-2 text-[13px] font-medium transition-colors"
          style={{ color: light === value ? '#0A0A0A' : '#9A9A9A' }}
        >
          {light === value && <motion.span layoutId="theme-seg" className="absolute inset-0 rounded-[9px] bg-[#F5F5F5]" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <span className="relative flex items-center gap-2">{icon}{label}</span>
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#767676]">{title}</h3>
      {children}
    </section>
  )
}

// Filas agrupadas con divisores, como los ajustes de iOS.
function Group({ children }) {
  return <div className="ador-glass divide-y divide-white/[0.07] overflow-hidden rounded-2xl">{children}</div>
}

function Row({ title, hint, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.05] disabled:opacity-60"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] text-[#F5F5F5]">{title}</span>
        <span className="mt-0.5 block text-[12px] text-[#7A7A7A]">{hint}</span>
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#767676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
    </button>
  )
}

export default function SettingsModal({ user, onClose, onResetPassword, onShowOnboarding }) {
  useEscape(onClose)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const photo = useUserPhoto(user?.uid, user?.photoURL)

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
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-modal-surface ador-grain w-[min(400px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] overflow-y-auto rounded-[28px] p-7">
          <div className="flex items-center gap-3.5">
            <Avatar photoURL={photo} displayName={user?.displayName} email={user?.email} size={46} />
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-semibold text-[#F5F5F5]">{user?.displayName || 'Configuración'}</h2>
              <p className="truncate text-[12.5px] text-[#7A7A7A]">{user?.email}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-5">
            <Section title="Apariencia">
              <ThemeToggle />
            </Section>

            <Section title="Avisos">
              <PushNotificationsCard user={user} />
            </Section>

            <Section title="Ayuda y cuenta">
              <Group>
                <Row
                  title="Conoce ADOR OS"
                  hint="Un repaso rápido de cada módulo"
                  onClick={() => {
                    onClose()
                    onShowOnboarding()
                  }}
                />
                <Row title="Cambiar contraseña" hint="Te enviaremos un correo para restablecerla" onClick={handleResetPassword} disabled={sending} />
              </Group>
              {status && <p className="mt-2 px-1 text-[12px] text-[#9A9A9A]">{status}</p>}
              {error && <p className="mt-2 px-1 text-[12px] text-[#D98A86]">{error}</p>}
            </Section>
          </div>

          <div className="mt-5 flex justify-end">
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
