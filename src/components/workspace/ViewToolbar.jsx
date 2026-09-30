import { useRef, useState } from 'react'
import CellPopover from './CellPopover'
import { STATUSES, PRIORITIES } from '../../lib/workspace'
import { DATE_FILTERS, SORTS, GROUPS, NO_ASSIGNEE, DEFAULT_FILTERS, DEFAULT_SORT, DEFAULT_GROUP, activeFilterCount } from '../../lib/workspaceFilters'
import { CloseIcon } from '../icons'

// Monday/Linear-style bar above Workspace's team views: search, filter by
// person/status/priority/date, sort, group (Lista only), saved views and
// "Seleccionar" for bulk edits (Lista only). State lives in WorkspaceModule
// so the same filters follow you between Lista, Kanban, Timeline and
// Calendario.
function Trigger({ label, active, badge, children, width = 260 }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const ref = useRef(null)
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => {
          setRect(ref.current.getBoundingClientRect())
          setOpen(true)
        }}
        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/[0.05]"
        style={{ borderColor: active ? 'rgba(232,193,90,0.5)' : 'rgba(255,255,255,0.1)', color: active ? '#E8C15A' : '#AAAAAA', background: active ? 'rgba(184,134,11,0.1)' : 'transparent' }}
      >
        {label}
        {badge ? <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E8C15A] px-1 text-[10px] font-semibold text-[#1C1A16]">{badge}</span> : null}
      </button>
      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)} width={width}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </CellPopover>
      )}
    </>
  )
}

const sectionLabel = 'px-1 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.06em] text-[#666666]'

function Chip({ active, color = '#E8C15A', onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-2.5 py-1 text-[11.5px] transition-colors"
      style={{ borderColor: active ? color : 'rgba(255,255,255,0.12)', background: active ? `${color}22` : 'transparent', color: active ? color : '#999999' }}
    >
      {children}
    </button>
  )
}

