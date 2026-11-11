import AnimatedNumber from '../common/AnimatedNumber'
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { SHEET, swipeToClose } from '../../lib/motion'
import {
  subscribeDirectoryPeople,
  subscribeDirectoryTeams,
  deleteDirectoryPerson,
  updateDirectoryPerson,
  createDirectoryTeam,
  updateDirectoryTeam,
  deleteDirectoryTeam,
  subscribeUserProfile,
  subscribeUsers,
} from '../../lib/firestore'
import { statusMeta, groupByArea, areaCounts, isDirectorioAdmin, STATUSES, missingFields, upcomingDates, dayMonthLabel, buildReportTree } from '../../lib/directorio'
import { dmIdFor } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import PersonCard from './PersonCard'
import PersonDetailPanel from './PersonDetailPanel'
import AddPersonModal from './AddPersonModal'
import CellPopover from '../workspace/CellPopover'
import Avatar from '../shell/Avatar'
import { SearchIcon, PlusIcon, UsersIcon, LayersIcon, BriefcaseIcon, MoreIcon, GridIcon } from '../icons'
import { useToast } from '../../hooks/useToast'
import usePhone from '../../hooks/usePhone'
import ContextMenu from '../common/ContextMenu'
import ConfirmDeleteModal from '../common/ConfirmDeleteModal'
import { useContextMenu } from '../../hooks/useContextMenu'
import EmptyState from '../common/EmptyState'
import CardSkeleton from '../common/CardSkeleton'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

const TABS = [
  { id: 'personas', label: 'Personas' },
  { id: 'organigrama', label: 'Organigrama' },
  { id: 'equipos', label: 'Equipos' },
  { id: 'roles', label: 'Roles' },
]

function StatCard({ Icon, value, label }) {
  return (
    <div className="ador-glass flex items-center gap-3 rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#888888]">
        <Icon size={16} />
      </span>
      <div>
        <p className="text-[17px] font-semibold text-[#F5F5F5]">{typeof value === 'number' ? <AnimatedNumber value={value} /> : value}</p>
        <p className="text-[11px] text-[#8A8A8A]">{label}</p>
      </div>
    </div>
  )
}

// Celda editable en la tabla: un clic y se escribe encima (Enter guarda, Esc cancela),
// con las áreas y roles que ya existen como sugerencias para no partirlos en variantes.
function InlineCell({ value, placeholder, field, personId, options, canEdit, className }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const showToast = useToast()
  const save = () => {
    setEditing(false)
    const t = draft.trim()
    const canon = options.find((o) => o.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()) || t
    if (canon === (value || '')) return
    withTimeout(updateDirectoryPerson(personId, { [field]: canon })).catch((e) => showToast(`No se pudo guardar: ${e.message}`))
  }
  if (!canEdit) return <span className={className}>{value || placeholder}</span>
  if (editing) {
    return (
      <input
        autoFocus
        list={`dir-${field}-opts`}
        value={draft}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); else if (e.key === 'Escape') { setDraft(value || ''); setEditing(false) } }}
        className="w-full min-w-0 rounded-md bg-white/[0.1] px-1.5 py-0.5 text-[12.5px] text-[#F5F5F5] outline-none ring-1 ring-white/[0.2]"
      />
    )
  }
  return (
    <button type="button" title="Clic para editar" onClick={(e) => { e.stopPropagation(); setDraft(value || ''); setEditing(true) }} className={`${className} -mx-1.5 rounded-md px-1.5 text-left transition-colors hover:bg-white/[0.08]`}>
      {value || placeholder}
    </button>
  )
}

