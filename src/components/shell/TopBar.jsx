import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Logo from '../Logo'
import { SearchIcon, BellIcon, ChevronDownIcon } from '../icons'
import NotificationCenter from './NotificationCenter'
import ProfileMenu from './ProfileMenu'
import ProfileModal from './ProfileModal'
import SettingsModal from './SettingsModal'
import SearchResults from './SearchResults'
import Avatar from './Avatar'
import { useClientNotifications } from '../../hooks/useClientNotifications'
import { useTaskNotifications } from '../../hooks/useTaskNotifications'
import { useTodaysBirthdays } from '../../hooks/useTodaysBirthdays'
import { useUserPhoto } from '../../hooks/useUserPhoto'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'

// Shared easing for the top-bar's layout reflows (search opening, profile
// pill expanding) — a symmetric ease-in-out curve reads as smoother/more
// deliberate than a pure ease-out, which front-loads all the motion into the
// first ~100ms and reads as an abrupt snap. `type: 'tween'` is required here:
// Framer Motion's `layout` prop defaults to a spring for size/position
// animations and silently ignores a plain duration/ease transition otherwise.
const REFLOW_TRANSITION = { type: 'tween', duration: 0.35, ease: [0.65, 0, 0.35, 1] }

const PRIMARY_MODULES = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'finanzas', label: 'Finanzas' },
]

