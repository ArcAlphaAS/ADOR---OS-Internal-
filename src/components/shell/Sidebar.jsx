import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarIcon, BookIcon, UsersIcon, MessageIcon, GlobeIcon, ContactsIcon, SparkleIcon } from '../icons'

const NAV_ITEMS = [
  { id: 'calendario', label: 'Calendario', Icon: CalendarIcon },
  { id: 'conocimiento', label: 'Conocimiento', Icon: BookIcon },
  { id: 'comunidad', label: 'Comunidad', Icon: UsersIcon },
  { id: 'chat', label: 'Chat', Icon: MessageIcon },
  { id: 'news', label: 'News', Icon: GlobeIcon },
  { id: 'directorio', label: 'Directorio', Icon: ContactsIcon },
]

// Tooltips render into a portal with fixed positioning computed from the
// trigger's own rect — keeping them inside the shrink-wrapped capsule caused
// a Chromium flex+absolute-positioning quirk where the tooltip's width fed
// back into the capsule's own auto-width, making it visibly balloon on hover.
function NavButton({ id, label, Icon, active, accent, onClick }) {
  const [hovered, setHovered] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const [tipPos, setTipPos] = useState(null)
  const btnRef = useRef(null)
  const timerRef = useRef(null)

  const handleEnter = () => {
    setHovered(true)
    timerRef.current = setTimeout(() => {
      const rect = btnRef.current.getBoundingClientRect()
      setTipPos({ top: rect.top + rect.height / 2, left: rect.right + 12 })
      setShowTip(true)
    }, 150)
  }
  const handleLeave = () => {
    setHovered(false)
    setShowTip(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const color = active || hovered ? '#F5F5F5' : accent ? '#1E5FAD' : '#444444'

  return (
    <div className="relative flex justify-center" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150"
        style={{ color }}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-full bg-white/[0.1]"
            transition={{ duration: 0.2 }}
          />
        )}
        <Icon size={19} className="relative" />
      </button>

      {tipPos &&
        createPortal(
          <AnimatePresence>
            {showTip && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none z-50"
                style={{ position: 'fixed', top: tipPos.top, left: tipPos.left, transform: 'translateY(-50%)' }}
              >
                <div className="ador-glass ador-grain whitespace-nowrap rounded-lg px-3 py-1.5">
                  <span
                    className="font-medium text-[#F5F5F5]"
                    style={{ fontSize: 12, letterSpacing: '0.04em' }}
                  >
                    {label}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}

export default function Sidebar({ activeModule, onNavigate }) {
  return (
    <div className="flex h-full w-20 flex-shrink-0 items-center justify-center">
      <nav
        className="ador-glass ador-grain flex flex-col items-center gap-2 rounded-full px-2.5 py-4"
        style={{ boxShadow: '0 20px 40px -16px rgba(0,0,0,0.5)' }}
      >
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            {...item}
            active={activeModule === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}

        <div className="my-1 h-px w-6 bg-white/[0.08]" />

        <NavButton
          id="ador-ia"
          label="ADOR IA"
          Icon={SparkleIcon}
          accent
          active={activeModule === 'ador-ia'}
          onClick={() => onNavigate('ador-ia')}
        />
      </nav>
    </div>
  )
}
