import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SHEET, swipeToClose } from '../../lib/motion'
import { haptic } from '../../lib/haptics'
import {
  HomeIcon,
  LayersIcon,
  MessageIcon,
  ContactsIcon,
  MoreIcon,
  TargetIcon,
  WalletIcon,
  CalendarIcon,
  BookIcon,
  GlobeIcon,
  SparkleIcon,
  UsersIcon,
  LockIcon,
} from '../icons'

// Phone and iPad-portrait navigation (below 1024px): the top pill tabs and
// the floating side capsule don't fit, so the four most-used modules sit in
// an iOS-style tab bar at the bottom and everything else is behind "Más"
// (a sheet that slides up). Only modules this person's role can open appear.
const PRIMARY = [
  { id: 'inicio', label: 'Inicio', Icon: HomeIcon },
  { id: 'workspace', label: 'Workspace', Icon: LayersIcon },
  { id: 'chat', label: 'Chat', Icon: MessageIcon },
  { id: 'clientes', label: 'Clientes', Icon: UsersIcon },
]

const MORE = [
  { id: 'objetivos', label: 'Objetivos', Icon: TargetIcon },
  { id: 'finanzas', label: 'Finanzas', Icon: WalletIcon },
  { id: 'calendario', label: 'Calendario', Icon: CalendarIcon },
  { id: 'conocimiento', label: 'Conocimiento', Icon: BookIcon },
  { id: 'news', label: 'News', Icon: GlobeIcon },
  { id: 'directorio', label: 'Directorio', Icon: ContactsIcon },
  { id: 'ador-ia', label: 'ADOR IA', Icon: SparkleIcon },
  { id: 'admin', label: 'Administración', Icon: LockIcon },
]

// Icon-only tab, iOS-style: the active one sits in a filled gold circle.
// The label stays for VoiceOver and the long-press tooltip.
function Tab({ label, Icon, active, badge, spin, onClick }) {
  return (
    <button type="button" onClick={() => { haptic(); onClick() }} aria-label={label} title={label} className="relative flex flex-1 items-center justify-center">
      {/* Se hunde al tocar y vuelve con un resorte, como un botón físico. */}
      <motion.span
        whileTap={{ scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 600, damping: 22 }}
        className="relative flex h-12 w-12 items-center justify-center rounded-full"
        style={{ color: active ? '#0A0A0A' : '#8E8E93', transition: 'color 200ms ease-out' }}
      >
        {/* One white circle that slides between tabs (shared layoutId) instead of each tab fading its own. */}
        {active && (
          <motion.span
            layoutId="bottomnav-active-circle"
            className="absolute inset-0 rounded-full bg-[#F5F5F5]"
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
          />
        )}
        {/* El icono rebota al volverse el activo. */}
        <motion.span
          key={active ? 'on' : 'off'}
          initial={active ? { scale: 0.6, rotate: -14 } : false}
          animate={{ scale: 1, rotate: spin ?? 0 }}
          transition={{ type: 'spring', stiffness: 460, damping: 14 }}
          className="relative flex"
        >
          <Icon size={21} />
        </motion.span>
        {badge > 0 && (
          <motion.span
            key={badge}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 15 }}
            className="absolute top-1 right-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-[#1C1A16] ring-2 ring-[#1C1C1E]"
            style={{ background: '#F4EEE2' }}
          >
            {badge > 9 ? '9+' : badge}
          </motion.span>
        )}
      </motion.span>
    </button>
  )
}

export default function BottomNav({ activeModule, onNavigate, canSee, badges = {} }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = PRIMARY.filter((m) => canSee(m.id))
  const more = MORE.filter((m) => canSee(m.id))
  const moreActive = more.some((m) => m.id === activeModule)

  // Tapping the tab you're already on scrolls back to the top, like every
  // iPhone app — the page itself and any list inside it that's scrolled.
  const go = (id) => {
    setMoreOpen(false)
    if (id === activeModule) return scrollToTop()
    onNavigate(id)
  }

  return (
    <>
      {/* A floating capsule just above the home indicator, not a
          full-width bar — the way Apple's own newer apps do it. */}
      <nav
        className="ador-bottomnav ador-hide-on-kb fixed inset-x-3 z-[46] flex h-16 items-center rounded-full border border-white/[0.08] bg-[#1C1C1E]/90 px-2 shadow-[0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden"
        style={{ bottom: 'max(12px, calc(env(safe-area-inset-bottom) - 8px))' }}
      >
        {primary.map((m) => (
          <Tab key={m.id} {...m} active={activeModule === m.id && !moreOpen} badge={badges[m.id]} onClick={() => go(m.id)} />
        ))}
        {more.length > 0 && <Tab label="Más" Icon={MoreIcon} spin={moreOpen ? 90 : 0} active={moreActive || moreOpen} badge={more.reduce((n, m) => n + (badges[m.id] || 0), 0)} onClick={() => setMoreOpen((v) => !v)} />}
      </nav>

      {createPortal(
        <AnimatePresence>
          {moreOpen && (
            <motion.div key="more" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[45] bg-black/50 lg:hidden" onClick={() => setMoreOpen(false)}>
              <motion.div
                initial={{ y: 40 }}
                animate={{ y: 0 }}
                exit={{ y: 40 }}
                transition={SHEET}
                {...swipeToClose('y', () => setMoreOpen(false))}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0"
              >
                <div className="ador-modal-surface rounded-t-[24px] px-4 pt-3" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
                  <div className="grid grid-cols-4 gap-2">
                    {more.map((m, i) => (
                      <motion.button
                        key={m.id}
                        initial={{ opacity: 0, y: 14, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 26, delay: 0.04 + i * 0.03 }}
                        whileTap={{ scale: 0.92 }}
                        type="button"
                        onClick={() => { haptic(); go(m.id) }}
                        className="flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-colors active:bg-white/[0.08]"
                        style={{ background: activeModule === m.id ? 'rgba(255,255,255,0.08)' : undefined, color: activeModule === m.id ? '#F5F5F5' : '#BBBBBB' }}
                      >
                        <span className="relative">
                          <m.Icon size={20} />
                          {badges[m.id] > 0 && (
                            <span className="absolute -right-2.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-[#1C1A16]" style={{ background: '#F4EEE2' }}>
                              {badges[m.id] > 9 ? '9+' : badges[m.id]}
                            </span>
                          )}
                        </span>
                        <span className="text-[11px]">{m.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

function scrollToTop() {
  const main = document.querySelector('main')
  if (!main) return
  // Message threads read bottom-up — they're marked data-keep-scroll and left alone.
  const scrolled = [main, ...main.querySelectorAll('*')].filter((el) => el.scrollTop > 0 && !el.closest('[data-keep-scroll]'))
  for (const el of scrolled) el.scrollTo({ top: 0, behavior: 'smooth' })
}
