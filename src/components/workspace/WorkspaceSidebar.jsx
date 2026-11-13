import { useState } from 'react'
import { UsersIcon, BriefcaseIcon } from '../icons'
import ContextMenu from '../common/ContextMenu'
import ConfirmDeleteModal from '../common/ConfirmDeleteModal'
import PromptModal from '../common/PromptModal'
import { useContextMenu } from '../../hooks/useContextMenu'
import { renameProyectoInterno, deleteProyectoInterno } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'

// Lista de proyectos como en Recordatorios de iOS: filas sencillas con su punto de color, el nombre y,
// a la derecha, cuántas tareas siguen abiertas; la fila elegida se marca con un fondo suave.
function NavItem({ label, sublabel, count, active, accentColor, onClick, disabled, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      title={disabled ? 'Se crea automáticamente cuando un SPC pasa a Intervención Activa' : undefined}
      className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left transition-colors duration-150 hover:bg-white/[0.05]"
      style={{ background: active ? 'rgba(255,255,255,0.09)' : undefined, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}
    >
      <span className="h-[9px] w-[9px] flex-shrink-0 rounded-full" style={{ background: accentColor || '#8E8E93' }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px]" style={{ color: active ? '#F5F5F5' : '#D2D2D7', fontWeight: active ? 600 : 400 }}>{label}</span>
        {sublabel && <span className="block truncate text-[12px] text-[#8E8E93]">{sublabel}</span>}
      </span>
      {count > 0 && <span className="flex-shrink-0 text-[13px] tabular-nums text-[#8E8E93]">{count}</span>}
    </button>
  )
}

// Las dos "listas inteligentes" de arriba, como los mosaicos de Recordatorios: icono en un círculo,
// la cifra grande y el nombre. El elegido se rellena en blanco.
function SmartTile({ label, count, active, Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex flex-col gap-3 rounded-[16px] p-3 text-left transition-colors duration-150"
      style={{ background: active ? '#F5F5F5' : 'rgba(255,255,255,0.06)', color: active ? '#0A0A0A' : '#F5F5F5' }}
    >
      <span className="flex items-start justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: active ? '#0A0A0A' : 'rgba(255,255,255,0.14)', color: active ? '#F5F5F5' : '#F5F5F5' }}>
          <Icon size={13} />
        </span>
        <span className="text-[22px] font-semibold leading-none tabular-nums">{count ?? 0}</span>
      </span>
      <span className="text-[13.5px] font-medium" style={{ color: active ? '#0A0A0A' : '#B8B8BD' }}>{label}</span>
    </button>
  )
}

const sectionTitle = 'px-3 pb-1 text-[13px] font-semibold text-[#8E8E93]'

// At-a-glance workload balance across all 3 associates — "who's about to be
// overloaded this week" wasn't visible anywhere before; "Mis tareas" only
// shows your own load, never how it compares to your two teammates'.
function WorkloadRow({ row, maxCount }) {
  const overloaded = row.dueThisWeekCount >= 5
  const pct = maxCount ? Math.round((row.openCount / maxCount) * 100) : 0
  const first = row.displayName.split(' ')[0]
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.1] text-[12px] font-medium text-[#E4E4E4]">{first.charAt(0).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] text-[#E4E4E4]">{first}</span>
          <span className="flex-shrink-0 text-[12px] tabular-nums" style={{ color: overloaded ? '#EF8A85' : '#8E8E93' }}>
            {row.dueThisWeekCount > 0 ? `${row.dueThisWeekCount} esta sem.` : `${row.openCount} abiertas`}
          </span>
        </div>
        <div className="mt-1.5 h-[4px] w-full overflow-hidden rounded-full bg-white/[0.09]">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: overloaded ? '#EF8A85' : '#F4EEE2' }} />
        </div>
      </div>
    </div>
  )
}

function WorkloadPanel({ workload }) {
  if (workload.length === 0) return null
  const maxCount = Math.max(...workload.map((r) => r.openCount))
  return (
    <div className="flex flex-col gap-1 border-t border-white/[0.07] pt-5">
      <span className={sectionTitle}>Carga del equipo</span>
      {workload.map((row) => (
        <WorkloadRow key={row.userId} row={row} maxCount={maxCount} />
      ))}
    </div>
  )
}

