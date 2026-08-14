import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Logo from '../Logo'
import { SearchIcon, BellIcon } from '../icons'
import NotificationCenter from './NotificationCenter'
import ProfileMenu from './ProfileMenu'

const PRIMARY_MODULES = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'clientes', label: 'Clientes' },
]

// First name + first surname only, ignoring any middle names.
function shortFullName(user) {
  const raw = user?.displayName || user?.email?.split('@')[0] || 'Usuario'
  return raw.trim().split(/\s+/).slice(0, 2).join(' ')
}

function Avatar({ user, size = 32 }) {
  if (user?.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase()
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-[#1E5FAD] font-medium text-[#F5F5F5]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}

function PillTabs({ activeModule, onNavigate }) {
  return (
    <nav className="ador-glass ador-grain flex items-center gap-1 rounded-full p-1">
      {PRIMARY_MODULES.map((item) => {
        const active = activeModule === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className="relative rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-150"
            style={{ color: active ? '#0A0A0A' : '#888888' }}
          >
            {active && (
              <motion.span
                layoutId="topbar-active-pill"
                className="absolute inset-0 rounded-full bg-[#F5F5F5]"
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            )}
            <span className="relative">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function SearchToggle() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center">
      <AnimatePresence>
        {open && (
          <motion.input
            key="search-input"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            autoFocus
            type="text"
            placeholder="Buscar en ADOR OS..."
            disabled
            onBlur={() => setOpen(false)}
            className="ador-glass mr-2 rounded-full px-4 py-1.5 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
          />
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
      >
        <SearchIcon size={16} />
      </button>
    </div>
  )
}

// The avatar's real click/hover target is a portaled clone anchored to this
// invisible spacer's screen position — see the note in Sidebar.jsx about why
// floating elements can't live inside the shrink-wrapped topbar directly.
function ProfileTrigger({ user, profileOpen, onToggle, onClose, onSignOut }) {
  const spacerRef = useRef(null)
  const [rect, setRect] = useState(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const measure = () => {
      if (spacerRef.current) setRect(spacerRef.current.getBoundingClientRect())
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const name = shortFullName(user)
  const role = 'Fundador'

  return (
    <>
      <div ref={spacerRef} style={{ width: 32, height: 32 }} />

      {rect &&
        createPortal(
          <>
            <motion.div
              layout
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onClick={onToggle}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="ador-glass ador-grain flex cursor-pointer items-center overflow-hidden rounded-full"
              style={{
                position: 'fixed',
                top: rect.top,
                right: window.innerWidth - rect.right,
                height: rect.height,
                zIndex: 45,
              }}
            >
              <AnimatePresence initial={false}>
                {hovered && !profileOpen && (
                  <motion.span
                    key="name"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5 whitespace-nowrap pl-3"
                  >
                    <span className="text-[13px] font-medium text-[#F5F5F5]">{name}</span>
                    <span className="text-[11px] text-[#888888]">{role}</span>
                  </motion.span>
                )}
              </AnimatePresence>
              <Avatar user={user} size={32} />
            </motion.div>

            <AnimatePresence>
              {profileOpen && (
                <>
                  {createPortal(
                    <div className="fixed inset-0 z-40" onClick={onClose} />,
                    document.body
                  )}
                  <ProfileMenu
                    user={user}
                    name={name}
                    role={role}
                    anchorRect={rect}
                    onClose={onClose}
                    onSignOut={onSignOut}
                  />
                </>
              )}
            </AnimatePresence>
          </>,
          document.body
        )}
    </>
  )
}

export default function TopBar({ user, onSignOut, activeModule, onNavigate, hasUnreadNotifications = false }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifRect, setNotifRect] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const bellRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setNotifOpen(false)
      setProfileOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleNotif = () => {
    if (!notifOpen) setNotifRect(bellRef.current.getBoundingClientRect())
    setNotifOpen((v) => !v)
  }

  return (
    <header
      className="relative z-40 grid w-full flex-shrink-0 grid-cols-3 items-center px-5"
      style={{ height: 64 }}
    >
      <div className="flex items-baseline gap-[6px] justify-self-start">
        <Logo size={13} />
        <span className="font-semibold text-[#F5F5F5]" style={{ fontSize: 13, letterSpacing: '0.3em' }}>
          OS
        </span>
      </div>

      <div className="justify-self-center">
        <PillTabs activeModule={activeModule} onNavigate={onNavigate} />
      </div>

      <div className="flex items-center gap-2 justify-self-end">
        <SearchToggle />

        <div className="relative">
          <button
            ref={bellRef}
            type="button"
            onClick={toggleNotif}
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
          >
            <BellIcon size={18} />
            {hasUnreadNotifications && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#E05252]" />
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <>
                {createPortal(
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />,
                  document.body
                )}
                <NotificationCenter items={[]} anchorRect={notifRect} />
              </>
            )}
          </AnimatePresence>
        </div>

        <ProfileTrigger
          user={user}
          profileOpen={profileOpen}
          onToggle={() => setProfileOpen((v) => !v)}
          onClose={() => setProfileOpen(false)}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  )
}
