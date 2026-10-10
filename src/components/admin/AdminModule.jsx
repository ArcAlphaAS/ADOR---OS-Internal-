import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  subscribeAllowedEmails,
  subscribeUsers,
  subscribeUsersRaw, setCommunityOrganizer,
  subscribeAllTasks,
  deleteUserProfile,
  unassignFromTasks,
  subscribePresence,
  subscribeAccessSettings,
  setMemberModules,
  setUserRole,
  allowEmail,
  revokeEmail,
  saveUserProfile,
  subscribeInterventionTemplate,
  saveInterventionTemplate,
  subscribeErrorLogs,
  resolveErrorLog,
} from '../../lib/firestore'
import { isAdmin as isAdminProfile } from '../../lib/permissions'
import { MODULES, DEFAULT_MEMBER_MODULES } from '../../lib/access'
import { presenceOf } from '../../lib/chat'
import { inviteMember, resendAccessEmail } from '../../lib/invite'
import { withTimeout, LAYERS, PRIORITIES, layerWeekSpan } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'
import PhotoCropper from '../common/PhotoCropper'
import { DriveFolderSection, BackupSection, SeasonSection } from './DataSections'

// Administración (admins only — lib/access.js). Four tabs:
//   Personas — who has access, their role, invite / resend / remove
//   Accesos  — which modules a Miembro can open
//   Errores  — failures reported from anyone's ADOR OS (lib/errorLog.js)
//   Datos    — the company's Drive folder and "Exportar todo"
const TABS = [
  { id: 'personas', label: 'Personas' },
  { id: 'accesos', label: 'Accesos' },
  { id: 'plantilla', label: 'Plantilla' },
  { id: 'errores', label: 'Errores' },
  { id: 'datos', label: 'Datos' },
]

const card = 'ador-glass ador-grain rounded-2xl p-6'
const inputClass = 'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-2.5 text-[13px] text-[#F5F5F5] placeholder:text-[#666666] outline-none focus:border-white/[0.2]'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Administrador'
}

function RoleSelect({ value, disabled, onChange }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-white/[0.1] bg-[#141414] px-2.5 py-1.5 text-[12.5px] text-[#DDDDDD] outline-none disabled:opacity-50"
    >
      <option value="admin">Administrador</option>
      <option value="miembro">Miembro</option>
    </select>
  )
}

