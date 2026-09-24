import { useState } from 'react'
import { renderMarkdown } from '../../lib/knowledge'
import NewsHeroCard from './NewsHeroCard'
import { NEWS_CATEGORIES } from './NewsLayout'
import { resizeImageToDataUrl } from '../../lib/image'

// Title + subtitle (the hero card's teaser text) + a Markdown body (the
// full post, shown once opened) + an optional cover image — no category
// picker, a news post has one flat feed, no taxonomy — plus a "Destacado"
// pin checkbox. `coverImageUrl` is a plain URL field rather than a real
// upload: Firebase Storage isn't enabled in this project yet (same reason
// Clientes → Documentos and Finanzas → Comprobante are metadata-only), so
// this is the same pragmatic workaround already used for Conocimiento —
// paste a link (an image host, Drive, etc.) instead of uploading a file.
export default function NewsEditor({ initial, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '')
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl || '')
  const [body, setBody] = useState(initial?.body || '')
  const [pinned, setPinned] = useState(initial?.pinned || false)
  const [category, setCategory] = useState(initial?.category || '')
  const [imageError, setImageError] = useState('')
  // A photo from the device, shrunk to 1400px and stored in the post
  // itself (same Storage-free approach as profile photos, lib/image.js).
  // Capped well under Firestore's 1MB-per-document limit.
  const pickImage = async (file) => {
    if (!file) return
    setImageError('')
    try {
      const url = await resizeImageToDataUrl(file, 1400, 0.78)
      if (url.length > 700_000) {
        const smaller = await resizeImageToDataUrl(file, 1000, 0.7)
        if (smaller.length > 700_000) return setImageError('La imagen es demasiado pesada — prueba con otra.')
        return setCoverImageUrl(smaller)
      }
      setCoverImageUrl(url)
    } catch {
      setImageError('No se pudo leer esa imagen.')
    }
  }
  const [tab, setTab] = useState('editar')

  const canSave = title.trim() && body.trim() && !saving

  return (
    <div className="ador-glass ador-grain flex flex-col gap-4 rounded-2xl p-6">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titular del anuncio"
        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-[15px] font-medium text-[#F5F5F5] placeholder:text-[#444444] outline-none"
      />
      <input
        type="text"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="Subtítulo corto (se muestra en la tarjeta)"
        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-[#8A8A8A]">Categoría</span>
        {NEWS_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? '' : c)}
            className="rounded-full border px-3 py-1 text-[12px] transition-colors"
            style={{ borderColor: category === c ? '#E8C15A' : 'rgba(255,255,255,0.1)', color: category === c ? '#E8C15A' : '#AAAAAA', background: category === c ? 'rgba(232,193,90,0.1)' : 'transparent' }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-[#DDDDDD] hover:bg-white/[0.06]">
            {coverImageUrl ? 'Cambiar foto de portada' : 'Subir foto de portada'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
          </label>
          {coverImageUrl && (
            <button type="button" onClick={() => setCoverImageUrl('')} className="px-2 text-[12.5px] text-[#8A8A8A] hover:text-[#EF5350]">
              Quitar
            </button>
          )}
          {!coverImageUrl.startsWith('data:') && (
            <input
              type="text"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="…o pega el enlace de una imagen"
              className="min-w-[200px] flex-1 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
            />
          )}
        </div>
        {imageError && <p className="text-[12px] text-[#EF8A88]">{imageError}</p>}
      </div>

      {(title || subtitle || coverImageUrl) && (
        <NewsHeroCard post={{ title: title || 'Titular del anuncio', subtitle, coverImageUrl, pinned, category, createdAt: null }} />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1">
          {['editar', 'vista previa'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="rounded-full px-3 py-1 text-[11.5px] font-medium capitalize transition-colors duration-150"
              style={{ background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === t ? '#F5F5F5' : '#666666' }}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#888888]">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-3.5 w-3.5 accent-[#B8860B]" />
          Destacado
        </label>
      </div>

      {tab === 'editar' ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={'Escribe el anuncio completo en Markdown — **negrita**, listas con "- ", [links](url)...'}
          rows={10}
          className="w-full resize-y rounded-xl border border-white/[0.1] bg-[#0E0E0E] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#F5F5F5] placeholder:text-[#444444] outline-none"
        />
      ) : (
        <div className="min-h-[200px] rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
          {body.trim() ? renderMarkdown(body) : <p className="text-[13px] text-[#444444]">Nada que previsualizar todavía.</p>}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-[13px] text-[#888888] hover:text-[#F5F5F5]">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave({ title: title.trim(), subtitle: subtitle.trim(), coverImageUrl: coverImageUrl.trim(), body, pinned, category })}
          className="ador-btn-primary rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-50"
        >
          {saving ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </div>
  )
}