function EquipoRow({ person, onOpen, onEdit, onDelete, isAdmin, areaOptions = [], roleOptions = [] }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const meta = statusMeta(person.status)

  return (
    <div
      data-person-id={person.id}
      onClick={() => onOpen(person)}
      className="grid min-w-[720px] cursor-pointer grid-cols-[1.4fr_1fr_1fr_1fr_1fr_32px] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.035]"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar photoURL={person.photoDataUrl} displayName={person.name} size={26} />
        <span className="min-w-0 truncate text-[13px] font-medium text-[#F5F5F5]">{person.name}</span>
        {person.noAccess && <span title="Su cuenta ya no tiene acceso a ADOR OS" className="flex-shrink-0 rounded-full bg-[#EF5350]/15 px-1.5 py-0.5 text-[10px] text-[#EF5350]">sin acceso</span>}
        {person.invited && <span title="Recibió la invitación, aún no ha entrado" className="flex-shrink-0 rounded-full bg-[#E8C15A]/15 px-1.5 py-0.5 text-[10px] text-[#E8C15A]">invitado</span>}
      </div>
      <InlineCell value={person.role} placeholder="—" field="role" personId={person.id} options={roleOptions} canEdit={isAdmin} className="min-w-0 truncate text-[12.5px] text-[#888888]" />
      <InlineCell value={person.area} placeholder="General" field="area" personId={person.id} options={areaOptions} canEdit={isAdmin} className="min-w-0 truncate text-[12.5px] text-[#888888]" />
      <span className="flex items-center gap-1.5 text-[12px]" style={{ color: meta.color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
        {meta.label}
      </span>
      <span className="min-w-0 truncate text-[12.5px] text-[#888888]">{person.location || '—'}</span>
      {isAdmin && (
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setRect(triggerRef.current.getBoundingClientRect())
            setMenuOpen(true)
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#8A8A8A] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
        >
          <MoreIcon size={14} />
        </button>
      )}
      {menuOpen && (
        <CellPopover anchorRect={rect} onClose={() => setMenuOpen(false)} width={140}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(false)
              onEdit(person)
            }}
            className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[12px] text-[#F5F5F5] transition-colors duration-150 hover:bg-white/[0.06]"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(false)
              onDelete(person)
            }}
            className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[12px] text-[#EF5350] transition-colors duration-150 hover:bg-[#EF5350]/10"
          >
            Eliminar
          </button>
        </CellPopover>
      )}
    </div>
  )
}