// Restructured 2026-09-16: "Hoy" moved out to its own tab (see
// WorkspaceModule.jsx), so this sidebar now only scopes the team views
// (Lista/Kanban/Timeline) — Personal (everything assigned to me, any
// workstream) vs. Equipo (a specific Intervención/Proyecto, or all of them).
export default function WorkspaceSidebar({ canManage = false, taskCounts = {}, openCounts = {}, neutral = false, actorName = 'Usuario',
  workstreams,
  selectedId,
  onSelect,
  onNewProyecto,
  onlyMine,
  onToggleOnlyMine,
  myTaskCount,
  workload = [],
}) {
  const { menu, bind, close } = useContextMenu()
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const showToast = useToast()
  const intervenciones = workstreams.filter((w) => w.kind === 'intervencion')
  const proyectos = workstreams.filter((w) => w.kind === 'proyecto_interno')
  const totalOpen = Object.values(openCounts).reduce((n, v) => n + v, 0)

  return (
    <div className="hidden h-full w-[232px] flex-shrink-0 flex-col gap-6 overflow-y-auto border-r border-white/[0.07] px-3 pb-6 pt-[88px] md:flex">
      <div className="grid grid-cols-2 gap-2.5">
        <SmartTile label="Personal" count={myTaskCount} active={!neutral && onlyMine} Icon={UsersIcon} onClick={onToggleOnlyMine} />
        <SmartTile label="Grupo" count={totalOpen} active={!neutral && !onlyMine && selectedId === null} Icon={BriefcaseIcon} onClick={() => onSelect(null)} />
      </div>

      {intervenciones.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className={sectionTitle}>Intervenciones</span>
          {intervenciones.map((w) => (
            <NavItem
              key={w.id}
              label={w.name}
              sublabel={`Semana ${w.interventionWeek} de ${w.interventionTotalWeeks}`}
              count={openCounts[w.id]}
              accentColor="#F4EEE2"
              active={!neutral && !onlyMine && selectedId === w.id}
              onClick={() => onSelect(w.id)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        <span className={sectionTitle}>Proyectos internos</span>
        {proyectos.map((w) => (
          <NavItem key={w.id} label={w.name} count={openCounts[w.id]} accentColor="#B8860B" active={!neutral && !onlyMine && selectedId === w.id} onClick={() => onSelect(w.id)} {...bind(w)} />
        ))}
        <button
          type="button"
          onClick={onNewProyecto}
          className="mt-1 flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[14px] font-medium text-[#F4EEE2] transition-colors hover:bg-white/[0.05]"
        >
          <span className="flex h-[9px] w-[9px] items-center justify-center text-[15px] leading-none">+</span>
          Nuevo proyecto
        </button>
      </div>

      {intervenciones.length === 0 && (
        <p className="px-3 text-[12px] leading-relaxed text-[#6E6E73]">Las intervenciones aparecen aquí solas cuando un SPC pasa a Intervención Activa en Clientes.</p>
      )}

      <WorkloadPanel workload={workload} />

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={menu.payload.name}
          subtitle={`Proyecto Interno · ${taskCounts[menu.payload.id] || 0} tareas`}
          onClose={close}
          items={[
            { label: 'Abrir', onClick: () => onSelect(menu.payload.id) },
            // Renombrar y eliminar proyectos: solo administradores.
            canManage && { label: 'Renombrar…', onClick: () => setRenaming(menu.payload) },
            canManage && { divider: true },
            canManage && { label: 'Eliminar proyecto…', danger: true, disabled: menu.payload.name.trim().toLowerCase() === 'general', hint: menu.payload.name.trim().toLowerCase() === 'general' ? 'no se puede' : undefined, onClick: () => setDeleting(menu.payload) },
          ]}
        />
      )}
      {renaming && (
        <PromptModal
          title="Renombrar proyecto"
          label="Nombre"
          initial={renaming.name}
          onClose={() => setRenaming(null)}
          onSubmit={(name) => renameProyectoInterno(renaming.proyectoId, name).then(() => showToast('Proyecto renombrado.')).catch((e) => { showToast(`No se pudo renombrar: ${e.message}`); throw e })}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          title={`¿Eliminar «${deleting.name}»?`}
          description="El proyecto desaparece para todo el equipo. Sus tareas no se pierden: pasan al proyecto «General»."
          name={deleting.name}
          warnings={taskCounts[deleting.id] ? [`${taskCounts[deleting.id]} ${taskCounts[deleting.id] === 1 ? 'tarea pasará' : 'tareas pasarán'} a «General».`] : []}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            if (selectedId === deleting.id) onSelect(null)
            await deleteProyectoInterno(deleting.proyectoId, deleting.name, actorName)
            showToast(`Se eliminó «${deleting.name}».`)
          }}
        />
      )}
    </div>
  )
}