// First name + first surname only, ignoring any middle names.
function shortFullName(user) {
  const raw = user?.displayName || user?.email?.split('@')[0] || 'Usuario'
  return raw.trim().split(/\s+/).slice(0, 2).join(' ')
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

function SearchToggle({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [rect, setRect] = useState(null)
  const inputRef = useRef(null)
  const results = useGlobalSearch(query)

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const openSearch = () => {
    setOpen(true)
    requestAnimationFrame(() => {
      if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
    })
  }

  useEffect(() => {
    if (!open) return
    const measure = () => {
      if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
    }
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  const goTo = (moduleId, focus) => {
    onNavigate(moduleId, focus)
    close()
  }

  return (
    <motion.div layout="position" transition={REFLOW_TRANSITION} className="flex items-center">
      <AnimatePresence>
        {open && (
          <motion.input
            key="search-input"
            ref={inputRef}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={REFLOW_TRANSITION}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en ADOR OS..."
            onBlur={close}
            onKeyDown={(e) => e.key === 'Escape' && close()}
            className="ador-glass mr-2 rounded-full px-4 py-1.5 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
          />
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => (open ? close() : openSearch())}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
      >
        <SearchIcon size={16} />
      </button>

      {open && query.trim() && (
        <SearchResults
          results={results}
          anchorRect={rect}
          onSelectClient={(id) => goTo('clientes', { type: 'client', id })}
          onSelectTask={(id) => goTo('workspace', { type: 'task', id })}
          onSelectDecision={() => goTo('workspace', null)}
        />
      )}
    </motion.div>
  )
}

// Two independent, click-driven states (no hover): `expanded` reveals
// name/role/chevron and stays open until clicked again — not a hover
// tooltip. `menuOpen` (only reachable once expanded, via the chevron) shows
// the actual Mi Perfil/Configuración/Cerrar Sesión dropdown. This pill lives
// in normal flex flow (not portaled) so its growth pushes the search/bell
// icons left instead of covering them — this container is a plain flex row,
// not a shrink-wrapped rounded-full capsule, so it doesn't hit the
// width-leak bug described in Sidebar.jsx. Only the dropdown itself is
// portaled, since it needs to float above everything at a viewport-anchored
// position.
function ProfileTrigger({ user, expanded, onToggleExpanded, menuOpen, onToggleMenu, onCloseAll, onSelect }) {
  const triggerRef = useRef(null)
  const [rect, setRect] = useState(null)
  const photoURL = useUserPhoto(user?.uid, user?.photoURL)

  useEffect(() => {
    if (!menuOpen) return
    const measure = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [menuOpen])

  // Collapses the pill when expanded-but-menu-closed and the user clicks
  // elsewhere. When the menu IS open, its own full-screen backdrop already
  // handles outside clicks (and closes both states via onCloseAll).
  useEffect(() => {
    if (!expanded || menuOpen) return
    const handleClick = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) onCloseAll()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [expanded, menuOpen, onCloseAll])

  const name = shortFullName(user)
  const role = 'Fundador'

  return (
    <>
      <motion.div
        ref={triggerRef}
        layout
        onClick={onToggleExpanded}
        transition={REFLOW_TRANSITION}
        className="ador-glass ador-grain flex cursor-pointer items-center overflow-hidden rounded-full"
        style={{ minHeight: 32 }}
      >
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.span
              key="info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 whitespace-nowrap py-1.5 pl-3.5"
            >
              <span className="leading-tight">
                <span className="block text-[13px] font-semibold text-[#F5F5F5]">{name}</span>
                <span className="block text-[11px] text-[#888888]">{role}</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleMenu()
                }}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
              >
                <ChevronDownIcon
                  size={14}
                  style={{
                    transform: menuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 150ms ease-out',
                  }}
                />
              </button>
            </motion.span>
          )}
        </AnimatePresence>
        <Avatar photoURL={photoURL} displayName={user?.displayName} email={user?.email} size={32} />
      </motion.div>

      {rect &&
        createPortal(
          <AnimatePresence>
            {menuOpen && (
              <>
                {createPortal(
                  <div className="fixed inset-0 z-40" onClick={onCloseAll} />,
                  document.body
                )}
                <ProfileMenu user={user} anchorRect={rect} onClose={onCloseAll} onSelect={onSelect} />
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}

export default function TopBar({
  user,
  onSignOut,
  onUpdateDisplayName,
  onResetPassword,
  activeModule,
  onNavigate,
}) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifRect, setNotifRect] = useState(null)
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [activeModal, setActiveModal] = useState(null) // null | 'profile' | 'settings'
  const bellRef = useRef(null)
  const birthdays = useTodaysBirthdays()
  const birthdayNotifications = birthdays.map((b) => ({
    text: b.uid === user?.uid ? 'Hoy es tu cumpleaños — feliz día' : `Hoy es el cumpleaños de ${b.displayName}`,
    time: 'Hoy',
  }))
  const clientNotifications = useClientNotifications()
  const taskNotifications = useTaskNotifications(user?.uid)
  const notifications = [...birthdayNotifications, ...taskNotifications, ...clientNotifications]
  const hasUnreadNotifications = notifications.length > 0

  const closeProfileAll = () => {
    setProfileExpanded(false)
    setProfileMenuOpen(false)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setNotifOpen(false)
      closeProfileAll()
      setActiveModal(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleNotif = () => {
    if (!notifOpen) setNotifRect(bellRef.current.getBoundingClientRect())
    setNotifOpen((v) => !v)
  }

  const handleMenuSelect = (id) => {
    if (id === 'logout') onSignOut?.()
    else if (id === 'perfil') setActiveModal('profile')
    else if (id === 'config') setActiveModal('settings')
  }

  return (
    <header
      className="relative z-40 grid w-full flex-shrink-0 grid-cols-3 items-center px-5"
      style={{ height: 64, backgroundColor: '#0A0A0A' }}
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

      <motion.div layout="position" transition={REFLOW_TRANSITION} className="flex items-center gap-2 justify-self-end">
        <SearchToggle onNavigate={onNavigate} />

        <motion.div layout="position" transition={REFLOW_TRANSITION} className="relative">
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
                <NotificationCenter items={notifications} anchorRect={notifRect} />
              </>
            )}
          </AnimatePresence>
        </motion.div>

        <ProfileTrigger
          user={user}
          expanded={profileExpanded}
          onToggleExpanded={() => (profileExpanded ? closeProfileAll() : setProfileExpanded(true))}
          menuOpen={profileMenuOpen}
          onToggleMenu={() => setProfileMenuOpen((v) => !v)}
          onCloseAll={closeProfileAll}
          onSelect={handleMenuSelect}
        />
      </motion.div>

      <AnimatePresence>
        {activeModal === 'profile' && (
          <ProfileModal
            key="profile-modal"
            user={user}
            onClose={() => setActiveModal(null)}
            onSave={onUpdateDisplayName}
          />
        )}
        {activeModal === 'settings' && (
          <SettingsModal
            key="settings-modal"
            user={user}
            onClose={() => setActiveModal(null)}
            onResetPassword={onResetPassword}
          />
        )}
      </AnimatePresence>
    </header>
  )
}
