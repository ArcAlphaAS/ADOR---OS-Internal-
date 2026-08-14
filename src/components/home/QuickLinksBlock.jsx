const LINKS = ['Google Drive']

export default function QuickLinksBlock() {
  return (
    <div>
      <span
        className="font-medium text-[#444444]"
        style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        Accesos Rápidos
      </span>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {LINKS.map((label) => (
          <a
            key={label}
            href="#"
            className="rounded-[20px] border border-white/[0.16] bg-white/[0.04] px-4 py-1.5 text-[12px] text-[#888888] transition-colors duration-150 hover:border-white/[0.24] hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