function PeopleTab({ user }) {
  const [allowed, setAllowed] = useState([])
  const [users, setUsers] = useState([])
  const [presence, setPresence] = useState({})
  const [form, setForm] = useState({ name: '', email: '', role: 'miembro' })
  const [inviting, setInviting] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(null)
  const [rawUsers, setRawUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [cleaning, setCleaning] = useState(false)
  const [editing, setEditing] = useState(null) // { email (original), name, newEmail }
  const [saving, setSaving] = useState(false)
  const [photoTarget, setPhotoTarget] = useState(null) // the row whose photo is being set
  const [cropFile, setCropFile] = useState(null)
  const photoInput = useRef(null)
  const showToast = useToast()

  useEffect(() => subscribeAllowedEmails(setAllowed), [])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribePresence(setPresence), [])
  useEffect(() => subscribeUsersRaw(setRawUsers), [])
  useEffect(() => subscribeAllTasks(setTasks), [])

  const byEmail = new Map(users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]))
  const rows = allowed
    .map((a) => {
      const email = a.id.toLowerCase()
      const account = byEmail.get(email)
      const role = account ? (isAdminProfile(account) ? 'admin' : 'miembro') : a.role || 'miembro'
      return { email, account, name: account?.displayName || a.name || email.split('@')[0], role, invited: !account, allowed: a }
    })
    .sort((x, y) => (x.role === y.role ? x.name.localeCompare(y.name) : x.role === 'admin' ? -1 : 1))
  const adminCount = rows.filter((r) => r.role === 'admin' && !r.invited).length
  const me = (user?.email || '').toLowerCase()

  // Restos de personas que ya no tienen acceso: su perfil sigue en `users` y
  // sus tareas abiertas siguen a su nombre. Aquí se limpian con un clic.
  const allowedSet = new Set(allowed.map((a) => a.id.toLowerCase()))
  const activeIds = new Set(users.map((u) => u.id))
  const ghosts = rawUsers.filter((u) => !u.email || !allowedSet.has(u.email.toLowerCase()))
  const orphanTasks = tasks
    .filter((t) => t.status !== 'completado' && (t.assignedTo || []).some((id) => !activeIds.has(id)))
    .map((t) => ({
      id: t.id,
      assignedTo: (t.assignedTo || []).filter((id) => activeIds.has(id)),
      pendingConfirmations: (t.pendingConfirmations || []).filter((id) => activeIds.has(id)),
    }))
  const cleanUp = async () => {
    setCleaning(true)
    try {
      if (orphanTasks.length) await withTimeout(unassignFromTasks(orphanTasks), 20000)
      for (const g of ghosts) await withTimeout(deleteUserProfile(g.id))
      showToast('Listo: limpiamos los restos de personas sin acceso.')
    } catch (e) {
      showToast(`No se pudo limpiar: ${e.message}`)
    } finally {
      setCleaning(false)
    }
  }

  const changeRole = async (row, role) => {
    if (row.email === me) return showToast('No puedes cambiar tu propio rol.')
    if (row.role === 'admin' && role !== 'admin' && adminCount <= 1) return showToast('Debe quedar al menos un administrador.')
    try {
      await withTimeout(allowEmail(row.email, { role }))
      if (row.account) await withTimeout(setUserRole(row.account.id, role === 'admin'))
      showToast(`${row.name.split(' ')[0]} ahora es ${role === 'admin' ? 'Administrador' : 'Miembro'}.`)
    } catch (e) {
      showToast(`No se pudo cambiar el rol: ${e.message}`)
    }
  }

  const toggleOrganizer = async (row) => {
    if (!row.account) return
    const next = row.account.communityOrganizer !== true
    try {
      await withTimeout(setCommunityOrganizer(row.account.id, next))
      showToast(next ? `${row.name.split(' ')[0]} ya puede organizar encuentros.` : `${row.name.split(' ')[0]} ya no organiza encuentros.`)
    } catch (e) {
      showToast(`No se pudo cambiar el permiso: ${e.message}`)
    }
  }

  // The admin sets (or removes) a member's photo. It's the account's own
  // photo (users/{uid}.photoDataUrl), so it shows everywhere that person does
  // — unless their Directorio entry has a photo of its own, which wins.
  const pickPhotoFor = (row) => {
    setPhotoTarget(row)
    photoInput.current?.click()
  }
  const savePhoto = async (row, photoDataUrl) => {
    if (!row?.account) return
    try {
      await withTimeout(saveUserProfile(row.account.id, { photoDataUrl }))
      showToast(photoDataUrl ? `Foto de ${row.name.split(' ')[0]} actualizada.` : `Foto de ${row.name.split(' ')[0]} quitada.`)
    } catch (e) {
      showToast(`No se pudo guardar la foto: ${e.message}`)
    }
  }

  const revoke = async (row) => {
    if (row.email === me) return showToast('No puedes quitarte el acceso a ti mismo.')
    if (row.role === 'admin' && adminCount <= 1) return showToast('Debe quedar al menos un administrador.')
    if (confirmRevoke !== row.email) return setConfirmRevoke(row.email)
    setConfirmRevoke(null)
    try {
      await withTimeout(revokeEmail(row.email))
      showToast(`${row.name.split(' ')[0]} ya no tiene acceso a ADOR OS.`)
    } catch (e) {
      showToast(`No se pudo quitar el acceso: ${e.message}`)
    }
  }

  // Editar nombre y, mientras la persona aún no ha entrado, su correo. Cambiar el
  // correo = invitar al correcto (mismo rol) y quitar el acceso del equivocado.
  // Quien ya entró tiene una cuenta ligada a su correo actual: cambiarlo crearía
  // otra cuenta y perdería su historial, así que ahí solo se edita el nombre.
  const saveEdit = async (row) => {
    if (!editing || saving) return
    const name = editing.name.trim()
    const newEmail = editing.newEmail.trim().toLowerCase()
    setSaving(true)
    try {
      if (row.invited && newEmail && newEmail !== row.email) {
        await inviteMember({ email: newEmail, name, role: row.role, invitedBy: actorNameFor(user) })
        await withTimeout(revokeEmail(row.email))
        showToast(`Correo corregido: ${newEmail}. Le enviamos el correo para entrar.`)
      } else {
        await withTimeout(allowEmail(row.email, { name }))
        if (row.account && name) await withTimeout(saveUserProfile(row.account.id, { displayName: name }))
        showToast('Nombre actualizado.')
      }
      setEditing(null)
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const invite = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || inviting) return
    setInviting(true)
    try {
      const { existed } = await inviteMember({ ...form, invitedBy: actorNameFor(user) })
      showToast(existed ? `Acceso dado a ${form.email}. Le enviamos un correo para entrar.` : `Invitación enviada a ${form.email}: recibirá un correo para crear su contraseña.`)
      setForm({ name: '', email: '', role: 'miembro' })
    } catch (err) {
      showToast(`No se pudo invitar: ${err.message}`)
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) setCropFile(file)
        }}
      />
      {cropFile && photoTarget && (
        <PhotoCropper
          file={cropFile}
          round
          outWidth={256}
          title={`Foto de ${photoTarget.name.split(' ')[0]}`}
          onDone={(url) => {
            const row = photoTarget
            setCropFile(null)
            setPhotoTarget(null)
            savePhoto(row, url)
          }}
          onCancel={() => {
            setCropFile(null)
            setPhotoTarget(null)
          }}
        />
      )}
      <form onSubmit={invite} className={card}>
        <h3 className="text-[15px] font-semibold text-[#F5F5F5]">Invitar a alguien</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#888888]">
          ADOR OS crea su cuenta y le envía un correo para que elija su contraseña. Entra con el rol que elijas.
        </p>
        <div className="mt-4 grid grid-cols-1 items-center gap-2.5 sm:grid-cols-[1fr_1.3fr_auto_auto]">
          <input className={inputClass} placeholder="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={inputClass} type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <RoleSelect value={form.role} onChange={(role) => setForm((f) => ({ ...f, role }))} />
          <button type="submit" disabled={!form.email.trim() || inviting} className="ador-btn-primary rounded-xl px-4 py-2.5 text-[13px] font-medium">
            {inviting ? 'Invitando…' : 'Invitar'}
          </button>
        </div>
      </form>

      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[#F5F5F5]">Personas con acceso ({rows.length})</h3>
        <div className="mt-3 flex flex-col divide-y divide-white/[0.06]">
          {rows.map((row) => {
            const p = row.account ? presenceOf(presence[row.account.id]) : null
            if (editing?.email === row.email) {
              return (
                <form key={row.email} onSubmit={(e) => { e.preventDefault(); saveEdit(row) }} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap gap-2">
                    <input className={inputClass} placeholder="Nombre" value={editing.name} onChange={(e) => setEditing((v) => ({ ...v, name: e.target.value }))} />
                    <input
                      className={inputClass}
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={editing.newEmail}
                      disabled={!row.invited}
                      onChange={(e) => setEditing((v) => ({ ...v, newEmail: e.target.value }))}
                    />
                  </div>
                  <p className="text-[11.5px] text-[#777777]">
                    {row.invited
                      ? 'Si cambias el correo, se invita al nuevo (mismo rol), se le envía el correo para entrar y se quita el acceso del anterior.'
                      : 'Esta persona ya entró: su correo está ligado a su cuenta y no se puede cambiar desde aquí. El nombre sí.'}
                  </p>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="ador-btn-primary rounded-xl px-4 py-2 text-[12.5px] font-medium">{saving ? 'Guardando…' : 'Guardar'}</button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-xl px-3 py-2 text-[12.5px] text-[#888888] hover:text-[#F5F5F5]">Cancelar</button>
                  </div>
                </form>
              )
            }
            return (
              <div key={row.email} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar photoURL={row.account?.photoDataUrl} displayName={row.name} email={row.email} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-[#F5F5F5]">
                    {row.name}
                    {row.email === me && <span className="ml-1.5 text-[11px] font-normal text-[#777777]">(tú)</span>}
                  </p>
                  <p className="truncate text-[12px] text-[#777777]">
                    {row.email} · {row.invited ? <span className="text-[#E8C15A]">Invitado, aún no entra</span> : p?.label || 'Sin actividad reciente'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ email: row.email, name: row.account?.displayName || row.allowed?.name || '', newEmail: row.email })}
                  className="rounded-lg px-2.5 py-1.5 text-[12px] text-[#AAAAAA] hover:text-[#F5F5F5]"
                >
                  Editar
                </button>
                {row.account && (
                  <>
                    <button
                      type="button"
                      onClick={() => pickPhotoFor(row)}
                      className="rounded-lg px-2.5 py-1.5 text-[12px] text-[#AAAAAA] hover:text-[#F5F5F5]"
                    >
                      {row.account.photoDataUrl ? 'Cambiar foto' : 'Poner foto'}
                    </button>
                    {row.account.photoDataUrl && (
                      <button type="button" onClick={() => savePhoto(row, null)} className="rounded-lg px-2 py-1.5 text-[12px] text-[#777777] hover:text-[#EF8A88]">
                        Quitar foto
                      </button>
                    )}
                  </>
                )}
                {row.role !== 'admin' && row.account && (
                  <button
                    type="button"
                    onClick={() => toggleOrganizer(row)}
                    aria-pressed={row.account.communityOrganizer === true}
                    title="Permite crear encuentros en Comunidad (los administradores siempre pueden)"
                    className="rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors"
                    style={
                      row.account.communityOrganizer === true
                        ? { borderColor: 'rgba(232,193,90,0.5)', color: '#E8C15A', background: 'rgba(232,193,90,0.08)' }
                        : { borderColor: 'rgba(255,255,255,0.12)', color: '#888888' }
                    }
                  >
                    {row.account.communityOrganizer === true ? '✓ Organiza encuentros' : 'Organiza encuentros'}
                  </button>
                )}
                <RoleSelect value={row.role} disabled={row.email === me} onChange={(role) => changeRole(row, role)} />
                {row.invited && (
                  <button
                    type="button"
                    onClick={() => resendAccessEmail(row.email).then(() => showToast('Correo reenviado.')).catch((e) => showToast(e.message))}
                    className="rounded-lg px-2.5 py-1.5 text-[12px] text-[#AAAAAA] hover:text-[#F5F5F5]"
                  >
                    Reenviar correo
                  </button>
                )}
                {row.email !== me && (
                  <button
                    type="button"
                    onClick={() => revoke(row)}
                    onBlur={() => setConfirmRevoke(null)}
                    className="rounded-lg px-2.5 py-1.5 text-[12px] transition-colors"
                    style={{ color: confirmRevoke === row.email ? '#EF5350' : '#888888' }}
                  >
                    {confirmRevoke === row.email ? 'Clic otra vez para quitar' : 'Quitar acceso'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-[#666666]">
          "Organiza encuentros" deja a un miembro crear eventos en Comunidad (los administradores siempre pueden). Quitar el acceso le impide ver cualquier dato de inmediato. Su cuenta de inicio de sesión sigue existiendo en Firebase; si quieres borrarla del todo: Firebase → Authentication → Users.
        </p>
      </div>

      {(ghosts.length > 0 || orphanTasks.length > 0) && (
        <div className={card}>
          <h3 className="text-[15px] font-semibold text-[#F5F5F5]">Restos de personas sin acceso</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#888888]">
            {ghosts.length > 0 && <>Perfiles guardados de cuentas que ya no tienen acceso: {ghosts.map((g) => g.displayName || g.email || `perfil sin nombre (${g.id.slice(0, 6)}…)`).join(', ')}. </>}
            {orphanTasks.length > 0 && <>{orphanTasks.length} {orphanTasks.length === 1 ? 'tarea abierta sigue asignada' : 'tareas abiertas siguen asignadas'} a esas personas. </>}
            Limpiar borra esos perfiles y deja esas tareas sin asignar (no borra ninguna tarea ni mensaje).
          </p>
          <button type="button" onClick={cleanUp} disabled={cleaning} className="ador-btn-primary mt-3 rounded-xl px-4 py-2 text-[12.5px] font-medium">
            {cleaning ? 'Limpiando…' : 'Limpiar'}
          </button>
        </div>
      )}
    </div>
  )
}

// The methodology template: which tasks each of the 7 layers brings when a
// SPC becomes an active Intervención (created automatically, spread across
// the run's weeks — see applyInterventionTemplate in lib/firestore.js).
function TemplateTab({ user }) {
  const showToast = useToast()
  const [layers, setLayers] = useState(null) // { '1': [{id,title,priority}], … }
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => subscribeInterventionTemplate((t) => {
    setSaved(JSON.stringify(t?.layers || {}))
    setLayers((cur) => cur ?? (t?.layers || {}))
  }), [])

  if (!layers) return <div className={card}><p className="text-[13px] text-[#777777]">Cargando…</p></div>
  const dirty = JSON.stringify(layers) !== saved
  const list = (i) => layers[String(i + 1)] || []
  const setList = (i, next) => setLayers((l) => ({ ...l, [String(i + 1)]: next }))
  const total = LAYERS.reduce((n, _, i) => n + list(i).filter((t) => t.title.trim()).length, 0)

  const save = async () => {
    setSaving(true)
    try {
      const clean = {}
      LAYERS.forEach((_, i) => {
        clean[String(i + 1)] = list(i).filter((t) => t.title.trim()).map((t) => ({ id: t.id, title: t.title.trim(), priority: t.priority || 'media' }))
      })
      await withTimeout(saveInterventionTemplate(clean, actorNameFor(user)))
      setLayers(clean)
      setSaved(JSON.stringify(clean))
      showToast('Plantilla guardada.')
    } catch (e) {
      showToast(`No se pudo guardar: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[#F5F5F5]">Plantilla de Intervención</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#888888]">
          Las tareas que trae cada capa de la metodología. Cuando un SPC pasa a <strong className="font-medium text-[#DDDDDD]">Intervención Activa</strong>, su Intervención nace con estas tareas, repartidas en las semanas de cada capa (con timeline y fecha límite), asignadas a su asociado responsable. Los cambios aplican a las Intervenciones que nazcan desde ahora; las que ya existen se pueden completar con “Aplicar plantilla” dentro de Workspace.
        </p>
      </div>

      {LAYERS.map((name, i) => {
        const span = layerWeekSpan(i + 1, 8)
        return (
          <div key={name} className={card}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E5FAD] text-[11px] font-semibold text-[#F5F5F5]">{i + 1}</span>
              <h4 className="text-[14px] font-semibold text-[#F5F5F5]">{name}</h4>
              {span && <span className="text-[11.5px] text-[#777777]">{span.startWeek === span.endWeek ? `Semana ${span.startWeek}` : `Semanas ${span.startWeek}–${span.endWeek}`} de 8</span>}
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {list(i).map((t, j) => (
                <div key={t.id} className="flex items-center gap-2">
                  <input
                    value={t.title}
                    onChange={(e) => setList(i, list(i).map((x, k) => (k === j ? { ...x, title: e.target.value } : x)))}
                    placeholder="Título de la tarea"
                    className={inputClass}
                  />
                  <select
                    value={t.priority || 'media'}
                    onChange={(e) => setList(i, list(i).map((x, k) => (k === j ? { ...x, priority: e.target.value } : x)))}
                    className="flex-shrink-0 rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-2.5 py-2.5 text-[12.5px] text-[#F5F5F5] outline-none"
                  >
                    {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <button type="button" onClick={() => setList(i, list(i).filter((_, k) => k !== j))} className="flex-shrink-0 px-2 text-[16px] text-[#777777] hover:text-[#EF5350]" title="Quitar tarea">×</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setList(i, [...list(i), { id: Math.random().toString(36).slice(2, 10), title: '', priority: 'media' }])}
                className="mt-1 w-fit rounded-lg px-2.5 py-1.5 text-[12.5px] text-[#AAAAAA] hover:bg-white/[0.06] hover:text-[#F5F5F5]"
              >
                + Agregar tarea
              </button>
            </div>
          </div>
        )
      })}

      <div className="sticky bottom-4 flex items-center gap-3 self-end rounded-2xl border border-white/[0.1] bg-[#141414]/95 px-4 py-2.5 backdrop-blur">
        <span className="text-[12.5px] text-[#888888]">{total} {total === 1 ? 'tarea' : 'tareas'} en la plantilla{dirty ? ' · sin guardar' : ''}</span>
        <button type="button" onClick={save} disabled={!dirty || saving} className="ador-btn-primary rounded-xl px-4 py-2 text-[12.5px] font-medium disabled:opacity-40">
          {saving ? 'Guardando…' : 'Guardar plantilla'}
        </button>
      </div>
    </div>
  )
}

function AccessTab() {
  const [settings, setSettings] = useState(null)
  const showToast = useToast()
  useEffect(() => subscribeAccessSettings(setSettings), [])
  const current = settings?.memberModules || DEFAULT_MEMBER_MODULES

  const toggle = (id) => {
    const next = current.includes(id) ? current.filter((m) => m !== id) : [...current, id]
    withTimeout(setMemberModules(next)).catch((e) => showToast(`No se pudo guardar: ${e.message}`))
  }

  return (
    <div className={card}>
      <h3 className="text-[15px] font-semibold text-[#F5F5F5]">Qué puede abrir un Miembro</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#888888]">
        Los administradores ven todo. Un Miembro solo ve las secciones marcadas; las demás desaparecen de su menú y de la búsqueda.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {MODULES.map((m) => {
          const on = m.always || current.includes(m.id)
          return (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors"
              style={{ borderColor: on ? 'rgba(30,95,173,0.5)' : 'rgba(255,255,255,0.08)', background: on ? 'rgba(30,95,173,0.08)' : 'transparent', opacity: m.always ? 0.6 : 1 }}
            >
              <input type="checkbox" checked={on} disabled={m.always} onChange={() => toggle(m.id)} className="accent-[#1E5FAD]" />
              <span className="text-[13px] text-[#DDDDDD]">{m.label}</span>
              {m.sensitive && <span className="ml-auto text-[11px] text-[#E8C15A]">datos sensibles</span>}
              {m.always && <span className="ml-auto text-[11px] text-[#777777]">siempre</span>}
            </label>
          )
        })}
      </div>
      <p className="mt-3 text-[11.5px] text-[#666666]">Administración nunca está disponible para Miembros.</p>
    </div>
  )
}

function formatWhen(ts) {
  const d = ts?.toDate?.()
  if (!d) return ''
  return d.toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ErrorsTab() {
  const [logs, setLogs] = useState([])
  const [open, setOpen] = useState(null)
  const showToast = useToast()
  useEffect(() => subscribeErrorLogs(setLogs), [])

  const resolve = (id) => withTimeout(resolveErrorLog(id)).catch((e) => showToast(e.message))
  const resolveAll = () => Promise.all(logs.map((l) => resolveErrorLog(l.id))).catch((e) => showToast(e.message))

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F5F5F5]">Errores recientes</h3>
          <p className="mt-1 text-[12.5px] text-[#888888]">Fallas ocurridas en el ADOR OS de cualquier persona. Se borran solas a los 30 días.</p>
        </div>
        {logs.length > 0 && (
          <button type="button" onClick={resolveAll} className="flex-shrink-0 rounded-lg border border-white/[0.1] px-3 py-1.5 text-[12px] text-[#AAAAAA] hover:text-[#F5F5F5]">
            Marcar todos como revisados
          </button>
        )}
      </div>
      {logs.length === 0 ? (
        <p className="mt-6 flex items-center gap-2 text-[13px] text-[#8FD19A]">
          <span className="h-2 w-2 rounded-full bg-[#4CAF50]" /> Sin errores registrados. Todo en orden.
        </p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-white/[0.06]">
          {logs.map((l) => (
            <div key={l.id} className="py-3">
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => setOpen(open === l.id ? null : l.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[13px] text-[#F5F5F5]">{l.message}</p>
                  <p className="mt-0.5 text-[11.5px] text-[#777777]">
                    {formatWhen(l.createdAt)} · {l.userName || 'alguien'} · {l.module || l.path || '—'} · {l.source}
                  </p>
                </button>
                <button type="button" onClick={() => resolve(l.id)} className="flex-shrink-0 text-[12px] text-[#888888] hover:text-[#F5F5F5]">
                  Revisado
                </button>
              </div>
              {open === l.id && l.stack && <pre className="mt-2 max-h-[200px] overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-[#999999]">{l.stack}</pre>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminModule({ user }) {
  const [tab, setTab] = useState('personas')
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">Solo administradores</p>
        <h1 className="ador-title mt-1">Administración</h1>
        <p className="mt-1 text-[13.5px] text-[#888888]">Quién entra a ADOR OS, qué puede ver cada rol, errores y datos de la empresa.</p>
      </div>

      <div className="flex gap-1 self-start rounded-full border border-white/[0.08] bg-white/[0.02] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="relative rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors"
            style={{ color: tab === t.id ? '#F5F5F5' : '#888888' }}
          >
            {tab === t.id && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-white/[0.08]" transition={{ duration: 0.25 }} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'personas' && <PeopleTab user={user} />}
      {tab === 'accesos' && <AccessTab />}
      {tab === 'plantilla' && <TemplateTab user={user} />}
      {tab === 'errores' && <ErrorsTab />}
      {tab === 'datos' && (
        <div className="flex flex-col gap-3">
          <SeasonSection />
          <DriveFolderSection user={user} />
          <BackupSection user={user} />
        </div>
      )}
    </motion.div>
  )
}