const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export default function ViewToolbar({
  filters,
  onFilters,
  sort,
  onSort,
  group,
  onGroup,
  users = [],
  savedViews = [],
  onSaveView,
  onApplyView,
  onDeleteView,
  showGroup = false,
  showSort = true,
  selectMode = false,
  onToggleSelect,
  resultCount,
}) {
  const [viewName, setViewName] = useState('')
  const count = activeFilterCount(filters)
  const dirty = count > 0 || sort.by !== 'manual' || group !== DEFAULT_GROUP

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        value={filters.q}
        onChange={(e) => onFilters({ ...filters, q: e.target.value })}
        placeholder="Buscar tarea…"
        className="w-[170px] rounded-lg border border-white/[0.1] bg-transparent px-3 py-1.5 text-[12px] text-[#F5F5F5] outline-none placeholder:text-[#666666] focus:border-white/[0.25]"
      />

      <Trigger label="Filtrar" active={count - (filters.q ? 1 : 0) > 0} badge={count - (filters.q ? 1 : 0) || null}>
        <div className="flex max-h-[60vh] flex-col overflow-y-auto p-1">
          <p className={sectionLabel}>Persona</p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {users.map((u) => (
              <Chip key={u.id} active={filters.people.includes(u.id)} onClick={() => onFilters({ ...filters, people: toggle(filters.people, u.id) })}>
                {(u.displayName || u.email || '').split(' ')[0]}
              </Chip>
            ))}
            <Chip active={filters.people.includes(NO_ASSIGNEE)} color="#888888" onClick={() => onFilters({ ...filters, people: toggle(filters.people, NO_ASSIGNEE) })}>
              Sin asignar
            </Chip>
          </div>
          <p className={sectionLabel}>Estado</p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {STATUSES.map((s) => (
              <Chip key={s.id} color={s.color === '#444444' ? '#999999' : s.color} active={filters.statuses.includes(s.id)} onClick={() => onFilters({ ...filters, statuses: toggle(filters.statuses, s.id) })}>
                {s.label}
              </Chip>
            ))}
          </div>
          <p className={sectionLabel}>Prioridad</p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {PRIORITIES.map((p) => (
              <Chip key={p.id} color={p.color} active={filters.priorities.includes(p.id)} onClick={() => onFilters({ ...filters, priorities: toggle(filters.priorities, p.id) })}>
                {p.label}
              </Chip>
            ))}
          </div>
          <p className={sectionLabel}>Vencimiento</p>
          <div className="flex flex-wrap gap-1.5 px-1 pb-1">
            {DATE_FILTERS.map((d) => (
              <Chip key={d.id} active={filters.date === d.id} onClick={() => onFilters({ ...filters, date: d.id })}>
                {d.label}
              </Chip>
            ))}
          </div>
          {count > 0 && (
            <button type="button" onClick={() => onFilters(DEFAULT_FILTERS)} className="mt-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-[#EF5350] hover:bg-white/[0.05]">
              Quitar todos los filtros
            </button>
          )}
        </div>
      </Trigger>

      {showSort && (
        <Trigger label={sort.by === 'manual' ? 'Ordenar' : `Orden: ${SORTS.find((s) => s.id === sort.by)?.label}${sort.dir === 'desc' ? ' ↓' : ' ↑'}`} active={sort.by !== 'manual'} width={220}>
          {(close) => (
            <div className="flex flex-col p-1">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSort(s.id === sort.by && s.id !== 'manual' ? { by: s.id, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { by: s.id, dir: 'asc' })
                    if (s.id === 'manual') close()
                  }}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-white/[0.06]"
                  style={{ color: sort.by === s.id ? '#E8C15A' : '#DDDDDD' }}
                >
                  {s.label}
                  {sort.by === s.id && s.id !== 'manual' && <span className="text-[11px]">{sort.dir === 'asc' ? '↑ ascendente' : '↓ descendente'}</span>}
                </button>
              ))}
              <p className="px-2.5 pb-1 pt-2 text-[10.5px] leading-snug text-[#666666]">Toca otra vez para invertir el orden. Las tareas sin fecha quedan al final.</p>
            </div>
          )}
        </Trigger>
      )}

      {showGroup && (
        <Trigger label={group === DEFAULT_GROUP ? 'Agrupar' : `Agrupado: ${GROUPS.find((g) => g.id === group)?.label}`} active={group !== DEFAULT_GROUP} width={200}>
          {(close) => (
            <div className="flex flex-col p-1">
              {GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onGroup(g.id)
                    close()
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-white/[0.06]"
                  style={{ color: group === g.id ? '#E8C15A' : '#DDDDDD' }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </Trigger>
      )}

      <Trigger label={savedViews.length ? `Vistas · ${savedViews.length}` : 'Vistas'} width={250}>
        {(close) => (
          <div className="flex flex-col p-1">
            {savedViews.length === 0 && <p className="px-2 py-2 text-[12px] leading-snug text-[#777777]">Aún no guardas ninguna. Arma filtros, orden y agrupación y guárdalos con un nombre para volver a ellos con un clic.</p>}
            {savedViews.map((v) => (
              <div key={v.id} className="group/v flex items-center rounded-lg hover:bg-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    onApplyView(v)
                    close()
                  }}
                  className="min-w-0 flex-1 truncate px-2.5 py-1.5 text-left text-[12.5px] text-[#E8E8E8]"
                >
                  {v.name}
                </button>
                <button type="button" title="Borrar vista" onClick={() => onDeleteView(v.id)} className="mr-1.5 flex-shrink-0 text-[#666666] opacity-0 transition-opacity hover:text-[#EF5350] group-hover/v:opacity-100">
                  <CloseIcon size={11} />
                </button>
              </div>
            ))}
            <div className="mt-1 border-t border-white/[0.08] p-1.5">
              <input
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && viewName.trim()) {
                    onSaveView(viewName.trim())
                    setViewName('')
                    close()
                  }
                }}
                placeholder={dirty ? 'Guardar la vista actual como… (Enter)' : 'Primero aplica filtros u orden'}
                disabled={!dirty}
                className="w-full rounded-lg border border-white/[0.1] bg-[#141414] px-2.5 py-1.5 text-[12px] text-[#F5F5F5] outline-none placeholder:text-[#666666] disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </Trigger>

      {onToggleSelect && (
        <button
          type="button"
          onClick={onToggleSelect}
          className="rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/[0.05]"
          style={{ borderColor: selectMode ? 'rgba(232,193,90,0.5)' : 'rgba(255,255,255,0.1)', color: selectMode ? '#E8C15A' : '#AAAAAA', background: selectMode ? 'rgba(184,134,11,0.1)' : 'transparent' }}
        >
          {selectMode ? 'Terminar selección' : 'Seleccionar'}
        </button>
      )}

      {dirty && (
        <button
          type="button"
          onClick={() => {
            onFilters(DEFAULT_FILTERS)
            onSort(DEFAULT_SORT)
            onGroup(DEFAULT_GROUP)
          }}
          className="px-1.5 text-[12px] text-[#888888] hover:text-[#F5F5F5]"
        >
          Limpiar
        </button>
      )}
      {resultCount !== undefined && dirty && <span className="ml-auto text-[11.5px] text-[#777777]">{resultCount} {resultCount === 1 ? 'tarea' : 'tareas'}</span>}
    </div>
  )
}
