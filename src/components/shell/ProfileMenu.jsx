import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

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

export default function ProfileMenu({ user, onClose, onSelect, anchorRect }) {
  if (!anchorRect) return null

  const lastSignIn = formatLastSignIn(user)

  const handleClick = (id) => {
    onSelect?.(id)
    onClose?.()
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="ador-glass ador-grain z-50 overflow-hidden rounded-2xl"
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 8,
        right: window.innerWidth - anchorRect.right,
        width: anchorRect.width,
        minWidth: 180,
        boxShadow: '0 24px 48px -16px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.08)',
      }}
    >
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
