import { presenceOf, sharedInConversation } from '../../lib/chat'
import PersonAvatar from './PersonAvatar'

// Panel derecho de Comunicación: cambia con la conversación abierta. En un mensaje
// directo es la tarjeta de la otra persona; en un canal o grupo, su descripción y
// miembros. Debajo, siempre: lo fijado y lo compartido, para no buscarlo en el hilo.
// Solo en pantallas anchas y cuando no hay otro panel (Perfil / Detalles / Hilo) abierto.
function Card({ title, count, action, children }) {
  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#F5F5F5]">
          {title}
          {count > 0 && <span className="ml-2 text-[12px] font-medium tabular-nums text-[#8A8A8A]">{count}</span>}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}

const Pill = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="rounded-full bg-white/[0.07] px-3.5 py-1.5 text-[12.5px] font-medium text-[#E8E8E8] transition-colors duration-150 hover:bg-white/[0.12]">
    {children}
  </button>
)

export default function ChatContextRail({ onNavigate, selected, conversation, dmUser, dmEntry, dmPresence, messages, pins, memberCount, onJump, onOpenImage, onOpenProfile, onOpenInfo }) {
  const isDm = selected?.type === 'dm'
  const shared = sharedInConversation(messages || [])
  const status = isDm ? presenceOf(dmPresence) : null
  const name = isDm ? dmEntry?.name || dmUser?.displayName || dmUser?.email : conversation?.name
  const sub = isDm ? [dmEntry?.role, dmEntry?.area].filter(Boolean).join(' · ') : conversation?.description

  return (
    <aside className="hidden w-[300px] flex-shrink-0 flex-col gap-4 overflow-y-auto xl:flex">
      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-6 text-center">
        {isDm ? (
          <PersonAvatar uid={dmUser?.id} name={name} size={72} showPresence />
        ) : (
          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#26231E] text-[26px] text-[#D9CFBF]">{conversation?.visibility === 'private' ? '🔒' : '#'}</div>
        )}
        <p className="mt-3.5 text-[17px] font-semibold tracking-[-0.01em] text-[#F5F5F5]">{name || 'Conversación'}</p>
        {sub && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-[#8A8A8A]">{sub}</p>}
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] text-[#9A9A9A]">
          {isDm ? (
            <>
              {status?.color && <i className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />}
              {status?.label}
            </>
          ) : (
            `${memberCount || 0} ${memberCount === 1 ? 'miembro' : 'miembros'}`
          )}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {isDm ? <Pill onClick={onOpenProfile}>Perfil</Pill> : <Pill onClick={onOpenInfo}>Detalles</Pill>}
          <Pill onClick={() => onNavigate?.('calendario')}>Agendar</Pill>
          <Pill onClick={() => onNavigate?.('workspace')}>Tareas</Pill>
        </div>
      </div>

      <Card title="Fijados" count={pins.length}>
        {pins.length === 0 ? (
          <p className="text-[12.5px] leading-snug text-[#8A8A8A]">Nada fijado todavía. En un mensaje, ⋯ → Fijar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pins.slice(0, 3).map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onJump(p.id)} className="w-full rounded-2xl bg-white/[0.04] px-3.5 py-2.5 text-left hover:bg-white/[0.07]">
                  <span className="block text-[11.5px] text-[#8A8A8A]">{p.authorName}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-[#F0F0F0]">{p.text || 'Mensaje'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Compartido" count={shared.files.length + shared.links.length}>
        {shared.files.length === 0 && shared.links.length === 0 ? (
          <p className="text-[12.5px] leading-snug text-[#8A8A8A]">Aún no se ha compartido nada aquí.</p>
        ) : (
          <>
            {shared.files.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {shared.files.slice(0, 6).map((f) => (
                  <button key={f.id} type="button" onClick={() => onOpenImage?.(f.attachment)} className="aspect-square overflow-hidden rounded-xl bg-white/[0.05]">
                    <img decoding="async" src={f.src} alt={f.name || ''} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {shared.links.length > 0 && (
              <ul className={`flex flex-col gap-1.5 ${shared.files.length ? 'mt-3' : ''}`}>
                {shared.links.slice(0, 3).map((l) => (
                  <li key={l.id}>
                    <a href={l.url} target="_blank" rel="noreferrer" className="block truncate rounded-xl bg-white/[0.04] px-3 py-2 text-[12.5px] text-[#E4E4E4] hover:bg-white/[0.07]">
                      {l.label} <span className="text-[#8A8A8A]">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </aside>
  )
}
