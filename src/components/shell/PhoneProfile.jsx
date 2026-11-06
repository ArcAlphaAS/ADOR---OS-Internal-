import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { SHEET, swipeToClose } from '../../lib/motion'
import { pushStatus, enablePush, canInstallApp, onInstallAvailability, installApp } from '../../lib/push'
import { useUserPhoto } from '../../hooks/useUserPhoto'
import { useToast } from '../../hooks/useToast'
import { useEscape } from '../../hooks/useEscape'
import Avatar from './Avatar'

// Perfil en el teléfono: una pantalla completa que entra desde la derecha, no
// el menú desplegable de la computadora. Tarjeta de tu cuenta arriba, una
// tarjeta oscura para conocer ADOR OS, y filas agrupadas con icono (como los
// ajustes de iOS): cuenta, preferencias (tema y avisos viven aquí) y cierre de
// sesión. Se cierra con la flecha o deslizando desde la izquierda.
const sv = (d, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const I = {
  user: sv(<><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.7-3.6 3.6-5.4 7-5.4s6.3 1.8 7 5.4" /></>),
  key: sv(<><circle cx="8" cy="15" r="3.5" /><path d="m10.5 12.5 8-8M15.5 7.5l2 2M13.5 9.5l2 2" /></>),
  shield: sv(<path d="M12 3 5 6v5.5c0 4.2 2.8 7.4 7 9.5 4.2-2.1 7-5.3 7-9.5V6l-7-3Z" />),
  bell: sv(<><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 1.5h-15L6 17Z" /><path d="M10 21h4" /></>),
  moon: sv(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />),
  sun: sv(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>),
  download: sv(<><path d="M12 4v11M7 11l5 5 5-5" /><path d="M5 20h14" /></>),
  logout: sv(<><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" /><path d="m16 8 4 4-4 4M20 12H9" /></>),
  spark: sv(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />),
}
const Chev = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>

function Group({ children }) {
  return <div className="overflow-hidden rounded-[26px] bg-[#1C1C1E] [&>*+*]:border-t [&>*+*]:border-white/[0.06]">{children}</div>
}

function Row({ icon, label, hint, onClick, right, danger }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C {...(onClick ? { type: 'button', onClick } : {})} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left active:bg-white/[0.05]">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: danger ? 'rgba(229,115,111,0.14)' : '#2C2C2E', color: danger ? '#E5736F' : '#E4DCCB' }}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px]" style={{ color: danger ? '#E5736F' : '#F5F5F5' }}>{label}</span>
        {hint && <span className="block text-[12.5px] text-[#8E8E93]">{hint}</span>}
      </span>
      {right ?? (onClick && !danger ? <Chev /> : null)}
    </C>
  )
}

const Switch = ({ on, onChange, label, disabled }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className="relative h-[28px] w-[48px] flex-shrink-0 rounded-full disabled:opacity-60" style={{ background: on ? '#34C759' : 'rgba(255,255,255,0.18)' }}>
    <span className="absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white shadow transition-all duration-200" style={{ left: on ? 22 : 2 }} />
  </button>
)

function ThemeSegment() {
  const [light, setLight] = useState(() => document.documentElement.classList.contains('light'))
  const set = (next) => {
    document.documentElement.classList.toggle('light', next)
    try { localStorage.setItem('ador_theme', next ? 'light' : 'dark') } catch { /* sin almacenamiento */ }
    setLight(next)
  }
  return (
    <div className="flex rounded-full bg-white/[0.08] p-[3px]">
      {[[false, I.moon, 'Oscuro'], [true, I.sun, 'Claro']].map(([v, icon, label]) => (
        <button key={label} type="button" aria-label={label} onClick={() => set(v)} className="flex h-9 w-10 items-center justify-center rounded-full transition-colors duration-150" style={{ background: light === v ? '#F5F5F5' : 'transparent', color: light === v ? '#0A0A0A' : '#8E8E93' }}>
          {icon}
        </button>
      ))}
    </div>
  )
}

export default function PhoneProfile({ user, isAdmin, onClose, onEditProfile, onResetPassword, onShowOnboarding, onAdmin, onSignOut }) {
  useEscape(onClose)
  const showToast = useToast()
  const photo = useUserPhoto(user?.uid, user?.photoURL)
  const [push, setPush] = useState(null)
  const [busy, setBusy] = useState(false)
  const [installable, setInstallable] = useState(canInstallApp)
  useEffect(() => onInstallAvailability(setInstallable), [])
  useEffect(() => {
    let alive = true
    pushStatus().then((s) => alive && setPush(s)).catch(() => alive && setPush('unsupported'))
    return () => { alive = false }
  }, [])

  const turnOnPush = async () => {
    setBusy(true)
    try {
      await enablePush(user.uid)
      setPush('on')
      showToast('Avisos activados en este dispositivo')
    } catch (error) {
      showToast(error.message)
      setPush(await pushStatus().catch(() => 'off'))
    } finally {
      setBusy(false)
    }
  }
  const resetPassword = async () => {
    try {
      await onResetPassword?.(user.email)
      showToast('Te enviamos un correo para restablecer tu contraseña')
    } catch {
      showToast('No pudimos enviar el correo')
    }
  }
  const lastSignIn = user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '') : null
  const pushHint = { on: 'Activados en este dispositivo', off: 'Mensajes, menciones y llamadas', denied: 'Bloqueados en los ajustes del teléfono', install: 'Añade ADOR OS a la pantalla de inicio primero', unsupported: 'Este navegador no los admite' }[push]

  return createPortal(
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={SHEET}
      {...swipeToClose('x', onClose)}
      className="fixed inset-0 z-[90] overflow-y-auto bg-black"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
    >
      <div className="mx-auto w-full max-w-[560px] px-4 pb-6 pt-3">
        <div className="relative flex h-12 items-center justify-center">
          <button type="button" onClick={onClose} aria-label="Volver" className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full bg-[#1C1C1E] text-[#F5F5F5]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <h1 className="text-[17px] font-semibold text-[#F5F5F5]">Perfil</h1>
        </div>

        <button type="button" onClick={onEditProfile} className="mt-4 flex w-full items-center gap-4 rounded-[26px] bg-[#1C1C1E] p-4 text-left active:bg-[#242426]">
          <Avatar photoURL={photo} displayName={user?.displayName} email={user?.email} size={58} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[19px] font-semibold text-[#F5F5F5]">{user?.displayName || 'Tu cuenta'}</span>
            <span className="block truncate text-[13.5px] text-[#8E8E93]">{user?.email}</span>
            <span className="mt-1 inline-block rounded-full bg-white/[0.08] px-2.5 py-[2px] text-[11.5px] text-[#C9C9C9]">{isAdmin ? 'Administrador' : 'Miembro'}</span>
          </span>
          <Chev />
        </button>

        <div className="mt-3 flex items-center gap-4 rounded-[26px] bg-gradient-to-br from-[#2A2A2D] to-[#141415] p-5">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.1] text-[#F4EEE2]">{I.spark}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-[#F5F5F5]">Conoce ADOR OS</span>
            <span className="block text-[12.5px] leading-snug text-[#9A9A9A]">Un repaso rápido de cada módulo.</span>
          </span>
          <button type="button" onClick={onShowOnboarding} className="rounded-full bg-[#F5F5F5] px-4 py-2 text-[13.5px] font-semibold text-[#0A0A0A]">Ver</button>
        </div>

        <p className="mb-2 mt-6 px-3 text-[13px] font-medium text-[#8E8E93]">Cuenta</p>
        <Group>
          <Row icon={I.user} label="Mi perfil" hint="Nombre, foto y cumpleaños" onClick={onEditProfile} />
          <Row icon={I.key} label="Cambiar contraseña" hint="Te enviamos un correo" onClick={resetPassword} />
          {isAdmin && <Row icon={I.shield} label="Administración" hint="Accesos, plantillas y datos" onClick={onAdmin} />}
        </Group>

        <p className="mb-2 mt-6 px-3 text-[13px] font-medium text-[#8E8E93]">Preferencias</p>
        <Group>
          <Row icon={I.moon} label="Tema" hint="Oscuro o claro" right={<ThemeSegment />} />
          {(push === 'on' || push === 'off') && <Row icon={I.bell} label="Avisos" hint={pushHint} right={<Switch on={push === 'on'} disabled={busy || push === 'on'} onChange={turnOnPush} label="Avisos en este dispositivo" />} />}
          {push && push !== 'on' && push !== 'off' && <Row icon={I.bell} label="Avisos" hint={pushHint} />}
          {installable && <Row icon={I.download} label="Instalar la app" hint="Ábrela desde tu pantalla de inicio" onClick={() => installApp().then((ok) => ok && showToast('Instalada'))} />}
        </Group>

        <div className="mt-6">
          <Group>
            <Row icon={I.logout} label="Cerrar sesión" danger onClick={onSignOut} />
          </Group>
        </div>

        {lastSignIn && <p className="mt-5 text-center text-[12px] text-[#636366]">Última conexión: {lastSignIn}</p>}
      </div>
    </motion.div>,
    document.body
  )
}
