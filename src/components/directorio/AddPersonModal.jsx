import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { createDirectoryPerson, updateDirectoryPerson } from '../../lib/firestore'
import { inviteMember } from '../../lib/invite'
import PhotoCropper from '../common/PhotoCropper'
import { withTimeout } from '../../lib/workspace'
import { STATUSES } from '../../lib/directorio'
import Avatar from '../shell/Avatar'
import { useToast } from '../../hooks/useToast'
import { SPRING } from '../../lib/motion'
import { useEscape } from '../../hooks/useEscape'

// Create/edit form for a Directorio entry — same portal + split-transform
// pattern as every centered modal in the app (CLAUDE.md §11), same
// photoDataUrl-on-Firestore pattern ProfileModal already uses for avatars
// (no Firebase Storage dependency, see lib/image.js).
const fold = (v = '') => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Si ya existe "Estrategia", escribir "estrategia" usa esa misma grafía: así las áreas y
// los roles no se parten en variantes y los conteos del Directorio no se rompen.
const canon = (value, list) => {
  const v = value.trim()
  return list.find((x) => fold(x) === fold(v)) || v
}
const uniq = (arr) => [...new Map(arr.filter(Boolean).map((x) => [fold(x), x.trim()])).values()].sort((a, b) => a.localeCompare(b))

// "Nombre, correo, rol" por línea (también pegado desde una hoja de cálculo, con tabuladores).
function parseBulk(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\t|;|,/).map((x) => x.trim()).filter(Boolean)
    const email = parts.find((x) => x.includes('@')) || ''
    const rest = parts.filter((x) => x !== email)
    return { name: rest[0] || '', role: rest[1] || '', email }
  })
}

