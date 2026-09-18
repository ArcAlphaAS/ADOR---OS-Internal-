import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { createDirectoryPerson, updateDirectoryPerson } from '../../lib/firestore'
import { resizeImageToDataUrl } from '../../lib/image'
import { withTimeout } from '../../lib/workspace'
import { STATUSES } from '../../lib/directorio'
import Avatar from '../shell/Avatar'
import { useToast } from '../../hooks/useToast'

// Create/edit form for a Directorio entry — same portal + split-transform
// pattern as every centered modal in the app (CLAUDE.md §11), same
// photoDataUrl-on-Firestore pattern ProfileModal already uses for avatars
// (no Firebase Storage dependency, see lib/image.js).
export default function AddPersonModal({ person, actorName, onClose }) {
  const showToast = useToast()
  const isEdit = Boolean(person)
  const [name, setName] = useState(person?.name || '')
  const [role, setRole] = useState(person?.role || '')
  const [area, setArea] = useState(person?.area || '')
  const [status, setStatus] = useState(person?.status || 'disponible')
  const [location, setLocation] = useState(person?.location || 'Lima, PE')
  const [email, setEmail] = useState(person?.email || '')
  const [timezone, setTimezone] = useState(person?.timezone || 'GMT-5')
  const [quote, setQuote] = useState(person?.quote || '')
  const [about, setAbout] = useState(person?.about || '')
  const [tags, setTags] = useState((person?.tags || []).join(', '))
  const [isDirectivo, setIsDirectivo] = useState(person?.isDirectivo || false)
  const [photoDataUrl, setPhotoDataUrl] = useState(person?.photoDataUrl || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    try {
      setPhotoDataUrl(await resizeImageToDataUrl(file))
    } catch {
      showToast('No pudimos procesar esa imagen.')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !role.trim()) {
      setError('Nombre y rol son obligatorios.')
      return
    }
    setSaving(true)
    setError('')
    const data = {
      name: name.trim(),
      role: role.trim(),
      area: area.trim(),
      status,
      location: location.trim(),
      email: email.trim(),
      timezone: timezone.trim(),
      quote: quote.trim(),
      about: about.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      isDirectivo,
      photoDataUrl: photoDataUrl || null,
    }
    try {
      if (isEdit) await withTimeout(updateDirectoryPerson(person.id, data))
      else await withTimeout(createDirectoryPerson(data, actorName))
      onClose()
    } catch (err) {
      setError(`No pudimos guardar los cambios: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-2.5 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]'
  const labelClass = 'mb-1.5 block font-medium text-[#444444]'
  const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px] p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px]"
      >
        <div className="ador-modal-surface ador-grain max-h-[85vh] overflow-y-auto rounded-[28px] p-8">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">{isEdit ? 'Editar persona' : 'Añadir persona'}</h2>

          <div className="mt-5 flex items-center gap-4">
            <Avatar photoURL={photoDataUrl} displayName={name} size={56} />
            <label className="cursor-pointer text-[13px] font-medium text-[#1E5FAD] hover:underline">
              {photoDataUrl ? 'Cambiar foto' : 'Subir foto'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={labelStyle}>Nombre</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Rol</label>
                <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="ej. Strategy Manager" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={labelStyle}>Área</label>
                <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="ej. Estrategia" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Estado</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={labelStyle}>Ubicación</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Zona horaria</label>
                <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Correo</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@ador.com" className={inputClass} />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Frase (opcional)</label>
              <input type="text" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder='"Construir lo que permanece."' className={inputClass} />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Sobre mí (opcional)</label>
              <textarea rows={2} value={about} onChange={(e) => setAbout(e.target.value)} className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Áreas de responsabilidad (separadas por coma)</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Estrategia, Growth, Operaciones" className={inputClass} />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[#F5F5F5]">
              <input type="checkbox" checked={isDirectivo} onChange={(e) => setIsDirectivo(e.target.checked)} className="h-3.5 w-3.5 accent-[#1E5FAD]" />
              Forma parte de Dirección
            </label>

            {error && <p className="text-[12px] text-[#888888]">{error}</p>}

            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]">
                Cancelar
              </button>
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
                className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium disabled:opacity-60"
              >
                {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Añadir persona'}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
