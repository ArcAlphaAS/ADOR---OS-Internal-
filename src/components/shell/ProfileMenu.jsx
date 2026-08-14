import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

function Avatar({ user, size }) {
  if (user?.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase()
  return (
    <div
      className="flex items-center justify-center rounded-full bg-[#1E5FAD] font-medium text-[#F5F5F5]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}

const MENU_ITEMS = [
  { id: 'perfil', label: 'Mi Perfil' },
  { id: 'config', label: 'Configuración' },
  { id: 'logout', label: 'Cerrar Sesión' },
]

// Real Firebase Auth metadata, not fabricated — a quiet trust signal for an
// invite-only tool: confirms the session is genuinely yours.
function formatLastSignIn(user) {
  const raw = user?.metadata?.lastSignInTime
  if (!raw) return null
  const date = new Date(raw)
  const text = date.toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return text.replace('.', '')
}

export default function ProfileMenu({ user, name, role, onClose, onSignOut, anchorRect }) {
  if (!anchorRect) return null

  const lastSignIn = formatLastSignIn(user)

  const handleClick = (id) => {
    if (id === 'logout') onSignOut?.()
    onClose?.()
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="ador-glass ador-grain z-50 w-[220px] overflow-hidden rounded-2xl"
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 12,
        right: window.innerWidth - anchorRect.right,
        boxShadow: '0 24px 48px -16px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex flex-col items-center gap-2 px-4 py-5">
        <Avatar user={user} size={40} />
        <div className="text-center leading-tight">
          <div className="text-[13px] font-semibold text-[#F5F5F5]">{name}</div>
          <div className="mt-0.5 text-[11px] text-[#888888]">{role}</div>
        </div>
      </div>

      <div className="mx-4 h-px bg-white/[0.06]" />

      <nav className="flex flex-col py-1.5">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.id)}
            className="px-4 py-2.5 text-left text-[13px] text-[#F5F5F5] transition-colors duration-150 hover:bg-white/[0.06]"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {lastSignIn && (
        <>
          <div className="mx-4 h-px bg-white/[0.06]" />
          <p className="px-4 py-3 text-[11px] text-[#444444]">Última conexión: {lastSignIn}</p>
        </>
      )}
    </motion.div>,
    document.body
  )
}
