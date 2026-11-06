import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { BellIcon, MessageIcon, CheckCircleIcon, GlobeIcon, UsersIcon, ClockIcon } from '../icons'
import useDeferredReveal from '../../hooks/useDeferredReveal'
import usePhone from '../../hooks/usePhone'
import PreviewText from '../chat/PreviewText'
import { SHEET, isTouchLayout } from '../../lib/motion'
import { keyOfNotification } from '../../hooks/useArchivedNotifications'

// Cada aviso lleva su origen (`kind`, puesto en TopBar); aquí decide el icono y el filtro.
const KIND = {
  chat: { label: 'Chat', Icon: MessageIcon, color: '#F4EEE2' },
  task: { label: 'Tareas', Icon: CheckCircleIcon, color: '#E8C15A' },
  news: { label: 'News', Icon: GlobeIcon, color: '#F4EEE2' },
  community: { label: 'Comunidad', Icon: UsersIcon, color: '#F4EEE2' },
  client: { label: 'Clientes', Icon: ClockIcon, color: '#D98A86' },
}

const Check = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
const Undo = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></svg>

// Una fila. En el teléfono se arrastra hacia la derecha para archivarla (o
// restaurarla, en Archivadas); con mouse hay un botón al pasar encima.
function Row({ item, archivedView, onArchive, onRestore, onItemClick }) {
  const K = KIND[item.kind] || KIND.client
  const touch = isTouchLayout()
  const act = () => (archivedView ? onRestore(item) : onArchive(item))
  const open = () => {
    item.onClick?.()
    onItemClick?.()
  }
  return (
    <li className="group relative overflow-hidden border-b border-white/[0.05] last:border-0">
      {touch && (
        <div className="absolute inset-0 flex items-center gap-2 bg-[#F4EEE2] px-5 text-[13px] font-semibold text-[#1C1A16]">
          {archivedView ? <Undo /> : <Check />} {archivedView ? 'Restaurar' : 'Archivar'}
        </div>
      )}
      <motion.div
        {...(touch ? { drag: 'x', dragConstraints: { left: 0, right: 0 }, dragElastic: { left: 0.05, right: 0.7 }, dragSnapToOrigin: true, onDragEnd: (_e, info) => (info.offset.x > 110 || info.velocity.x > 700) && act() } : {})}
        className="relative flex items-start gap-3 bg-[#161616] px-5 py-3.5 md:bg-transparent"
      >
        <button type="button" onClick={open} disabled={!item.onClick} className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.07]" style={{ color: K.color }}>
            <K.Icon size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-3 text-[13.5px] leading-snug text-[#E4E4E4]"><PreviewText text={item.text} /></span>
            <span className="mt-0.5 block text-[12px] text-[#767676]">{K.label}{item.time ? ` · ${item.time}` : ''}</span>
          </span>
        </button>
        {!touch && (
          <button type="button" onClick={act} title={archivedView ? 'Restaurar' : 'Archivar'} className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#8A8A8A] opacity-0 transition-opacity duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5] group-hover:opacity-100">
            {archivedView ? <Undo size={14} /> : <Check size={14} />}
          </button>
        )}
        {!archivedView && item.onClick && <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: '#F4EEE2' }} />}
      </motion.div>
    </li>
  )
}

