import Logo from '../Logo'
import { PinIcon } from '../icons'

function formatDate(ts) {
  if (!ts?.toDate) return null
  return ts.toDate().toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Full-bleed "press release" hero card — built from two reference images
// the user shared (NASA/SpaceX-style announcement cards: a background
// photo fading to a solid color at the bottom, a small brand mark top-left,
// a date top-right, a bold headline + one-line subtitle over the fade, and
// a pill CTA). Adapted to ADOR's dark theme: the references fade to white,
// this fades to ADOR's own near-black background instead, and the ADOR
// wordmark (Logo.jsx) stands in for the NASA/SpaceX logo. No image upload
// (Firebase Storage isn't enabled) — `coverImageUrl` is a pasted link, same
// workaround already used elsewhere in this app; with none set, the card
// falls back to a plain dark gradient rather than a broken/empty image.
export default function NewsHeroCard({ post, onOpen }) {
  const hasImage = !!post.coverImageUrl
  const date = formatDate(post.createdAt)

  return (
    <div
      onClick={onOpen}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] ${onOpen ? 'cursor-pointer' : ''}`}
      style={{ aspectRatio: '16 / 8.5' }}
    >
      {/* Background: real image, or a dark gradient stand-in */}
      {hasImage ? (
        <img
          src={post.coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 100% at 30% 0%, #1E5FAD22 0%, transparent 55%), linear-gradient(160deg, #1C1C20 0%, #0A0A0B 100%)' }}
        />
      )}

      {/* Top scrim, keeps the logo/date legible over any image */}
      <div className="absolute inset-x-0 top-0 h-16" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%)' }} />

      {/* Bottom fade into ADOR's own background color, per the reference */}
      <div className="absolute inset-x-0 bottom-0 h-[65%]" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,11,0.55) 40%, #0A0A0B 92%)' }} />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-4">
        <Logo size={14} />
        <div className="flex items-center gap-2">
          {post.pinned && (
            <span className="flex items-center gap-1 rounded-full bg-[#B8860B]/20 px-2 py-0.5 text-[10px] font-medium text-[#D4A017]">
              <PinIcon size={9} /> Destacado
            </span>
          )}
          {date && <span className="text-[11px] font-medium text-white/70">{date}</span>}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold leading-tight text-white drop-shadow-sm">{post.title}</h2>
          {post.subtitle && <p className="mt-1 line-clamp-2 text-[13px] text-white/75">{post.subtitle}</p>}
        </div>
        {onOpen && (
          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-white/95 px-4 py-2 text-[12px] font-medium text-[#0A0A0B] transition-colors duration-150 group-hover:bg-white">
            Leer más
          </span>
        )}
      </div>
    </div>
  )
}
