// Deliberately quieter than before — three separate glass boxes at the same
// visual weight as the hero WeeklySummaryCard competed with it for
// attention. One unified strip (same divided-tile pattern as Finanzas'
// FinancialHealthCard) reads as supporting detail, not equals.
function Tile({ label, value, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex flex-1 flex-col gap-1.5 px-5 py-4 text-left font-sans transition-colors duration-150 ${
        onClick ? 'cursor-pointer hover:bg-white/[0.03]' : ''
      }`}
    >
      <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {value === undefined ? (
        <div className="ador-skeleton mt-1 h-[20px] w-10 rounded-md" />
      ) : (
        <span className="text-[20px] font-semibold text-[#F5F5F5]">{value}</span>
      )}
    </Tag>
  )
}

export default function MetricsBlock({ onNavigate, pipelineSPCCount, activeSPCount, tasksTodayCount }) {
  return (
    <div className="ador-glass ador-grain flex divide-x divide-white/[0.06] overflow-hidden rounded-[16px]">
      <Tile label="SPC en Pipeline" value={pipelineSPCCount} onClick={() => onNavigate?.('clientes')} />
      <Tile label="SP Activos" value={activeSPCount} onClick={() => onNavigate?.('clientes')} />
      <Tile label="Tareas Hoy" value={tasksTodayCount} onClick={() => onNavigate?.('workspace')} />
    </div>
  )
}