function PersonasTab({ people, search, onOpen, selectedPersonId, onEdit, onDelete, isAdmin }) {
  const phone = usePhone()
  const q = search.trim().toLowerCase()
  const [fArea, setFArea] = useState('')
  const [fLoc, setFLoc] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [equipoView, setEquipoView] = useState('tabla')
  const filtered = people.filter((p) =>
    (!q || `${p.name} ${p.role} ${p.area}`.toLowerCase().includes(q)) &&
    (!fArea || (p.isDirectivo ? 'Dirección' : p.area || 'General') === fArea) &&
    (!fLoc || p.location === fLoc) &&
    (!fStatus || p.status === fStatus)
  )
  const filtersOn = Boolean(fArea || fLoc || fStatus)
  const areaChoices = [...new Set(people.map((p) => (p.isDirectivo ? 'Dirección' : p.area || 'General')))].sort()
  const locChoices = [...new Set(people.map((p) => p.location).filter(Boolean))].sort()
  const incomplete = isAdmin ? people.filter((p) => missingFields(p).length > 0) : []
  const areaOptions = [...new Set(people.map((p) => p.area).filter(Boolean))]
  const roleOptions = [...new Set(people.map((p) => p.role).filter(Boolean))]
  const directivos = filtered.filter((p) => p.isDirectivo)
  const equipo = filtered.filter((p) => !p.isDirectivo)

  if (people.length === 0) {
    return (
      <div className="ador-glass ador-grain flex flex-col items-center gap-2 rounded-2xl px-6 py-16 text-center">
        <UsersIcon size={20} className="text-[#333333]" />
        <p className="text-[14px] font-medium text-[#888888]">Aún no hay personas en el directorio</p>
        <p className="text-[13px] text-[#8A8A8A]">
          {isAdmin ? 'Usa "+ Añadir persona" para registrar al equipo de ADOR.' : 'Un administrador todavía no ha registrado al equipo.'}
        </p>
      </div>
    )
  }

  const selectCls = 'rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] text-[#D0D0D0] outline-none transition-colors hover:bg-white/[0.1] focus:bg-white/[0.1]'
  return (
    <div className="flex flex-col gap-8">
      {!phone && (
        <div className="-mb-2 flex flex-wrap items-center gap-2">
          <select value={fArea} onChange={(e) => setFArea(e.target.value)} className={selectCls}>
            <option value="">Todas las áreas</option>
            {areaChoices.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {locChoices.length > 0 && (
            <select value={fLoc} onChange={(e) => setFLoc(e.target.value)} className={selectCls}>
              <option value="">Toda ubicación</option>
              {locChoices.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selectCls}>
            <option value="">Todo estado</option>
            {STATUSES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
          </select>
          {filtersOn && <button type="button" onClick={() => { setFArea(''); setFLoc(''); setFStatus('') }} className="rounded-full px-3 py-1.5 text-[12.5px] text-[#8A8A8A] hover:text-[#F5F5F5]">Limpiar</button>}
          <div className="ml-auto flex items-center gap-1 rounded-full bg-white/[0.06] p-1">
            {[['tabla', 'Tabla'], ['tarjetas', 'Tarjetas']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setEquipoView(id)} className="rounded-full px-3 py-1 text-[12px] font-medium transition-colors" style={{ background: equipoView === id ? '#F5F5F5' : 'transparent', color: equipoView === id ? '#0A0A0A' : '#888888' }}>{label}</button>
            ))}
          </div>
        </div>
      )}
      {incomplete.length > 0 && !filtersOn && !q && (
        <div className="rounded-2xl bg-[#E8C15A]/[0.07] px-5 py-4 ring-1 ring-[#E8C15A]/20">
          <p className="text-[13px] font-medium text-[#E8C15A]">{incomplete.length === 1 ? '1 ficha incompleta' : `${incomplete.length} fichas incompletas`}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {incomplete.slice(0, 6).map((p) => (
              <button key={p.id} type="button" onClick={() => onEdit(p)} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] text-[#D0D0D0] hover:bg-white/[0.12]">
                {p.name.split(' ')[0]} <span className="text-[#8A8A8A]">· falta {missingFields(p).join(', ')}</span>
              </button>
            ))}
            {incomplete.length > 6 && <span className="self-center text-[12px] text-[#8A8A8A]">y {incomplete.length - 6} más</span>}
          </div>
        </div>
      )}
      {filtersOn && filtered.length === 0 && <p className="px-2 py-10 text-center text-[13px] text-[#8A8A8A]">Nadie coincide con esos filtros.</p>}
      <datalist id="dir-role-opts">{roleOptions.map((o) => <option key={o} value={o} />)}</datalist>
      <datalist id="dir-area-opts">{areaOptions.map((o) => <option key={o} value={o} />)}</datalist>
      {directivos.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#F5F5F5]">Dirección</h2>
              <p className="hidden text-[13px] text-[#888888] md:block">Liderazgo y visión de ADOR.</p>
            </div>
            <span className="text-[12px] text-[#8A8A8A]">{directivos.length} miembros</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {directivos.map((p) => (
              <PersonCard key={p.id} person={p} selected={p.id === selectedPersonId} onClick={(e) => onOpen(p, e?.currentTarget?.getBoundingClientRect?.())} />
            ))}
          </div>
        </div>
      )}

      {equipo.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#F5F5F5]">Equipo</h2>
              <p className="hidden text-[13px] text-[#888888] md:block">Talento, ejecución y desarrollo.</p>
            </div>
            <span className="text-[12px] text-[#8A8A8A]">{equipo.length} miembros</span>
          </div>
          {phone ? (
            <div className="mt-3 flex flex-col divide-y divide-white/[0.06] overflow-hidden rounded-[22px] bg-[#1C1C1E]">
              {equipo.map((p) => {
                const meta = statusMeta(p.status)
                return (
                  <button key={p.id} type="button" onClick={(e) => onOpen(p, e.currentTarget.getBoundingClientRect())} className="flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-[#242426]">
                    <Avatar photoURL={p.photoDataUrl} displayName={p.name} size={46} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-[#F5F5F5]">{p.name}</span>
                      <span className="block truncate text-[13.5px] text-[#8E8E93]">{[p.role, p.area].filter(Boolean).join(' · ') || 'General'}</span>
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-1.5 text-[12px]" style={{ color: meta.color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : equipoView === 'tarjetas' ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {equipo.map((p) => (
                <PersonCard key={p.id} person={p} selected={selectedPersonId === p.id} onClick={(e) => onOpen(p, e?.currentTarget?.getBoundingClientRect?.())} />
              ))}
            </div>
          ) : (
          <div className="ador-glass ador-grain mt-4 overflow-x-auto rounded-2xl px-3 py-2">
            <div className="grid min-w-[720px] grid-cols-[1.4fr_1fr_1fr_1fr_1fr_32px] gap-3 border-b border-white/[0.06] px-2 pb-2 pt-1">
              {['Nombre', 'Rol', 'Área', 'Estado', 'Ubicación', ''].map((h) => (
                <span key={h} className="font-medium text-[#8A8A8A]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {h}
                </span>
              ))}
            </div>
            <div className="flex flex-col divide-y divide-white/[0.04]">
              {equipo.map((p) => (
                <EquipoRow key={p.id} person={p} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} isAdmin={isAdmin} areaOptions={areaOptions} roleOptions={roleOptions} />
              ))}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  )
}

// Una persona y, debajo, quienes reportan a ella, unidas por líneas finas.
function OrgNode({ person, kids, depth = 0 }) {
  const team = kids.get(person.id) || []
  return (
    <div className="flex flex-col items-center">
      <div className="ador-glass flex items-center gap-2.5 rounded-2xl py-2 pl-2 pr-4">
        <Avatar photoURL={person.photoDataUrl} displayName={person.name} size={depth === 0 ? 40 : 30} />
        <div>
          <p className="text-[12.5px] font-semibold leading-tight text-[#F5F5F5]">{person.name}</p>
          <p className="text-[10.5px] leading-tight text-[#8A8A8A]">{person.role}</p>
        </div>
      </div>
      {team.length > 0 && (
        <>
          <div className="h-5 w-px bg-white/[0.14]" />
          <div className="flex items-start justify-center gap-5">
            {team.map((c, i) => (
              <div key={c.id} className="relative flex flex-col items-center pt-5">
                <span className="absolute top-0 h-5 w-px bg-white/[0.14]" />
                {team.length > 1 && <span className="absolute top-0 h-px bg-white/[0.14]" style={{ left: i === 0 ? '50%' : 0, right: i === team.length - 1 ? '50%' : 0 }} />}
                <OrgNode person={c} kids={kids} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function OrganigramaTab({ people }) {
  const tree = buildReportTree(people)
  if (tree) {
    return (
      <div className="flex flex-col items-center gap-10 overflow-x-auto py-4">
        <div className="flex items-start justify-center gap-10">
          {tree.roots.map((r) => <OrgNode key={r.id} person={r} kids={tree.kids} />)}
        </div>
        {tree.loose.length > 0 && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8A8A8A]">Sin línea de reporte asignada</p>
            <div className="flex flex-wrap justify-center gap-2">
              {tree.loose.map((p) => (
                <span key={p.id} className="ador-glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12px] text-[#D0D0D0]">
                  <Avatar photoURL={p.photoDataUrl} displayName={p.name} size={22} /> {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  const directivos = people.filter((p) => p.isDirectivo)
  const areas = groupByArea(people.filter((p) => !p.isDirectivo))

  if (people.length === 0) {
    return <p className="px-2 py-16 text-center text-[13px] text-[#8A8A8A]">Añade personas para ver el organigrama.</p>
  }

  return (
    <div className="flex flex-col items-center gap-10 py-4">
      <div className="flex flex-wrap justify-center gap-4">
        {directivos.map((p) => (
          <div key={p.id} className="ador-glass flex flex-col items-center gap-2 rounded-2xl px-5 py-4">
            <Avatar photoURL={p.photoDataUrl} displayName={p.name} size={48} />
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#F5F5F5]">{p.name}</p>
              <p className="text-[11px] text-[#888888]">{p.role}</p>
            </div>
          </div>
        ))}
      </div>

      {areas.length > 0 && (
        <>
          <div className="h-8 w-px bg-white/[0.12]" />
          <div className="flex flex-wrap justify-center gap-8">
            {areas.map(({ area, members }) => (
              <div key={area} className="flex flex-col items-center gap-3">
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.05em] text-[#888888]">{area}</span>
                <div className="h-4 w-px bg-white/[0.1]" />
                <div className="flex flex-col items-center gap-2">
                  {members.map((p) => (
                    <div key={p.id} className="ador-glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5">
                      <Avatar photoURL={p.photoDataUrl} displayName={p.name} size={26} />
                      <div>
                        <p className="text-[12px] font-medium leading-tight text-[#F5F5F5]">{p.name}</p>
                        <p className="text-[10.5px] leading-tight text-[#8A8A8A]">{p.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NewTeamCard({ people, onCreate }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [memberIds, setMemberIds] = useState([])
  const [saving, setSaving] = useState(false)

  const toggle = (id) => setMemberIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const submit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onCreate({ name: name.trim(), memberIds })
      setName('')
      setMemberIds([])
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.14] text-[13px] text-[#8A8A8A] transition-colors duration-150 hover:border-white/[0.24] hover:text-[#888888]"
      >
        <PlusIcon size={18} />
        Nuevo equipo
      </button>
    )
  }

  return (
    <div className="ador-glass ador-grain flex flex-col gap-3 rounded-2xl p-5">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del equipo"
        className="w-full rounded-xl border border-white/[0.14] bg-[#141414] px-3 py-2 text-[13px] text-[#F5F5F5] placeholder:text-[#8A8A8A] outline-none"
      />
      <div className="max-h-[140px] overflow-y-auto">
        {people.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 text-[12px] text-[#F5F5F5] hover:bg-white/[0.04]">
            <input type="checkbox" checked={memberIds.includes(p.id)} onChange={() => toggle(p.id)} className="h-3.5 w-3.5 accent-[#F4EEE2]" />
            {p.name}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-[12px] text-[#888888] hover:text-[#F5F5F5]">
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={saving} className="ador-btn-primary rounded-lg px-3.5 py-1.5 text-[12px] font-medium disabled:opacity-60">
          Crear
        </button>
      </div>
    </div>
  )
}

function EquiposTab({ people, teams, onCreateTeam, onDeleteTeam, isAdmin }) {
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]))

  if (teams.length === 0 && !isAdmin) {
    return <p className="px-2 py-16 text-center text-[13px] text-[#8A8A8A]">Un administrador todavía no ha creado equipos.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {teams.map((team) => {
        const members = (team.memberIds || []).map((id) => peopleById[id]).filter(Boolean)
        return (
          <div key={team.id} className="ador-glass ador-grain flex flex-col gap-3 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <p className="text-[15px] font-semibold text-[#F5F5F5]">{team.name}</p>
              {isAdmin && (
                <button type="button" onClick={() => onDeleteTeam(team)} className="text-[11px] text-[#8A8A8A] hover:text-[#EF5350]">
                  Eliminar
                </button>
              )}
            </div>
            <div className="flex flex-shrink-0">
              {members.slice(0, 5).map((m, i) => (
                <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 5 - i }}>
                  <Avatar photoURL={m.photoDataUrl} displayName={m.name} size={28} />
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[#8A8A8A]">{members.length} miembro{members.length === 1 ? '' : 's'}</p>
          </div>
        )
      })}
      {isAdmin && <NewTeamCard people={people} onCreate={onCreateTeam} />}
    </div>
  )
}

function RolesTab({ people }) {
  const byRole = new Map()
  for (const p of people) {
    const key = p.role || 'Sin rol'
    if (!byRole.has(key)) byRole.set(key, [])
    byRole.get(key).push(p)
  }
  const roles = Array.from(byRole.entries()).sort((a, b) => b[1].length - a[1].length)

  if (people.length === 0) {
    return <p className="px-2 py-16 text-center text-[13px] text-[#8A8A8A]">Añade personas para ver sus roles.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {roles.map(([role, members]) => (
        <div key={role} className="ador-glass flex items-center justify-between rounded-xl px-4 py-3">
          <span className="text-[13px] font-medium text-[#F5F5F5]">{role}</span>
          <div className="flex items-center gap-3">
            <div className="flex flex-shrink-0">
              {members.slice(0, 4).map((m, i) => (
                <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 4 - i }}>
                  <Avatar photoURL={m.photoDataUrl} displayName={m.name} size={22} />
                </div>
              ))}
            </div>
            <span className="text-[12px] text-[#8A8A8A]">{members.length}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DefaultSidebar({ people, teams }) {
  const counts = areaCounts(people)
  const soon = upcomingDates(people, 30).slice(0, 4)
  return (
    <div className="flex flex-col gap-4">
      {soon.length > 0 && (
        <div className="ador-glass rounded-2xl p-4">
          <p className="mb-2.5 text-[13px] font-semibold text-[#F5F5F5]">Próximamente</p>
          <div className="flex flex-col gap-2.5">
            {soon.map((u) => (
              <div key={`${u.person.id}-${u.kind}`} className="flex items-center gap-2.5">
                <Avatar photoURL={u.person.photoDataUrl} displayName={u.person.name} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] text-[#F5F5F5]">{u.person.name.split(' ')[0]} · {u.kind === 'cumpleaños' ? '🎂 cumpleaños' : `✨ ${u.years} ${u.years === 1 ? 'año' : 'años'} en ADOR`}</p>
                  <p className="text-[11px] text-[#8A8A8A]">{u.days === 0 ? 'Hoy' : u.days === 1 ? 'Mañana' : dayMonthLabel(u.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="ador-grain relative overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(160deg, #14181F 0%, #000000 100%)' }}>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Nuestra gente</p>
        <p className="mt-3 text-[21px] font-semibold leading-tight text-[#F5F5F5]">Personas que construyen lo extraordinario.</p>
        <p className="mt-3 text-[12px] text-[#8A8A8A]">Talento. Carácter. Propósito.</p>
      </div>

      <div className="ador-glass rounded-2xl p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#F5F5F5]">Áreas</span>
          <span className="text-[11px] text-[#8A8A8A]">{counts.length} áreas</span>
        </div>
        {counts.length === 0 ? (
          <EmptyState compact title="Sin datos todavía" hint="Se llena al añadir personas al directorio." />
        ) : (
          counts.map(({ area, count }) => (
            <div key={area} className="flex items-center justify-between border-t border-white/[0.05] py-2 first:border-0">
              <span className="text-[12.5px] text-[#888888]">{area}</span>
              <span className="text-[11px] text-[#8A8A8A]">{count} miembros</span>
            </div>
          ))
        )}
      </div>

      <div className="ador-glass rounded-2xl p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#F5F5F5]">Equipos</span>
          <span className="text-[11px] text-[#8A8A8A]">{teams.length} equipos</span>
        </div>
        {teams.length === 0 ? (
          <p className="py-2 text-[12px] text-[#8A8A8A]">Aún no hay equipos creados</p>
        ) : (
          teams.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-t border-white/[0.05] py-2 first:border-0">
              <span className="text-[12.5px] text-[#888888]">{t.name}</span>
              <span className="text-[11px] text-[#8A8A8A]">{(t.memberIds || []).length} miembros</span>
            </div>
          ))
        )}
      </div>

      <div className="ador-glass rounded-2xl p-4">
        <p className="mb-2 text-[13px] font-semibold text-[#F5F5F5]">Cultura</p>
        <p className="text-[12.5px] italic leading-relaxed text-[#8A8A8A]">"Personas excepcionales. Trabajo significativo. Un mismo estándar."</p>
        <p className="mt-1 text-[11px] text-[#8A8A8A]">— ADOR</p>
      </div>
    </div>
  )
}

// `focus` (top-bar search): {type:'person', id} opens that person's panel.
export default function DirectorioModule({ user, focus, onFocusHandled, onNavigate }) {
  const [rawPeople, setPeople] = useState([])
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  // Someone linked to an ADOR OS account with no Directorio photo of their
  // own shows the photo from their profile — live, so it follows any change
  // they make there. `photoFromAccount` tells the edit form it isn't theirs
  // to save.
  // `noAccess`: ligada a una cuenta que ya no tiene acceso a ADOR OS (la lista
  // de usuarios solo trae a quien sigue autorizado). La ficha no se borra sola.
  const people = rawPeople.map((p) => {
    if (!p.linkedUserId) return p
    const account = users.find((u) => u.id === p.linkedUserId)
    const noAccess = users.length > 0 && !account
    const invited = Boolean(account?.pendingFirstLogin)
    const base = { ...p, ...(account?.birthday ? { birthday: account.birthday } : {}), ...(noAccess ? { noAccess } : {}), ...(invited ? { invited: true } : {}) }
    if (p.photoDataUrl) return base
    return account?.photoDataUrl ? { ...base, photoDataUrl: account.photoDataUrl, photoFromAccount: true } : base
  })
  const [tab, setTab] = useState('personas')
  const [search, setSearch] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [modalPerson, setModalPerson] = useState(undefined) // undefined = closed, null = new, object = editing
  const [profile, setProfile] = useState(null)
  const showToast = useToast()
  const actorName = actorNameFor(user)
  const isAdmin = isDirectorioAdmin(profile)
  const messageSelected = () => {
    const them = selectedPerson?.linkedUserId
    if (them && user?.uid && onNavigate) onNavigate('chat', { type: 'chat', convType: 'dm', convId: dmIdFor(user.uid, them), participantUids: [user.uid, them] })
  }

  const [peopleLoaded, setPeopleLoaded] = useState(false)
  useEffect(() => subscribeDirectoryPeople((p) => { setPeople(p); setPeopleLoaded(true) }), [])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeDirectoryTeams(setTeams), [])
  useEffect(() => subscribeUserProfile(user?.uid, setProfile), [user?.uid])

  const selectedPerson = people.find((p) => p.id === selectedPersonId) || null
  const phoneView = usePhone()
  const [personOrigin, setPersonOrigin] = useState(null)
  useEdgeSwipeBack(() => setSelectedPersonId(null), phoneView && Boolean(selectedPerson))

  useEffect(() => {
    if (focus?.type !== 'person') return
    setTab('personas')
    setSelectedPersonId(focus.id)
    onFocusHandled?.()
  }, [focus])

  const [deletingPerson, setDeletingPerson] = useState(null)
  const { menu, bind, close } = useContextMenu()
  const handleDeletePerson = (person) => setDeletingPerson(person) // pide escribir el nombre antes de borrar

  const handleCreateTeam = (data) => withTimeout(createDirectoryTeam(data, actorName)).catch((error) => showToast(`No se pudo crear el equipo: ${error.message}`))
  const handleDeleteTeam = (team) => withTimeout(deleteDirectoryTeam(team.id)).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))

  return (
    <motion.div
      initial={false}
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10"
      onContextMenu={(e) => {
        const id = e.target.closest?.('[data-person-id]')?.dataset.personId
        const person = id && people.find((p) => p.id === id)
        if (person) bind(person).onContextMenu(e)
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A] md:block">Organización</p>
          <h1 className="ador-title mt-1">Directorio</h1>
          <p className="mt-1 hidden text-[13px] text-[#888888] md:block">Personas, estructura y equipos que hacen posible ADOR.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <p className="hidden max-w-[260px] text-right text-[12px] italic text-[#8A8A8A] md:block">
            "Las grandes organizaciones son la suma de grandes personas."
            <span className="mt-0.5 block not-italic text-[#8A8A8A]">— ADOR</span>
          </p>
          {isAdmin && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setModalPerson(null)}
              aria-label="Añadir persona"
              className="ador-btn-primary flex h-11 w-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium md:h-auto md:w-auto md:px-5 md:py-2.5"
            >
              <PlusIcon size={16} /> <span className="hidden md:inline">Añadir persona</span>
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="ador-glass flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] sm:w-auto sm:self-auto [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="relative flex-1 rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors duration-150 sm:flex-none sm:py-1.5 sm:text-[12.5px]"
              style={{ color: tab === t.id ? '#0A0A0A' : '#888888' }}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="directorio-tab-indicator"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#F5F5F5' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'personas' && (
          <div className="flex h-11 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 max-sm:border-transparent max-sm:bg-[#1C1C1E] sm:h-auto sm:px-3.5 sm:py-2">
            <SearchIcon size={14} className="text-[#8A8A8A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar persona..."
              className="min-w-0 flex-1 bg-transparent text-[16px] sm:w-[200px] sm:flex-none sm:text-[12.5px] text-[#F5F5F5] placeholder:text-[#8A8A8A] outline-none"
            />
          </div>
        )}
      </div>

      {tab === 'personas' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard Icon={UsersIcon} value={people.length} label="Personas" />
          <StatCard Icon={LayersIcon} value={areaCounts(people).length} label="Áreas" />
          <StatCard Icon={BriefcaseIcon} value={teams.length} label="Equipos" />
          <StatCard
            Icon={GridIcon}
            value={people.length ? `${Math.round((people.filter((p) => p.role).length / people.length) * 100)}%` : '—'}
            label="Roles asignados"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {tab === 'personas' && !peopleLoaded && <CardSkeleton rows={5} />}
          {tab === 'personas' && peopleLoaded && (
            <PersonasTab
              people={people}
              search={search}
              selectedPersonId={selectedPersonId}
              onOpen={(p, rect) => { setSelectedPersonId(p.id); setPersonOrigin(rect || null) }}
              onEdit={setModalPerson}
              onDelete={handleDeletePerson}
              isAdmin={isAdmin}
            />
          )}
          {tab === 'organigrama' && <OrganigramaTab people={people} />}
          {tab === 'equipos' && (
            <EquiposTab people={people} teams={teams} onCreateTeam={handleCreateTeam} onDeleteTeam={handleDeleteTeam} isAdmin={isAdmin} />
          )}
          {tab === 'roles' && <RolesTab people={people} />}
        </div>

        <div className="flex flex-col gap-4 max-md:hidden">
          {selectedPerson ? (
            <PersonDetailPanel
              person={selectedPerson}
              onClose={() => setSelectedPersonId(null)}
              people={people}
              onMessage={messageSelected}
              onEdit={isAdmin ? () => setModalPerson(selectedPerson) : null}
            />
          ) : (
            <DefaultSidebar people={people} teams={teams} />
          )}
        </div>
      </div>

      {phoneView && createPortal(
        <AnimatePresence>
          {selectedPerson && (() => {
            const top = 48
            const H = typeof window !== 'undefined' ? window.innerHeight - top : 800
            const W = typeof window !== 'undefined' ? window.innerWidth : 400
            const o = personOrigin ? { x: personOrigin.left, y: personOrigin.top - top, scaleX: Math.max(0.2, personOrigin.width / W), scaleY: Math.max(0.05, personOrigin.height / H) } : { y: H }
            return (
              <>
                <motion.div key="pbd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/50" onClick={() => setSelectedPersonId(null)} />
                <motion.div
                  key="psheet"
                  initial={{ ...o, opacity: 0 }}
                  animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
                  exit={{ ...o, opacity: 0 }}
                  transition={{ ...SHEET, opacity: { duration: 0.16 } }}
                  {...swipeToClose('y', () => setSelectedPersonId(null))}
                  className="fixed inset-x-0 bottom-0 z-[61] overflow-y-auto rounded-t-[30px] bg-[#1C1C1E] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-3"
                  style={{ top, transformOrigin: '0 0' }}
                  data-keep-scroll
                >
                  <div className="mx-auto mb-2 h-[5px] w-10 rounded-full bg-white/25" />
                  <PersonDetailPanel person={selectedPerson} people={people} onMessage={messageSelected} onClose={() => setSelectedPersonId(null)} onEdit={isAdmin ? () => setModalPerson(selectedPerson) : null} />
                </motion.div>
              </>
            )
          })()}
        </AnimatePresence>,
        document.body
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={menu.payload.name}
          subtitle={menu.payload.role || 'Directorio'}
          onClose={close}
          items={[
            { label: 'Abrir ficha', onClick: () => setSelectedPersonId(menu.payload.id) },
            isAdmin && { label: 'Editar…', onClick: () => setModalPerson(menu.payload) },
            isAdmin && { divider: true },
            isAdmin && { label: 'Eliminar persona…', danger: true, onClick: () => handleDeletePerson(menu.payload) },
          ]}
        />
      )}
      {deletingPerson && (
        <ConfirmDeleteModal
          title={`¿Eliminar a ${deletingPerson.name}?`}
          description="Se borra su ficha del Directorio para todo el equipo. Su cuenta de ADOR OS, si la tiene, no se toca."
          name={deletingPerson.name}
          onClose={() => setDeletingPerson(null)}
          onConfirm={async () => {
            await withTimeout(deleteDirectoryPerson(deletingPerson.id))
            if (selectedPersonId === deletingPerson.id) setSelectedPersonId(null)
            showToast(`Se eliminó a ${deletingPerson.name}.`)
          }}
        />
      )}
      {modalPerson !== undefined && (
        <AddPersonModal person={modalPerson} users={users} people={people} actorName={actorName} onClose={() => setModalPerson(undefined)} />
      )}
    </motion.div>
  )
}
