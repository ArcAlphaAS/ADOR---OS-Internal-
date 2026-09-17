import { UsersIcon, BriefcaseIcon } from '../icons'

// Reminders-style small circular icon badge — reserved for the "smart
// list" entries (Personal, Todo) the same way Apple Reminders only badges
// Today/Scheduled/All/Flagged, not every user-created list. A regular
// Intervención/Proyecto keeps its plain colored dot below; giving every
// row its own icon badge would be visual noise at this density.
function ListIcon({ Icon, color }) {
  return (
    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: color, color: '#F5F5F5' }}>
      <Icon size={11} />
    </span>
  )
}

// Active state now shares its visual grammar with FilterToggle below
// (colored tint + colored label, not a flat white highlight) — the two
// controls answer the same question ("what's the current scope?"), so a
// selected Intervención/Proyecto and a selected Personal/Todo filter now
// read as the same kind of thing, just with different accent colors,
// instead of two different "selected" languages sitting in one sidebar.
// "Trabajo" (the unfiltered "everything the team has" view — Intervenciones
// + Proyectos Internos combined — no accentColor of its own) went through
// two names on 2026-09-17: "Todo" read too easily as "to-do," and the next
// try, "Panorama," didn't read as "this is the team's work" clearly enough
// per direct follow-up feedback. Deliberately not "Proyectos" either — an
// Intervención is never called a "proyecto" in ADOR's own vocabulary (§8),
// so that label would have been inaccurate, not just imprecise. Falls back
// to a neutral white tint since it has no color of its own to borrow.
function NavItem({ label, sublabel, active, accentColor, Icon, iconColor, onClick, disabled }) {
  const tint = accentColor || '#F5F5F5'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Se crea automáticamente cuando un SPC pasa a Intervención Activa' : undefined}
      className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-colors duration-150"
      style={{
        background: active ? (accentColor ? `${accentColor}20` : 'rgba(255,255,255,0.06)') : 'transparent',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <div className="flex w-full items-center gap-2">
        {Icon ? (
          <ListIcon Icon={Icon} color={iconColor || '#888888'} />
        ) : (
          accentColor && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: accentColor }} />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: active ? tint : '#888888', fontWeight: active ? 500 : 400 }}>
          {label}
        </span>
      </div>
      {sublabel && <span className="pl-3.5 text-[11px] text-[#444444]">{sublabel}</span>}
    </button>
  )
}

// At-a-glance workload balance across all 3 associates — "who's about to be
// overloaded this week" wasn't visible anywhere before; "Mis tareas" only
// shows your own load, never how it compares to your two teammates'.
function WorkloadRow({ row, maxCount }) {
  const overloaded = row.dueThisWeekCount >= 5
  const pct = maxCount ? Math.round((row.openCount / maxCount) * 100) : 0
  return (
    <div className="flex flex-col gap-1 px-3 py-1.5">
      <div className="flex items-center justify-between">
        <span className="truncate text-[12px]" style={{ color: overloaded ? '#E05252' : '#888888' }}>
          {row.displayName.split(' ')[0]}
        </span>
        <span className="flex-shrink-0 text-[11px]" style={{ color: overloaded ? '#E05252' : '#444444' }}>
          {row.dueThisWeekCount > 0 ? `${row.dueThisWeekCount} esta sem.` : `${row.openCount} abiertas`}
        </span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: overloaded ? 'rgba(224,82,82,0.12)' : 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: overloaded ? '#E05252' : '#1E5FAD' }}
        />
      </div>
    </div>
  )
}

function WorkloadPanel({ workload }) {
  if (workload.length === 0) return null
  const maxCount = Math.max(...workload.map((r) => r.openCount))
  return (
    <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-4">
      <span className="px-3 pb-1 font-medium text-[#444444]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Carga del equipo
      </span>
      {workload.map((row) => (
        <WorkloadRow key={row.userId} row={row} maxCount={maxCount} />
      ))}
    </div>
  )
}

// "Personal" is a cross-workstream filter (everything assigned to me, any
// workstream), distinct from "Equipo" (a selected Intervención/Proyecto
// below). "Hoy" used to live here too as a sibling toggle — moved out to be
// its own tab in the main view switcher (see WorkspaceModule.jsx/HoyView.jsx,
// 2026-09-16) since it's the module's actual landing screen now, not one
// filter among several.
function FilterToggle({ label, active, count, color, Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-150"
      style={{ background: active ? `${color}29` : 'transparent' }}
    >
      {Icon && <ListIcon Icon={Icon} color={color} />}
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: active ? color : '#F5F5F5' }}>
        {label}
      </span>
      {count > 0 && (
        <span
          className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ background: active ? `${color}40` : 'rgba(255,255,255,0.08)', color: active ? color : '#888888' }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// Restructured 2026-09-16: "Hoy" moved out to its own tab (see
// WorkspaceModule.jsx), so this sidebar now only scopes the team views
// (Lista/Kanban/Timeline) — Personal (everything assigned to me, any
// workstream) vs. Equipo (a specific Intervención/Proyecto, or all of them).
export default function WorkspaceSidebar({
  workstreams,
  selectedId,
  onSelect,
  onNewProyecto,
  onlyMine,
  onToggleOnlyMine,
  myTaskCount,
  workload = [],
}) {
  const intervenciones = workstreams.filter((w) => w.kind === 'intervencion')
  const proyectos = workstreams.filter((w) => w.kind === 'proyecto_interno')

  return (
    <div className="flex h-full w-[200px] flex-shrink-0 flex-col gap-5 border-r border-white/[0.06] px-3 py-6">
      <div className="flex flex-col gap-2">
        <span className="px-3 font-medium text-[#444444]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Mi trabajo
        </span>
        <FilterToggle label="Personal" active={onlyMine} count={myTaskCount} color="#1E5FAD" Icon={UsersIcon} onClick={onToggleOnlyMine} />
      </div>

      <div className="h-px bg-white/[0.06]" />

      <div className="flex flex-col gap-3">
        <span className="px-3 font-medium text-[#444444]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Equipo
        </span>

        <NavItem label="Trabajo" Icon={BriefcaseIcon} iconColor="#888888" active={!onlyMine && selectedId === null} onClick={() => onSelect(null)} />

        {intervenciones.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="px-3 pb-1 text-[11px] text-[#444444]">Intervenciones</span>
            {intervenciones.map((w) => (
              <NavItem
                key={w.id}
                label={w.name}
                sublabel={`Semana ${w.interventionWeek} de ${w.interventionTotalWeeks}`}
                accentColor="#1E5FAD"
                active={selectedId === w.id}
                onClick={() => onSelect(w.id)}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          <span className="px-3 pb-1 text-[11px] text-[#444444]">Proyectos Internos</span>
          {proyectos.map((w) => (
            <NavItem key={w.id} label={w.name} accentColor="#B8860B" active={selectedId === w.id} onClick={() => onSelect(w.id)} />
          ))}
          <button
            type="button"
            onClick={onNewProyecto}
            className="mt-1 rounded-xl px-3 py-2 text-left text-[13px] text-[#444444] transition-colors duration-150 hover:text-[#F5F5F5]"
          >
            + Nuevo Proyecto Interno
          </button>
        </div>

        {intervenciones.length === 0 && (
          <div className="mx-3 mt-1 rounded-xl border border-dashed border-white/[0.08] px-2.5 py-2">
            <p className="text-[11px] leading-relaxed text-[#666666]">
              Las Intervenciones aparecen aquí solas cuando un SPC pasa a Intervención Activa en Clientes.
            </p>
          </div>
        )}
      </div>

      <WorkloadPanel workload={workload} />
    </div>
  )
}
