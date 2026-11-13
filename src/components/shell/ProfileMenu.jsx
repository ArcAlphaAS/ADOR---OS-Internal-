import { lockNow } from '../../hooks/useIdleLock'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import useDeferredReveal from '../../hooks/useDeferredReveal'
import { subscribeMyPresence, setDoNotDisturb, subscribeUsers, dmIdFor } from '../../lib/firestore'
import { presenceOf, userLabel } from '../../lib/chat'
import { isAdmin as isAdminProfile } from '../../lib/permissions'
import PersonAvatar from '../chat/PersonAvatar'
import { notifyFail } from '../../lib/notifyFail'
import { applyUpdate } from '../../lib/appUpdate'

const sv = (d) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const ICON = {
  perfil: sv(<><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.7-3.6 3.6-5.4 7-5.4s6.3 1.8 7 5.4" /></>),
  config: sv(<><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></>),
  admin: sv(<path d="M12 3 5 6v5.5c0 4.2 2.8 7.4 7 9.5 4.2-2.1 7-5.3 7-9.5V6l-7-3Z" />),
  logout: sv(<><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" /><path d="m16 8 4 4-4 4M20 12H9" /></>),
}
const MENU_ITEMS = [
  { id: 'perfil', label: 'Mi Perfil' },
  { id: 'config', label: 'Configuración' },
  // Only for administrators (the partners) — see lib/access.js.
  { id: 'admin', label: 'Administración', adminOnly: true },
]

// Oscuro / Claro en un interruptor pequeño con iconos, como en Configuración.
function ThemeRow() {
  const [light, setLight] = useState(() => document.documentElement.classList.contains('light'))
  const set = (next) => {
    document.documentElement.classList.toggle('light', next)
    try { localStorage.setItem('ador_theme', next ? 'light' : 'dark') } catch { /* sin almacenamiento */ }
    setLight(next)
  }
  const Btn = ({ value, children, label }) => (
    <button type="button" aria-label={label} onClick={() => set(value)} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150" style={{ background: light === value ? '#F5F5F5' : 'transparent', color: light === value ? '#0A0A0A' : '#8A8A8A' }}>
      {children}
    </button>
  )
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[13.5px] text-[#C9C9C9]">Tema</span>
      <div className="flex rounded-full bg-white/[0.07] p-[3px]">
        <Btn value={false} label="Oscuro">{sv(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />)}</Btn>
        <Btn value={true} label="Claro">{sv(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>)}</Btn>
      </div>
    </div>
  )
}

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

function StatusAndHelp({ user, onClose, onSelect, onNavigate }) {
  const [presence, setPresence] = useState(null)
  const [people, setPeople] = useState([])
  const [panel, setPanel] = useState(null) // 'estado' | 'ayuda'
  useEffect(() => subscribeMyPresence(user?.uid, setPresence), [user?.uid])
  useEffect(() => subscribeUsers(setPeople), [])
  const p = presenceOf(presence)
  const me = p.status === 'dnd' || p.status === 'meeting' ? p : { label: 'Disponible', color: '#4CAF50' }
  const t9 = new Date(); t9.setDate(t9.getDate() + 1); t9.setHours(9, 0, 0, 0)
  const choices = [['Disponible', null], ['No molestar 30 min', new Date(Date.now() + 30 * 60000)], ['No molestar 1 h', new Date(Date.now() + 3600000)], ['No molestar hasta mañana 9:00', t9]]
  const admins = people.filter((u) => u.id !== user?.uid && isAdminProfile(u)).slice(0, 4)
  const row = 'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13px] text-[#E8E8E8] transition-colors duration-150 hover:bg-white/[0.07]'
  return (
    <div className="px-1.5 pb-1">
      <button type="button" onClick={() => setPanel(panel === 'estado' ? null : 'estado')} className={row}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07]"><span className="h-2.5 w-2.5 rounded-full" style={{ background: me.color }} /></span>
        <span className="min-w-0 flex-1"><span className="block">Estado</span><span className="block truncate text-[11.5px] text-[#8A8A8A]">{me.label}</span></span>
      </button>
      {panel === 'estado' && (
        <div className="mb-1 ml-10 flex flex-col">
          {choices.map(([label, until]) => (
            <button key={label} type="button" onClick={() => { setDoNotDisturb(user.uid, until).catch(notifyFail); setPanel(null); onClose?.() }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#C9C9C9] hover:bg-white/[0.07]">{label}</button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => { onClose?.(); setTimeout(lockNow, 120) }} className={row}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-[13px] text-[#C9C9C9]">☾</span>
        <span className="flex-1">Pantalla de reposo</span>
        <span className="text-[11px] text-[#8A8A8A]">⌘⇧L</span>
      </button>
      <button type="button" onClick={() => { onSelect?.('tour'); onClose?.() }} className={row}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-[#C9C9C9]">✦</span>Conoce ADOR OS
      </button>
      <button type="button" onClick={() => setPanel(panel === 'ayuda' ? null : 'ayuda')} className={row}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-[13px] text-[#C9C9C9]">?</span>Ayuda y soporte
      </button>
      {panel === 'ayuda' && (
        <div className="mb-1 ml-10 flex flex-col">
          <p className="px-2.5 pb-1 text-[11.5px] text-[#8A8A8A]">Escribe a un administrador</p>
          {admins.map((a) => (
            <button key={a.id} type="button" onClick={() => { onClose?.(); onNavigate?.('chat', { type: 'chat', convType: 'dm', convId: dmIdFor(user.uid, a.id), participantUids: [user.uid, a.id] }) }} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#E4E4E4] hover:bg-white/[0.07]">
              <PersonAvatar uid={a.id} name={userLabel(a)} size={22} />{userLabel(a)}
            </button>
          ))}
          <button type="button" onClick={() => applyUpdate()} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#C9C9C9] hover:bg-white/[0.07]">Actualizar ADOR OS</button>
        </div>
      )}
    </div>
  )
}

export default function ProfileMenu({ user, onClose, onSelect, onNavigate, anchorRect, open, isAdmin }) {
  const ready = useDeferredReveal()
  if (!anchorRect) return null

  const lastSignIn = formatLastSignIn(user)

  const handleClick = (id) => {
    onSelect?.(id)
    onClose?.()
  }

  const visible = open && ready

  return createPortal(
    // See NotificationCenter.jsx for why the transform-animated wrapper and
    // the backdrop-filter surface are two separate elements — Chromium
    // silently drops backdrop-filter's blur compositing when the same
    // element also carries a `transform` (even an at-rest identity one like
    // scale(1)), so combining them here made the menu render with none of
    // the background actually blurred.
    //
    // This component is permanently mounted by TopBar.jsx once the trigger
    // rect is known (not conditionally rendered on `open`) and visibility is
    // purely a CSS toggle here — but `opacity: 0` on the hidden state turned
    // out to still be part of the problem: browsers commonly skip painting
    // (and therefore skip computing/compositing backdrop-filter for) a fully
    // transparent element as a performance optimization, so "permanently
    // mounted at opacity 0" wasn't actually keeping the blur layer warm at
    // all — confirmed still reproducing after that fix. Using an
    // imperceptible-but-nonzero opacity while hidden forces the browser to
    // keep actually painting it, so the blur really is pre-resolved.
    <motion.div
      animate={{ opacity: visible ? 1 : 0.001, y: visible ? 0 : -8, scale: visible ? 1 : 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="z-[999]"
      style={{
        position: 'fixed',
        pointerEvents: visible ? 'auto' : 'none',
        top: anchorRect.bottom + 8,
        right: window.innerWidth - anchorRect.right,
        width: Math.max(anchorRect.width, 250),
      }}
    >
      <div className="ador-glass ador-grain overflow-hidden rounded-[22px]">
        <div className="px-4 pb-2 pt-3.5">
          <p className="truncate text-[14px] font-semibold text-[#F5F5F5]">{user?.displayName || 'Mi cuenta'}</p>
          <p className="truncate text-[12px] text-[#8A8A8A]">{user?.email}</p>
        </div>
        <nav className="flex flex-col px-1.5 pb-1">
          {MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <button key={item.id} type="button" onClick={() => handleClick(item.id)} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[13.5px] text-[#F5F5F5] transition-colors duration-150 hover:bg-white/[0.07]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-[#C9C9C9]">{ICON[item.id]}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mx-4 h-px bg-white/[0.07]" />
        <StatusAndHelp user={user} onClose={onClose} onSelect={onSelect} onNavigate={onNavigate} />
        <div className="mx-4 h-px bg-white/[0.07]" />
        <ThemeRow />
        <div className="mx-4 h-px bg-white/[0.07]" />
        <div className="px-1.5 py-1.5">
          <button type="button" onClick={() => handleClick('logout')} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[13.5px] text-[#E5736F] transition-colors duration-150 hover:bg-[#E5736F]/10">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E5736F]/10">{ICON.logout}</span>
            Cerrar Sesión
          </button>
        </div>
        {lastSignIn && <p className="px-4 text-[11px] text-[#6E6E6E]">Última conexión: {lastSignIn}</p>}
        <p className="px-4 pb-3 pt-0.5 text-[11px] text-[#6E6E6E]">Versión: {typeof __BUILD_ID__ !== 'undefined' ? new Date(Number(__BUILD_ID__)).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : 'desarrollo'}</p>
      </div>
    </motion.div>,
    document.body
  )
}
