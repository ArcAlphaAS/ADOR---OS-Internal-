import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  subscribeDirectoryPeople,
  subscribeDirectoryTeams,
  deleteDirectoryPerson,
  createDirectoryTeam,
  updateDirectoryTeam,
  deleteDirectoryTeam,
  subscribeUserProfile,
  subscribeUsers,
} from '../../lib/firestore'
import { statusMeta, groupByArea, areaCounts, isDirectorioAdmin } from '../../lib/directorio'
import { withTimeout } from '../../lib/workspace'
import PersonCard from './PersonCard'
import PersonDetailPanel from './PersonDetailPanel'
import AddPersonModal from './AddPersonModal'
import CellPopover from '../workspace/CellPopover'
import Avatar from '../shell/Avatar'
import { SearchIcon, PlusIcon, UsersIcon, LayersIcon, BriefcaseIcon, MoreIcon, GridIcon } from '../icons'
import { useToast } from '../../hooks/useToast'

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
    <div className="ador-glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#888888]">
        <Icon size={16} />
      </span>
      <div>
        <p className="text-[17px] font-semibold text-[#F5F5F5]">{value}</p>
        <p className="text-[11px] text-[#666666]">{label}</p>
      </div>
    </div>
  )
}

function EquipoRow({ person, onOpen, onEdit, onDelete, isAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const meta = statusMeta(person.status)

  return (
    <div
      onClick={() => onOpen(person)}
      className="grid min-w-[720px] cursor-pointer grid-cols-[1.4fr_1fr_1fr_1fr_1fr_32px] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.035]"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar photoURL={person.photoDataUrl} displayName={person.name} size={26} />
        <span className="min-w-0 truncate text-[13px] font-medium text-[#F5F5F5]">{person.name}</span>
      </div>
      <span className="min-w-0 truncate text-[12.5px] text-[#888888]">{person.role}</span>
      <span className="min-w-0 truncate text-[12.5px] text-[#888888]">{person.area || 'General'}</span>
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
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#666666] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
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
  const q = search.trim().toLowerCase()
  const filtered = q
    ? people.filter((p) => `${p.name} ${p.role} ${p.area}`.toLowerCase().includes(q))
    : people
  const directivos = filtered.filter((p) => p.isDirectivo)
  const equipo = filtered.filter((p) => !p.isDirectivo)

  if (people.length === 0) {
    return (
      <div className="ador-glass ador-grain flex flex-col items-center gap-2 rounded-2xl px-6 py-16 text-center">
        <UsersIcon size={20} className="text-[#333333]" />
        <p className="text-[14px] font-medium text-[#888888]">Aún no hay personas en el directorio</p>
        <p className="text-[13px] text-[#444444]">
          {isAdmin ? 'Usa "+ Añadir persona" para registrar al equipo de ADOR.' : 'Un administrador todavía no ha registrado al equipo.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {directivos.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#F5F5F5]">Dirección</h2>
              <p className="text-[13px] text-[#888888]">Liderazgo y visión de ADOR.</p>
            </div>
            <span className="text-[12px] text-[#444444]">{directivos.length} miembros</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {directivos.map((p) => (
              <PersonCard key={p.id} person={p} selected={p.id === selectedPersonId} onClick={() => onOpen(p)} />
            ))}
          </div>
        </div>
      )}

      {equipo.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#F5F5F5]">Equipo</h2>
              <p className="text-[13px] text-[#888888]">Talento, ejecución y desarrollo.</p>
            </div>
            <span className="text-[12px] text-[#444444]">{equipo.length} miembros</span>
          </div>
          <div className="ador-glass ador-grain mt-4 overflow-x-auto rounded-2xl px-3 py-2">
            <div className="grid min-w-[720px] grid-cols-[1.4fr_1fr_1fr_1fr_1fr_32px] gap-3 border-b border-white/[0.06] px-2 pb-2 pt-1">
              {['Nombre', 'Rol', 'Área', 'Estado', 'Ubicación', ''].map((h) => (
                <span key={h} className="font-medium text-[#444444]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {h}
                </span>
              ))}
            </div>
            <div className="flex flex-col divide-y divide-white/[0.04]">
              {equipo.map((p) => (
                <EquipoRow key={p.id} person={p} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} isAdmin={isAdmin} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrganigramaTab({ people }) {
  const directivos = people.filter((p) => p.isDirectivo)
  const areas = groupByArea(people.filter((p) => !p.isDirectivo))

  if (people.length === 0) {
    return <p className="px-2 py-16 text-center text-[13px] text-[#444444]">Añade personas para ver el organigrama.</p>
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
                        <p className="text-[10.5px] leading-tight text-[#666666]">{p.role}</p>
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
        className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.14] text-[13px] text-[#666666] transition-colors duration-150 hover:border-white/[0.24] hover:text-[#888888]"
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
        className="w-full rounded-xl border border-white/[0.14] bg-[#141414] px-3 py-2 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
      />
      <div className="max-h-[140px] overflow-y-auto">
        {people.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 text-[12px] text-[#F5F5F5] hover:bg-white/[0.04]">
            <input type="checkbox" checked={memberIds.includes(p.id)} onChange={() => toggle(p.id)} className="h-3.5 w-3.5 accent-[#1E5FAD]" />
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
    return <p className="px-2 py-16 text-center text-[13px] text-[#444444]">Un administrador todavía no ha creado equipos.</p>
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
                <button type="button" onClick={() => onDeleteTeam(team)} className="text-[11px] text-[#666666] hover:text-[#EF5350]">
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
            <p className="text-[12px] text-[#666666]">{members.length} miembro{members.length === 1 ? '' : 's'}</p>
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
    return <p className="px-2 py-16 text-center text-[13px] text-[#444444]">Añade personas para ver sus roles.</p>
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
            <span className="text-[12px] text-[#666666]">{members.length}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DefaultSidebar({ people, teams }) {
  const counts = areaCounts(people)
  return (
    <div className="flex flex-col gap-4">
      <div className="ador-grain relative overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(160deg, #14181F 0%, #0A0A0A 100%)' }}>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">Nuestra gente</p>
        <p className="mt-3 text-[21px] font-semibold leading-tight text-[#F5F5F5]">Personas que construyen lo extraordinario.</p>
        <p className="mt-3 text-[12px] text-[#666666]">Talento. Carácter. Propósito.</p>
      </div>

      <div className="ador-glass rounded-2xl p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#F5F5F5]">Áreas</span>
          <span className="text-[11px] text-[#444444]">{counts.length} áreas</span>
        </div>
        {counts.length === 0 ? (
          <p className="py-2 text-[12px] text-[#444444]">Sin datos todavía</p>
        ) : (
          counts.map(({ area, count }) => (
            <div key={area} className="flex items-center justify-between border-t border-white/[0.05] py-2 first:border-0">
              <span className="text-[12.5px] text-[#888888]">{area}</span>
              <span className="text-[11px] text-[#444444]">{count} miembros</span>
            </div>
          ))
        )}
      </div>

      <div className="ador-glass rounded-2xl p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#F5F5F5]">Equipos</span>
          <span className="text-[11px] text-[#444444]">{teams.length} equipos</span>
        </div>
        {teams.length === 0 ? (
          <p className="py-2 text-[12px] text-[#444444]">Aún no hay equipos creados</p>
        ) : (
          teams.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-t border-white/[0.05] py-2 first:border-0">
              <span className="text-[12.5px] text-[#888888]">{t.name}</span>
              <span className="text-[11px] text-[#444444]">{(t.memberIds || []).length} miembros</span>
            </div>
          ))
        )}
      </div>

      <div className="ador-glass rounded-2xl p-4">
        <p className="mb-2 text-[13px] font-semibold text-[#F5F5F5]">Cultura</p>
        <p className="text-[12.5px] italic leading-relaxed text-[#666666]">"Personas excepcionales. Trabajo significativo. Un mismo estándar."</p>
        <p className="mt-1 text-[11px] text-[#444444]">— ADOR</p>
      </div>
    </div>
  )
}

// `focus` (top-bar search): {type:'person', id} opens that person's panel.
export default function DirectorioModule({ user, focus, onFocusHandled }) {
  const [people, setPeople] = useState([])
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('personas')
  const [search, setSearch] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [modalPerson, setModalPerson] = useState(undefined) // undefined = closed, null = new, object = editing
  const [profile, setProfile] = useState(null)
  const showToast = useToast()
  const actorName = actorNameFor(user)
  const isAdmin = isDirectorioAdmin(profile)

  useEffect(() => subscribeDirectoryPeople(setPeople), [])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeDirectoryTeams(setTeams), [])
  useEffect(() => subscribeUserProfile(user?.uid, setProfile), [user?.uid])

  const selectedPerson = people.find((p) => p.id === selectedPersonId) || null

  useEffect(() => {
    if (focus?.type !== 'person') return
    setTab('personas')
    setSelectedPersonId(focus.id)
    onFocusHandled?.()
  }, [focus])

  const handleDeletePerson = (person) => {
    withTimeout(deleteDirectoryPerson(person.id)).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
    if (selectedPersonId === person.id) setSelectedPersonId(null)
  }

  const handleCreateTeam = (data) => withTimeout(createDirectoryTeam(data, actorName)).catch((error) => showToast(`No se pudo crear el equipo: ${error.message}`))
  const handleDeleteTeam = (team) => withTimeout(deleteDirectoryTeam(team.id)).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">Organización</p>
          <h1 className="mt-1 text-[28px] font-semibold text-[#F5F5F5]">Directorio</h1>
          <p className="mt-1 text-[13px] text-[#888888]">Personas, estructura y equipos que hacen posible ADOR.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <p className="max-w-[260px] text-right text-[12px] italic text-[#666666]">
            "Las grandes organizaciones son la suma de grandes personas."
            <span className="mt-0.5 block not-italic text-[#444444]">— ADOR</span>
          </p>
          {isAdmin && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setModalPerson(null)}
              className="ador-btn-primary flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-medium"
            >
              <PlusIcon size={14} /> Añadir persona
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="ador-glass flex items-center gap-1 rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="relative rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors duration-150"
              style={{ color: tab === t.id ? '#F5F5F5' : '#888888' }}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="directorio-tab-indicator"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#1E5FAD' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'personas' && (
          <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3.5 py-2">
            <SearchIcon size={14} className="text-[#666666]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar persona..."
              className="w-[200px] bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
            />
          </div>
        )}
      </div>

      {tab === 'personas' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
          {tab === 'personas' && (
            <PersonasTab
              people={people}
              search={search}
              selectedPersonId={selectedPersonId}
              onOpen={(p) => setSelectedPersonId(p.id)}
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

        <div className="flex flex-col gap-4">
          {selectedPerson ? (
            <PersonDetailPanel
              person={selectedPerson}
              onClose={() => setSelectedPersonId(null)}
              onEdit={isAdmin ? () => setModalPerson(selectedPerson) : null}
            />
          ) : (
            <DefaultSidebar people={people} teams={teams} />
          )}
        </div>
      </div>

      {modalPerson !== undefined && (
        <AddPersonModal person={modalPerson} users={users} people={people} actorName={actorName} onClose={() => setModalPerson(undefined)} />
      )}
    </motion.div>
  )
}
