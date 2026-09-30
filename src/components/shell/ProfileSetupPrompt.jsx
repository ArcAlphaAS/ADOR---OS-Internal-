import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { saveUserProfile } from '../../lib/firestore'
import { SPRING } from '../../lib/motion'
import ProfileModal from './ProfileModal'

// First-login nudge: confirm your name and add a photo, so the team sees
// real faces in the chat, Workspace and Directorio from day one. Shown once
// per account to anyone with no photo (`users/{uid}.profileSetupAt` set when
// they finish or skip — either way it never comes back). Opens the regular
// ProfileModal so there's one place that edits a profile.
export default function ProfileSetupPrompt({ user, onUpdateDisplayName, onDone }) {
  const [editing, setEditing] = useState(false)
  const first = (user?.displayName || '').split(' ')[0]

  const finish = () => {
    if (user?.uid && user.uid !== 'preview') saveUserProfile(user.uid, { profileSetupAt: Date.now() }).catch(() => {})
    onDone()
  }

  if (editing) {
    return <AnimatePresence><ProfileModal key="setup-profile" user={user} onSave={onUpdateDisplayName} onClose={finish} /></AnimatePresence>
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[10px]"
    >
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING}>
        <div className="ador-modal-surface ador-grain w-full max-w-[400px] rounded-[28px] p-8">
          <span className="font-medium text-[#777777]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Bienvenido a ADOR OS
          </span>
          <h2 className="mt-2 text-[19px] font-semibold leading-snug text-[#F5F5F5]">{first ? `${first}, completa tu perfil` : 'Completa tu perfil'}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#888888]">
            Confirma cómo quieres que aparezca tu nombre y sube una foto: es lo que verá el equipo en el chat, en las tareas asignadas y en el Directorio. Toma un minuto y puedes cambiarlo cuando quieras desde tu foto arriba a la derecha.
          </p>
          <div className="mt-6 flex gap-2.5">
            <button type="button" onClick={finish} className="flex-1 rounded-xl border border-white/10 py-2.5 text-[13px] font-medium text-[#AAAAAA] transition-colors hover:bg-white/[0.05]">
              Ahora no
            </button>
            <button type="button" onClick={() => setEditing(true)} className="ador-btn-primary flex-1 rounded-xl py-2.5 text-[13px] font-medium">
              Completar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
