import { motion, AnimatePresence } from 'framer-motion'
import Avatar from '../shell/Avatar'
import { GiftIcon } from '../icons'

// A handful of small dots that drift upward and fade — restrained enough to
// read as "occasion" rather than a party popper. Fixed seeds (not random on
// every render) so the layout doesn't jitter on re-render.
const CONFETTI = [
  { left: '8%', delay: 0, color: '#1E5FAD' },
  { left: '22%', delay: 0.6, color: '#B8860B' },
  { left: '55%', delay: 0.3, color: '#F5F5F5' },
  { left: '78%', delay: 0.9, color: '#1E5FAD' },
  { left: '92%', delay: 0.45, color: '#B8860B' },
]

function BirthdayCard({ person, isSelf }) {
  return (
    // Transform (y/scale) lives on this outer wrapper, not on the
    // ador-glass element itself — see NotificationCenter.jsx for why:
    // Chromium drops backdrop-filter's blur compositing when the same
    // element also carries a transform.
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div
        className="ador-glass ador-grain relative flex items-center gap-4 overflow-hidden rounded-3xl px-7 py-6"
        style={{
          backgroundImage:
            'radial-gradient(120% 140% at 0% 0%, rgba(30,95,173,0.18) 0%, transparent 55%), radial-gradient(120% 140% at 100% 100%, rgba(184,134,11,0.14) 0%, transparent 55%)',
        }}
      >
        {CONFETTI.map((c, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute bottom-0 h-1.5 w-1.5 rounded-full"
            style={{ left: c.left, backgroundColor: c.color }}
            animate={{ y: [-4, -64], opacity: [0, 0.7, 0] }}
            transition={{ duration: 3.2, delay: c.delay, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}

        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-[#B8860B]"
          style={{
            backgroundColor: 'rgba(184,134,11,0.12)',
            border: '1px solid rgba(184,134,11,0.25)',
            animation: 'ador-pulse 3.5s ease-in-out infinite',
          }}
        >
          <GiftIcon size={20} />
        </div>

        <Avatar photoURL={person.photoDataUrl} displayName={person.displayName} size={40} />

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-[#F5F5F5]">
            {isSelf ? `¡Feliz cumpleaños, ${person.displayName.split(' ')[0]}!` : `Hoy es el cumpleaños de ${person.displayName}`}
          </p>
          <p className="mt-0.5 text-[13px] font-light text-[#888888]">
            {isSelf ? 'Todo el equipo ADOR te desea un excelente día.' : 'Un buen momento para saludarle hoy.'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default function BirthdayBanner({ birthdays, currentUserId }) {
  if (!birthdays?.length) return null

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {birthdays.map((person) => (
          <BirthdayCard key={person.uid} person={person} isSelf={person.uid === currentUserId} />
        ))}
      </AnimatePresence>
    </div>
  )
}
