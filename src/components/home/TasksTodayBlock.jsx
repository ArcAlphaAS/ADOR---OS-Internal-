const timeFormatter = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })

const STATUS_STYLE = {
  por_hacer: { label: 'Por Hacer', color: '#888888' },
  en_progreso: { label: 'En Progreso', color: '#1E5FAD' },
  completado: { label: 'Completado', color: '#4CAF50' },
  bloqueado: { label: 'Bloqueado', color: '#EF5350' },
}

export default function TasksTodayBlock({ tasks = [] }) {
  return (
    <div className="ador-glass ador-grain rounded-[20px] px-7 py-6">
      <div className="flex items-center gap-2">
        <span
          className="font-medium text-[#444444]"
          style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Tareas Hoy
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#1E5FAD]"
          style={{ animation: 'ador-pulse 2s ease-in-out infinite' }}
        />
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="ador-skeleton h-[2px] w-2/3 rounded-full" />
          <p className="text-[14px] font-light text-[#444444]">Sin tareas para hoy</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Tarea', 'Cliente', 'Hora', 'Estado'].map((label) => (
                  <th
                    key={label}
                    className="pb-2.5 pr-4 font-medium text-[#444444]"
                    style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {tasks.map((task) => {
                const status = STATUS_STYLE[task.status] || STATUS_STYLE.por_hacer
                return (
                  <tr key={task.id}>
                    <td className="py-3 pr-4 text-[13px] text-[#F5F5F5]">{task.title}</td>
                    <td className="py-3 pr-4 text-[13px] text-[#888888]">{task.clientName || '—'}</td>
                    <td className="py-3 pr-4 text-[13px] text-[#888888]">{timeFormatter.format(task.dueDate)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{ background: `${status.color}22`, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
