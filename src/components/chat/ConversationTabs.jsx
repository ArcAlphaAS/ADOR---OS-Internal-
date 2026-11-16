import { sharedInConversation } from '../../lib/chat'
import PersonAvatar from './PersonAvatar'

// Pestañas de una conversación: Mensajes · Archivos · Fijados. Archivos y Fijados
// salen de lo que ya está cargado y de lo fijado en la conversación; no hay índices nuevos.
export function ConvTabs({ tab, onTab, fileCount, pinCount }) {
  const items = [
    { id: 'msgs', label: 'Mensajes' },
    { id: 'files', label: 'Archivos', n: fileCount },
    { id: 'pins', label: 'Fijados', n: pinCount },
  ]
  return (
    <div className="mt-2 flex items-center gap-1 max-md:hidden" role="tablist">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => onTab(t.id)}
          className={`relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${tab === t.id ? 'bg-white/[0.1] text-[#F5F5F5]' : 'text-[#8A8A8A] hover:text-[#F5F5F5]'}`}
        >
          {t.label}
          {t.n > 0 && <span className="ml-1.5 text-[11.5px] tabular-nums text-[#8A8A8A]">{t.n}</span>}
        </button>
      ))}
    </div>
  )
}

const EmptyPane = ({ text }) => (
  <div className="flex flex-1 items-center justify-center px-6 text-center text-[13.5px] text-[#8A8A8A]">{text}</div>
)

export function FilesPane({ messages, onOpenImage }) {
  const { files, links } = sharedInConversation(messages)
  if (!files.length && !links.length) return <EmptyPane text="Aún no se ha compartido nada aquí." />
  return (
    <div className="mt-3 flex-1 overflow-y-auto pb-4">
      {files.length > 0 && (
        <>
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#8A8A8A]">Imágenes</p>
          <div className="grid grid-cols-4 gap-2">
            {files.map((f) => (
              <button key={f.id} type="button" onClick={() => onOpenImage?.(f.attachment)} className="aspect-square overflow-hidden rounded-2xl bg-white/[0.05]">
                <img decoding="async" src={f.src} alt={f.name || ''} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
      {links.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-[12px] font-medium uppercase tracking-[0.1em] text-[#8A8A8A]">Enlaces y documentos</p>
          <ul className="flex flex-col gap-1.5">
            {links.map((l) => (
              <li key={l.id}>
                <a href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 hover:bg-white/[0.07]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-[#F0F0F0]">{l.label}</span>
                    <span className="block truncate text-[12px] text-[#8A8A8A]">{l.drive ? 'Documento oficial · Drive' : l.host}</span>
                  </span>
                  <span className="text-[#8A8A8A]">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function PinsPane({ pins, onJump, onUnpin }) {
  if (!pins.length) return <EmptyPane text="Nada fijado. En un mensaje, ⋯ → Fijar." />
  return (
    <ul className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pb-4">
      {pins.map((p) => (
        <li key={p.id} className="flex items-start gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
          <PersonAvatar uid={p.authorUid} name={p.authorName} size={28} />
          <button type="button" onClick={() => onJump(p.id)} className="min-w-0 flex-1 text-left">
            <span className="block text-[12px] text-[#8A8A8A]">{p.authorName}</span>
            <span className="mt-0.5 line-clamp-3 block text-[14px] leading-snug text-[#F0F0F0]">{p.text || 'Mensaje'}</span>
          </button>
          <button type="button" onClick={() => onUnpin(p.id)} className="text-[12px] text-[#8A8A8A] hover:text-[#F5F5F5]">Quitar</button>
        </li>
      ))}
    </ul>
  )
}