export default function AddPersonModal({ person, users = [], people = [], actorName, onClose }) {
  useEscape(onClose)
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
  const [startDate, setStartDate] = useState(person?.startDate || '')
  const [reportsTo, setReportsTo] = useState(person?.reportsTo || '')
  const [photoDataUrl, setPhotoDataUrl] = useState(person?.photoFromAccount ? null : person?.photoDataUrl || null)
  const [linkedUserId, setLinkedUserId] = useState(person?.linkedUserId || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('one') // 'one' | 'many' (solo al crear)
  const [step, setStep] = useState(1)
  const [invite, setInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState('member')
  const [bulk, setBulk] = useState('')
  const areaOptions = uniq(people.map((p) => p.area))
  const roleOptions = uniq(people.map((p) => p.role))

  // Real ADOR OS accounts (users/{uid}, self-registered on login) not
  // already linked to some other Directorio entry — picking one here fills
  // in name/email instead of retyping what already exists, and stops two
  // Directorio entries from silently claiming the same real account. The
  // entry being edited keeps its own link available in the list.
  const linkableUsers = users.filter((u) => u.id === linkedUserId || !people.some((p) => p.linkedUserId === u.id && p.id !== person?.id))

  // With no photo of their own, a linked person uses their profile photo.
  const accountPhoto = users.find((u) => u.id === linkedUserId)?.photoDataUrl || null
  const shownPhoto = photoDataUrl || accountPhoto

  const applyLinkedUser = (uid) => {
    setLinkedUserId(uid)
    const account = users.find((u) => u.id === uid)
    if (account) {
      setName(account.displayName || account.email || '')
      setEmail(account.email || '')
    }
  }

  const [cropFile, setCropFile] = useState(null)
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    setCropFile(file)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !role.trim()) {
      setError('Nombre y rol son obligatorios.')
      if (step === 2) setStep(1)
      return
    }
    if (invite && !EMAIL_RE.test(email.trim())) {
      setError('Para darle acceso a ADOR OS necesita un correo válido.')
      setStep(1)
      return
    }
    setSaving(true)
    setError('')
    let linkId = linkedUserId
    if (!isEdit && invite) {
      try {
        const res = await inviteMember({ email, name, role: inviteRole, invitedBy: actorName })
        linkId = res.uid || users.find((u) => (u.email || '').toLowerCase() === email.trim().toLowerCase())?.id || ''
        showToast(res.existed ? 'Esa persona ya tenía cuenta: le enviamos un correo para entrar.' : `Invitación enviada a ${email.trim()}.`)
      } catch (err) {
        setError(`No pudimos invitarla: ${err.message}`)
        setSaving(false)
        return
      }
    }
    const data = {
      name: name.trim(),
      role: canon(role, roleOptions),
      area: canon(area, areaOptions),
      status,
      location: location.trim(),
      email: email.trim(),
      timezone: timezone.trim(),
      quote: quote.trim(),
      about: about.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      isDirectivo,
      startDate: startDate || null,
      reportsTo: reportsTo || null,
      photoDataUrl: photoDataUrl || null,
      linkedUserId: linkId || null,
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

  const bulkRows = parseBulk(bulk)
  const submitBulk = async (e) => {
    e.preventDefault()
    const rows = bulkRows.filter((r) => r.name)
    if (!rows.length) { setError('Pega al menos una persona: una por línea.'); return }
    setSaving(true)
    setError('')
    let ok = 0, invited = 0
    const failed = []
    for (const r of rows) {
      try {
        let linkId = null
        if (invite && EMAIL_RE.test(r.email)) {
          const res = await inviteMember({ email: r.email, name: r.name, role: 'member', invitedBy: actorName })
          linkId = res.uid || users.find((u) => (u.email || '').toLowerCase() === r.email.toLowerCase())?.id || null
          invited++
        }
        await withTimeout(createDirectoryPerson({ name: r.name, role: canon(r.role || 'Equipo', roleOptions), area: '', status: 'disponible', location: 'Lima, PE', email: r.email, timezone: 'GMT-5', quote: '', about: '', tags: [], isDirectivo: false, photoDataUrl: null, linkedUserId: linkId }, actorName))
        ok++
      } catch (err) {
        failed.push(`${r.name} (${err.message})`)
      }
    }
    setSaving(false)
    if (failed.length) setError(`Se añadieron ${ok}; fallaron: ${failed.join('; ')}`)
    else {
      showToast(`Se añadieron ${ok} personas${invited ? ` y se invitó a ${invited}` : ''}.`)
      onClose()
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-2.5 text-[13px] text-[#F5F5F5] placeholder:text-[#8A8A8A] outline-none transition-colors duration-150 focus:border-white/[0.2]'
  const labelClass = 'mb-1.5 block font-medium text-[#8A8A8A]'
  const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }

  return (
    <>
    {cropFile && (
      <PhotoCropper
        file={cropFile}
        round
        outWidth={256}
        title="Encuadra la foto"
        onDone={(url) => {
          setPhotoDataUrl(url)
          setCropFile(null)
        }}
        onCancel={() => setCropFile(null)}
      />
    )}
    {createPortal(
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
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px]"
      >
        <div className="ador-modal-surface ador-grain max-h-[85vh] overflow-y-auto rounded-[28px] p-8">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">{isEdit ? 'Editar persona' : mode === 'many' ? 'Añadir varias personas' : step === 1 ? 'Añadir persona' : 'Completa su perfil'}</h2>
          {!isEdit && step === 1 && (
            <div className="mt-4 flex w-fit items-center gap-1 rounded-full bg-white/[0.06] p-1">
              {[['one', 'Una persona'], ['many', 'Varias a la vez']].map(([id, label]) => (
                <button key={id} type="button" onClick={() => { setMode(id); setError('') }} className="rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors" style={{ background: mode === id ? '#F5F5F5' : 'transparent', color: mode === id ? '#0A0A0A' : '#888888' }}>{label}</button>
              ))}
            </div>
          )}
          {!isEdit && mode === 'one' && <p className="mt-2 text-[11.5px] text-[#8A8A8A]">Paso {step} de 2 {step === 1 ? '· lo esencial' : '· opcional, puedes completarlo después'}</p>}

          {(isEdit || (mode === 'one' && step === 2)) && (
            <div className="mt-5 flex items-center gap-4">
              <Avatar photoURL={shownPhoto} displayName={name} size={56} />
              <label className="cursor-pointer text-[13px] font-medium text-[#F4EEE2] hover:underline">
                {photoDataUrl ? 'Cambiar foto' : accountPhoto ? 'Usar otra foto' : 'Subir foto'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              {!photoDataUrl && accountPhoto && <span className="text-[12px] text-[#8A8A8A]">Foto de su perfil de ADOR OS</span>}
              {photoDataUrl && accountPhoto && (
                <button type="button" onClick={() => setPhotoDataUrl(null)} className="text-[12px] text-[#8A8A8A] hover:text-[#F5F5F5]">
                  Usar la de su perfil
                </button>
              )}
            </div>
          )}

          <datalist id="dir-areas">{areaOptions.map((a) => <option key={a} value={a} />)}</datalist>
          <datalist id="dir-roles">{roleOptions.map((r) => <option key={r} value={r} />)}</datalist>

          {!isEdit && mode === 'many' ? (
            <form onSubmit={submitBulk} className="mt-5 flex flex-col gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Una persona por línea</label>
                <textarea rows={7} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Ana Torres, ana@ador.com, Analista\nLuis Ramos, luis@ador.com, Strategy Manager'} className={`${inputClass} resize-none font-mono text-[12px] leading-relaxed`} />
                <p className="mt-1.5 text-[11px] text-[#8A8A8A]">Nombre, correo y rol, separados por coma o tabulador (también puedes pegar columnas desde una hoja de cálculo). El área y el resto se completan después.</p>
              </div>
              {bulkRows.length > 0 && <p className="text-[12px] text-[#B5B5B5]">{bulkRows.filter((r) => r.name).length} personas detectadas{bulkRows.some((r) => r.email) ? `, ${bulkRows.filter((r) => EMAIL_RE.test(r.email)).length} con correo válido` : ''}.</p>}
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[#F5F5F5]">
                <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-[#F4EEE2]" />
                <span>También darles acceso a ADOR OS<span className="block text-[11.5px] text-[#8A8A8A]">Se invita como Miembro a quienes tengan correo válido y reciben un correo para crear su contraseña.</span></span>
              </label>
              {error && <p className="text-[12px] text-[#EF9A98]">{error}</p>}
              <div className="mt-2 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]">Cancelar</button>
                <button type="submit" disabled={saving || !bulkRows.some((r) => r.name)} className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium disabled:opacity-50">{saving ? 'Añadiendo…' : 'Añadir personas'}</button>
              </div>
            </form>
          ) : (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            {(isEdit || step === 1) && (
              <>
                {linkableUsers.length > 0 && !invite && (
                  <div>
                    <label className={labelClass} style={labelStyle}>Vincular con cuenta de ADOR OS (opcional)</label>
                    <select value={linkedUserId} onChange={(e) => applyLinkedUser(e.target.value)} className={inputClass}>
                      <option value="">— Sin vincular —</option>
                      {linkableUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-[#8A8A8A]">Si ya tiene cuenta en ADOR OS, elígela aquí y se rellenan nombre y correo solos.</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} style={labelStyle}>Nombre</label>
                    <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>Rol</label>
                    <input type="text" list="dir-roles" value={role} onChange={(e) => setRole(e.target.value)} placeholder="ej. Strategy Manager" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Correo</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@ador.com" className={inputClass} />
                </div>
                {!isEdit && (
                  <div className="rounded-2xl bg-white/[0.04] p-4">
                    <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[#F5F5F5]">
                      <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-[#F4EEE2]" />
                      <span>También darle acceso a ADOR OS<span className="block text-[11.5px] text-[#8A8A8A]">Recibe un correo para crear su contraseña. Sin esto, es solo una ficha del directorio.</span></span>
                    </label>
                    {invite && (
                      <div className="mt-3 flex items-center gap-2 pl-6">
                        <span className="text-[12px] text-[#8A8A8A]">Entra como</span>
                        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-lg border border-white/[0.08] bg-[#1A1A1A] px-2.5 py-1.5 text-[12px] text-[#F5F5F5] outline-none">
                          <option value="member">Miembro</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {(isEdit || step === 2) && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} style={labelStyle}>Área</label>
                    <input type="text" list="dir-areas" value={area} onChange={(e) => setArea(e.target.value)} placeholder="ej. Estrategia" className={inputClass} />
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} style={labelStyle}>Reporta a</label>
                    <select value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} className={inputClass}>
                      <option value="">— Nadie —</option>
                      {people.filter((p) => p.id !== person?.id).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>Se unió a ADOR</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                  </div>
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
                  <input type="checkbox" checked={isDirectivo} onChange={(e) => setIsDirectivo(e.target.checked)} className="h-3.5 w-3.5 accent-[#F4EEE2]" />
                  Forma parte de Dirección
                </label>
              </>
            )}

            {error && <p className="text-[12px] text-[#EF9A98]">{error}</p>}

            <div className="mt-2 flex items-center justify-end gap-3">
              {!isEdit && step === 2 && <button type="button" onClick={() => setStep(1)} className="mr-auto rounded-xl px-2 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]">← Atrás</button>}
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]">Cancelar</button>
              {!isEdit && step === 1 ? (
                <>
                  <button type="submit" disabled={saving} className="rounded-xl bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-[#F5F5F5] transition-colors hover:bg-white/[0.14] disabled:opacity-50">{saving ? 'Guardando…' : 'Añadir ahora'}</button>
                  <button type="button" onClick={() => { if (!name.trim() || !role.trim()) setError('Nombre y rol son obligatorios.'); else { setError(''); setStep(2) } }} className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium">Continuar →</button>
                </>
              ) : (
                <button type="submit" disabled={saving} className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium disabled:opacity-60">
                  {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Añadir persona'}
                </button>
              )}
            </div>
          </form>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )}
    </>
  )
}
