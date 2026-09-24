import { useRef } from 'react'
import { ArrowRightIcon, ArrowLeftIcon, PinIcon } from '../icons'

// News' editorial layout (from the user's two reference images): a big
// featured story, a "Lo último" list beside it, and an "Editorial" row of
// cards underneath with arrows. Headlines use Apple's serif ("New York" on
// iPhone/Mac, via ui-serif) — the one place in ADOR OS with a serif, to
// read as a publication rather than a dashboard.
export const SERIF = { fontFamily: "ui-serif, 'New York', 'Iowan Old Style', Georgia, serif" }

export const NEWS_CATEGORIES = ['Estrategia', 'Operaciones', 'Clientes', 'People', 'Cultura', 'Eventos']

export function formatNewsDate(ts, short = false) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  if (short) return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '').toUpperCase()
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

// A cover: the post's photo, or — when it has none — a quiet gradient so
// the layout never shows an empty/broken image box.
export function Cover({ post, className = '', zoom = false }) {
  if (post.coverImageUrl) {
    return (
      <img
        src={post.coverImageUrl}
        alt=""
        loading="lazy"
        className={`h-full w-full object-cover ${zoom ? 'transition-transform duration-700 ease-out group-hover:scale-[1.04]' : ''} ${className}`}
      />
    )
  }
  return (
    <div
      className={`h-full w-full ${className}`}
      style={{ background: 'radial-gradient(120% 90% at 20% 0%, rgba(232,193,90,0.14) 0%, transparent 55%), linear-gradient(160deg, #1D1B18 0%, #0C0C0D 100%)' }}
    />
  )
}

export function CategoryChip({ category, onImage = false }) {
  if (!category) return null
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] ${
        onImage ? 'bg-black/45 text-white/90 backdrop-blur-md' : 'bg-white/[0.07] text-[#BBBBBB]'
      }`}
    >
      {category}
    </span>
  )
}

function ArrowButton({ light = false }) {
  return (
    <span
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5 ${
        light ? 'bg-white text-[#0A0A0A]' : 'border border-white/[0.14] text-[#DDDDDD]'
      }`}
    >
      <ArrowRightIcon size={15} />
    </span>
  )
}

export function FeaturedStory({ post, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="ador-wrap group relative block h-full min-h-[340px] w-full overflow-hidden rounded-[22px] border border-white/[0.08] text-left md:min-h-[400px]"
    >
      <div className="absolute inset-0">
        <Cover post={post} zoom />
      </div>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,8,9,0.85) 0%, rgba(8,8,9,0.45) 50%, rgba(8,8,9,0.05) 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: 'linear-gradient(180deg, transparent, rgba(8,8,9,0.7))' }} />
      <div className="relative flex h-full flex-col justify-end gap-3 p-6 md:p-8">
        <div className="flex items-center gap-2">
          <CategoryChip category={post.category} onImage />
          {post.pinned && (
            <span className="flex items-center gap-1 rounded-md bg-[#E8C15A]/20 px-2 py-0.5 text-[10.5px] font-medium text-[#E8C15A]">
              <PinIcon size={9} /> Destacado
            </span>
          )}
        </div>
        <h2 className="max-w-[560px] text-[30px] leading-[1.1] text-white md:text-[40px]" style={SERIF}>
          {post.title}
        </h2>
        {post.subtitle && <p className="max-w-[440px] text-[14.5px] leading-relaxed text-white/80">{post.subtitle}</p>}
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="text-[12.5px] text-white/60">
            {formatNewsDate(post.createdAt)}
            {post.createdBy ? ` · Por ${post.createdBy}` : ''}
          </p>
          <ArrowButton light />
        </div>
      </div>
    </button>
  )
}

export function LatestList({ posts, onOpen }) {
  return (
    <div className="ador-wrap ador-glass ador-grain flex h-full flex-col rounded-[22px] p-5">
      <p className="px-1 text-[22px] text-[#F5F5F5]" style={SERIF}>
        Lo último
      </p>
      <div className="mt-3 flex flex-1 flex-col divide-y divide-white/[0.06]">
        {posts.length === 0 ? (
          <p className="px-1 py-6 text-[13px] text-[#7A7A7A]">Los siguientes anuncios aparecerán aquí.</p>
        ) : (
          posts.map((post) => (
            <button key={post.id} type="button" onClick={() => onOpen(post.id)} className="group flex items-center gap-3.5 py-3 text-left">
              <span className="h-[76px] w-[96px] flex-shrink-0 overflow-hidden rounded-xl">
                <Cover post={post} zoom />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[10.5px] font-medium tracking-[0.06em] text-[#7A7A7A]">{formatNewsDate(post.createdAt, true)}</span>
                <span className="line-clamp-2 text-[14px] font-medium leading-snug text-[#EDEDED]">{post.title}</span>
                {post.category && (
                  <span>
                    <CategoryChip category={post.category} />
                  </span>
                )}
              </span>
              <ArrowButton />
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export function EditorialRow({ posts, onOpen }) {
  const rowRef = useRef(null)
  const scroll = (dir) => {
    const row = rowRef.current
    if (!row) return
    row.scrollBy({ left: dir * (row.clientWidth * 0.9), behavior: 'smooth' })
  }
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] text-[#F5F5F5]" style={SERIF}>
            Editorial
          </h2>
          <p className="mt-0.5 text-[13px] text-[#888888]">Perspectivas, avances y momentos clave de ADOR.</p>
        </div>
        {posts.length > 3 && (
          <div className="hidden gap-2 md:flex">
            <button type="button" onClick={() => scroll(-1)} aria-label="Anteriores" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] text-[#DDDDDD] hover:bg-white/[0.06]">
              <ArrowLeftIcon size={15} />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Siguientes" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] text-[#DDDDDD] hover:bg-white/[0.06]">
              <ArrowRightIcon size={15} />
            </button>
          </div>
        )}
      </div>
      <div ref={rowRef} className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => onOpen(post.id)}
            className="ador-wrap ador-glass group flex w-[85%] flex-shrink-0 snap-start flex-col overflow-hidden rounded-[20px] text-left sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
          >
            <span className="relative block h-[150px] overflow-hidden">
              <Cover post={post} zoom />
              <span className="absolute bottom-3 left-4">
                <CategoryChip category={post.category} onImage />
              </span>
            </span>
            <span className="flex flex-1 flex-col gap-2 p-5">
              <span className="line-clamp-2 text-[21px] leading-[1.15] text-[#F5F5F5]" style={SERIF}>
                {post.title}
              </span>
              {post.subtitle && <span className="line-clamp-2 text-[13px] leading-relaxed text-[#9A9A9A]">{post.subtitle}</span>}
              <span className="mt-auto flex items-end justify-between gap-3 pt-2">
                <span className="text-[12px] text-[#7A7A7A]">
                  {formatNewsDate(post.createdAt)}
                  {post.createdBy ? ` · Por ${post.createdBy}` : ''}
                </span>
                <ArrowButton />
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
