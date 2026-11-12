import { useEffect, useState } from 'react'

// GIFs de Tenor (la galería de Google). Necesita una clave gratuita
// (VITE_TENOR_API_KEY); sin ella, el botón de GIF no aparece. Se busca por
// texto; sin texto salen los más usados. Se envía el enlace, no el archivo.
export const gifsEnabled = Boolean(import.meta.env.VITE_TENOR_API_KEY)

async function tenor(q) {
  const base = q.trim() ? 'search' : 'featured'
  const params = new URLSearchParams({ key: import.meta.env.VITE_TENOR_API_KEY, client_key: 'ador-os', limit: '24', media_filter: 'tinygif,gif', locale: 'es_PE', contentfilter: 'medium' })
  if (q.trim()) params.set('q', q.trim())
  const res = await fetch(`https://tenor.googleapis.com/v2/${base}?${params}`)
  if (!res.ok) throw new Error('Tenor no respondió')
  const data = await res.json()
  return (data.results || []).map((r) => ({ id: r.id, title: r.content_description || '', preview: r.media_formats?.tinygif?.url, url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url })).filter((g) => g.url && g.preview)
}

export default function GifPicker({ onPick, onClose }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      tenor(q).then((r) => alive && (setItems(r), setError(false))).catch(() => alive && setError(true))
    }, q ? 350 : 0)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q])

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
      <div className="flex items-center gap-2">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un GIF" className="min-w-0 flex-1 rounded-full bg-white/[0.07] px-4 py-2 text-[16px] text-[#F5F5F5] placeholder:text-[#8A8A8A] outline-none md:text-[13.5px]" />
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-[13px] text-[#8E8E93]">Cerrar</button>
      </div>
      <div className="mt-2 grid max-h-[240px] grid-cols-3 gap-1.5 overflow-y-auto">
        {error && <p className="col-span-3 px-2 py-6 text-center text-[13px] text-[#8E8E93]">No se pudieron cargar los GIFs.</p>}
        {!error && items === null && <p className="col-span-3 px-2 py-6 text-center text-[13px] text-[#8E8E93]">Cargando…</p>}
        {!error && items?.length === 0 && <p className="col-span-3 px-2 py-6 text-center text-[13px] text-[#8E8E93]">Sin resultados.</p>}
        {items?.map((g) => (
          <button key={g.id} type="button" onClick={() => onPick(g)} className="aspect-square overflow-hidden rounded-xl bg-white/[0.05]">
            <img decoding="async" src={g.preview} alt={g.title} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <p className="mt-1.5 px-1 text-right text-[10.5px] text-[#636366]">vía Tenor</p>
    </div>
  )
}