function Panel({ items, archivedItems, onArchive, onRestore, onItemClick }) {
  const [view, setView] = useState('inbox') // 'inbox' | 'archived'
  const [tab, setTab] = useState('all')
  const list = view === 'inbox' ? items : archivedItems
  const kinds = Object.keys(KIND).filter((k) => list.some((i) => i.kind === k))
  const shown = tab === 'all' || !kinds.includes(tab) ? list : list.filter((i) => i.kind === tab)

  return (
    <>
      <div className="flex items-center gap-2.5 px-5 pb-1 pt-4">
        <span className="text-[16px] font-semibold text-[#F5F5F5]">Notificaciones</span>
        {view === 'inbox' && items.length > 0 && (
          <button type="button" onClick={() => onArchive(shown)} className="ml-auto text-[12.5px] font-medium text-[#8A8A8A] hover:text-[#F4EEE2]">
            Marcar todo como leído
          </button>
        )}
      </div>

      <div className="flex items-center gap-5 border-b border-white/[0.06] px-5">
        {[['inbox', 'Bandeja', items.length], ['archived', 'Archivadas', archivedItems.length]].map(([id, label, n]) => (
          <button key={id} type="button" onClick={() => { setView(id); setTab('all') }} className="relative flex items-center gap-1.5 py-2.5 text-[13.5px] font-medium" style={{ color: view === id ? '#F5F5F5' : '#767676' }}>
            {label}
            <span className="rounded-full px-1.5 text-[11px] tabular-nums" style={{ background: view === id ? '#F4EEE2' : 'rgba(255,255,255,0.08)', color: view === id ? '#1C1A16' : '#9A9A9A' }}>{n}</span>
            {view === id && <motion.span layoutId="notif-underline" className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[#F4EEE2]" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
          </button>
        ))}
      </div>

      {kinds.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 pt-3 [scrollbar-width:none]">
          {['all', ...kinds].map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} className="flex-shrink-0 rounded-full px-3 py-1 text-[12.5px] font-medium" style={{ background: tab === k ? '#F5F5F5' : 'rgba(255,255,255,0.07)', color: tab === k ? '#0A0A0A' : '#9A9A9A' }}>
              {k === 'all' ? 'Todas' : KIND[k].label}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06]"><BellIcon size={18} className="text-[#767676]" /></span>
          <p className="text-[14px] font-medium text-[#C9C9C9]">{view === 'inbox' ? 'Todo al día' : 'Nada archivado'}</p>
          <p className="text-[12.5px] text-[#767676]">{view === 'inbox' ? 'Cuando pase algo que te toque, lo verás aquí.' : 'Lo que archives queda aquí, por si lo necesitas.'}</p>
        </div>
      ) : (
        <ul className="mt-1 max-h-[440px] overflow-y-auto border-t border-white/[0.06] max-md:max-h-[60dvh]">
          {shown.map((item) => <Row key={keyOfNotification(item)} item={item} archivedView={view === 'archived'} onArchive={onArchive} onRestore={onRestore} onItemClick={onItemClick} />)}
        </ul>
      )}
      {isTouchLayout() && shown.length > 0 && view === 'inbox' && <p className="px-5 pb-3 pt-2 text-center text-[11.5px] text-[#636366]">Desliza hacia la derecha para archivar</p>}
    </>
  )
}

export default function NotificationCenter({ items = [], archivedItems = [], onArchive, onRestore, anchorRect, open, onItemClick }) {
  const ready = useDeferredReveal()
  const phone = usePhone()
  if (!anchorRect) return null
  const visible = open && ready

  // Teléfono: una hoja que sube desde abajo, no un globo pegado a la campana.
  if (phone) {
    return createPortal(
      <motion.div
        initial={false}
        animate={{ y: visible ? 0 : '110%' }}
        transition={SHEET}
        className="z-[999]"
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, pointerEvents: visible ? 'auto' : 'none' }}
      >
        <div className="ador-modal-surface overflow-hidden rounded-t-[30px]" style={{ background: '#161616', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/[0.22]" />
          <Panel items={items} archivedItems={archivedItems} onArchive={onArchive} onRestore={onRestore} onItemClick={onItemClick} />
        </div>
      </motion.div>,
      document.body
    )
  }

  return createPortal(
    // Animation (opacity/y/scale => transform) lives on this outer wrapper,
    // not on the glass element itself (Chromium drops the backdrop blur when
    // both share an element). Permanently mounted by TopBar.jsx — see
    // ProfileMenu.jsx for why hidden uses opacity 0.001 rather than 0.
    <motion.div
      animate={{ opacity: visible ? 1 : 0.001, y: visible ? 0 : -8, scale: visible ? 1 : 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="z-[999]"
      style={{
        position: 'fixed',
        pointerEvents: visible ? 'auto' : 'none',
        top: anchorRect.bottom + 12,
        right: Math.max(12, window.innerWidth - anchorRect.right),
      }}
    >
      <div className="ador-glass ador-grain w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-[22px]">
        <Panel items={items} archivedItems={archivedItems} onArchive={onArchive} onRestore={onRestore} onItemClick={onItemClick} />
      </div>
    </motion.div>,
    document.body
  )
}
