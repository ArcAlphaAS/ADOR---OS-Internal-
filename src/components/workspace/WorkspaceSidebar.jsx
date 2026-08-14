function NavItem({ label, sublabel, active, accentColor, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Se crea automáticamente cuando un SPC pasa a Intervención Activa' : undefined}
      className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-colors duration-150"
      style={{
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <div className="flex w-full items-center gap-2">
        {accentColor && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: accentColor }} />}
        <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: active ? '#F5F5F5' : '#888888' }}>
          {label}
        </span>
      </div>
      {sublabel && <span className="pl-3.5 text-[11px] text-[#444444]">{sublabel}</span>}
    </button>
  )
}

export default function WorkspaceSidebar({ workstreams, selectedId, onSelect, onNewProyecto, onlyMine, onToggleOnlyMine, myTaskCount }) {
  const intervenciones = workstreams.filter((w) => w.kind === 'intervencion')
  const proyectos = workstreams.filter((w) => w.kind === 'proyecto_interno')

  return (
    <div className="flex h-full w-[200px] flex-shrink-0 flex-col gap-4 border-r border-white/[0.06] px-3 py-6">
      <button
        type="button"
        onClick={onToggleOnlyMine}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-150"
        style={{ background: onlyMine ? 'rgba(30,95,173,0.16)' : 'transparent' }}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: onlyMine ? '#1E5FAD' : '#F5F5F5' }}>
          Mis tareas
        </span>
        {myTaskCount > 0 && (
          <span
            className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: onlyMine ? 'rgba(30,95,173,0.25)' : 'rgba(255,255,255,0.08)', color: onlyMine ? '#1E5FAD' : '#888888' }}
          >
            {myTaskCount}
          </span>
        )}
      </button>

      <NavItem label="Todo" active={!onlyMine && selectedId === null} onClick={() => onSelect(null)} />

      {intervenciones.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="px-3 pb-1 font-medium text-[#444444]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Intervenciones
          </span>
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
        <span className="px-3 pb-1 font-medium text-[#444444]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Proyectos Internos
        </span>
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

      <NavItem label="+ Nueva Intervención" disabled />
    </div>
  )
}
