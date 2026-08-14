function MetricCard({ label, value, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`ador-glass ador-grain w-full appearance-none rounded-2xl px-6 py-5 text-left font-sans transition-colors duration-150 ${
        onClick ? 'cursor-pointer hover:bg-white/[0.06]' : ''
      }`}
    >
      <span
        className="font-medium text-[#444444]"
        style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        {label}
      </span>
      {value === undefined ? (
        <div className="ador-skeleton mt-3 h-[22px] w-14 rounded-md" />
      ) : (
        <div className="mt-2 text-[28px] font-semibold text-[#F5F5F5]">{value}</div>
      )}
    </Tag>
  )
}

export default function MetricsBlock({ onNavigate, pipelineSPCCount, activeSPCount, tasksTodayCount }) {
  return (
    <div className="grid grid-cols-3 gap-5">
      <MetricCard label="SPC en Pipeline" value={pipelineSPCCount} onClick={() => onNavigate?.('clientes')} />
      <MetricCard label="SP Activos" value={activeSPCount} onClick={() => onNavigate?.('clientes')} />
      <MetricCard label="Tareas Hoy" value={tasksTodayCount} onClick={() => onNavigate?.('workspace')} />
    </div>
  )
}
