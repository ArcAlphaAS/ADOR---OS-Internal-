import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import useDeferredReveal from '../../hooks/useDeferredReveal'

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
  const ready = useDeferredReveal()
  if (!anchorRect) return null

  const lastSignIn = formatLastSignIn(user)

  const handleClick = (id) => {
    onSelect?.(id)
    onClose?.()
  }

  return createPortal(
    // See NotificationCenter.jsx for why the transform-animated wrapper and
    // the backdrop-filter surface are two separate elements — Chromium
    // silently drops backdrop-filter's blur compositing when the same
    // element also carries a `transform` (even an at-rest identity one like
    // scale(1)), so combining them here made the menu render with none of
    // the background actually blurred. `animate` doesn't start until
    // `useDeferredReveal`'s `ready` flips true a couple of frames after
    // mount — see that hook for why: on a freshly-mounted element the blur
    // itself needs a frame to composite, and animating visibly before that
    // is what caused the "opens transparent, then pops to blurred" flash
    // (will-change alone doesn't fix it — it only helps an element that
    // already existed a frame earlier).
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={ready ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -8, scale: 0.98 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="z-[999]"
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 8,
        right: window.innerWidth - anchorRect.right,
        width: anchorRect.width,
        minWidth: 180,
      }}
    >
      <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
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
      </div>
    </motion.div>,
    document.body
  )
}
