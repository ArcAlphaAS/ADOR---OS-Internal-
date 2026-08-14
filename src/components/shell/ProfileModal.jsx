import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { getUserProfile, saveUserProfile } from '../../lib/firestore'

const inputClass =
  'w-full rounded-xl border bg-[#1A1A1A] px-4 py-[12px] text-[14px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150'

export default function ProfileModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user?.displayName || '')
  const [birthday, setBirthday] = useState('')
  const [focused, setFocused] = useState(false)
  const [birthdayFocused, setBirthdayFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.uid) return
    getUserProfile(user.uid).then((profile) => {
      if (profile?.birthday) setBirthday(profile.birthday)
    })
  }, [user?.uid])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('El nombre no puede estar vacío.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(trimmed)
      await saveUserProfile(user.uid, { birthday: birthday || null })
      onClose()
    } catch {
      setError('No pudimos guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="ador-modal-surface ador-grain w-[380px] rounded-[28px] p-8"
      >
        <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Mi Perfil</h2>
        <p className="mt-1 text-[13px] text-[#888888]">{user?.email}</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label
              className="mb-1.5 block font-medium text-[#444444]"
              style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Tu nombre completo"
              className={inputClass}
              style={{ borderColor: focused ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)' }}
            />
            {error && <p className="mt-2 px-1 text-[12px] text-[#888888]">{error}</p>}
          </div>

          <div>
            <label
              className="mb-1.5 block font-medium text-[#444444]"
              style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              Cumpleaños
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              onFocus={() => setBirthdayFocused(true)}
              onBlur={() => setBirthdayFocused(false)}
              className={inputClass}
              style={{
                borderColor: birthdayFocused ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                colorScheme: 'dark',
              }}
            />
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]"
            >
              Cancelar
            </button>
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.15 }}
              className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  )
}
