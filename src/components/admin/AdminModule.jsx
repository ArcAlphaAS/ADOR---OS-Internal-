import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  subscribeAllowedEmails,
  subscribeUsers,
  subscribePresence,
  subscribeAccessSettings,
  setMemberModules,
  setUserRole,
  allowEmail,
  revokeEmail,
  subscribeErrorLogs,
  resolveErrorLog,
} from '../../lib/firestore'
import { isAdmin as isAdminProfile } from '../../lib/permissions'
import { MODULES, DEFAULT_MEMBER_MODULES } from '../../lib/access'
import { presenceOf } from '../../lib/chat'
import { inviteMember, resendAccessEmail } from '../../lib/invite'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { DriveFolderSection, BackupSection } from './DataSections'

// Administración (admins only — lib/access.js). Four tabs:
//   Personas — who has access, their role, invite / resend / remove
//   Accesos  — which modules a Miembro can open
//   Errores  — failures reported from anyone's ADOR OS (lib/errorLog.js)
//   Datos    — the company's Drive folder and "Exportar todo"
const TABS = [
  { id: 'personas', label: 'Personas' },
  { id: 'accesos', label: 'Accesos' },
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
  const showToast = useToast()

  useEffect(() => subscribeAllowedEmails(setAllowed), [])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribePresence(setPresence), [])

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
            return (
              <div key={row.email} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-[#F5F5F5]">
                    {row.name}
                    {row.email === me && <span className="ml-1.5 text-[11px] font-normal text-[#777777]">(tú)</span>}
                  </p>
                  <p className="truncate text-[12px] text-[#777777]">
                    {row.email} · {row.invited ? <span className="text-[#E8C15A]">Invitado, aún no entra</span> : p?.label || 'Sin actividad reciente'}
                  </p>
                </div>
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
          Quitar el acceso le impide ver cualquier dato de inmediato. Su cuenta de inicio de sesión sigue existiendo en Firebase; si quieres borrarla del todo: Firebase → Authentication → Users.
        </p>
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
      {tab === 'errores' && <ErrorsTab />}
      {tab === 'datos' && (
        <div className="flex flex-col gap-3">
          <DriveFolderSection user={user} />
          <BackupSection user={user} />
        </div>
      )}
    </motion.div>
  )
}
