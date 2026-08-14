export default function ActivityBlock({ items = [] }) {
  return (
    <div>
      <span
        className="font-medium text-[#444444]"
        style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        Actividad Reciente
      </span>

      {items.length === 0 ? (
        <div className="mt-4 flex items-center gap-2.5">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#444444]"
            style={{ animation: 'ador-pulse 2.4s ease-in-out infinite' }}
          />
          <p className="text-[13px] font-light text-[#444444]">Sin actividad reciente — todo al día</p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.04]">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#444444]" />
              <span className="text-[13px] text-[#888888]">{item.text}</span>
              <span className="ml-auto text-[12px] text-[#444444]">{item.time}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
