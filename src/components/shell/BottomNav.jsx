import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
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

function Tab({ label, Icon, active, badge, onClick }) {
  return (
    <button type="button" onClick={onClick} className="relative flex flex-1 flex-col items-center gap-1 py-2" style={{ color: active ? '#F5F5F5' : '#777777' }}>
      <span className="relative">
        <Icon size={20} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-[#1C1A16]" style={{ background: '#E8C15A' }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="text-[10.5px] font-medium">{label}</span>
    </button>
  )
}

export default function BottomNav({ activeModule, onNavigate, canSee, badges = {} }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = PRIMARY.filter((m) => canSee(m.id))
  const more = MORE.filter((m) => canSee(m.id))
  const moreActive = more.some((m) => m.id === activeModule)

  const go = (id) => {
    setMoreOpen(false)
    onNavigate(id)
  }

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.08] bg-[#0A0A0A]/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {primary.map((m) => (
          <Tab key={m.id} {...m} active={activeModule === m.id} badge={badges[m.id]} onClick={() => go(m.id)} />
        ))}
        {more.length > 0 && <Tab label="Más" Icon={MoreIcon} active={moreActive || moreOpen} onClick={() => setMoreOpen((v) => !v)} />}
      </nav>

      {createPortal(
        <AnimatePresence>
          {moreOpen && (
            <motion.div key="more" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[45] bg-black/50 lg:hidden" onClick={() => setMoreOpen(false)}>
              <motion.div
                initial={{ y: 40 }}
                animate={{ y: 0 }}
                exit={{ y: 40 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0"
              >
                <div className="ador-modal-surface rounded-t-[24px] px-4 pt-3" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom))' }}>
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
                  <div className="grid grid-cols-4 gap-2">
                    {more.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => go(m.id)}
                        className="flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-colors active:bg-white/[0.08]"
                        style={{ background: activeModule === m.id ? 'rgba(255,255,255,0.08)' : undefined, color: activeModule === m.id ? '#F5F5F5' : '#BBBBBB' }}
                      >
                        <m.Icon size={20} />
                        <span className="text-[11px]">{m.label}</span>
                      </button>
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
