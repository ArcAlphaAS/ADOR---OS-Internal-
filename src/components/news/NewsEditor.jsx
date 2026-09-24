import { useRef, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
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
  const [requireAck, setRequireAck] = useState(initial?.requireAck || false)
  const [scheduling, setScheduling] = useState(initial?.status === 'scheduled')
  const [publishAt, setPublishAt] = useState(() => {
    const d = initial?.publishAt?.toDate?.() || new Date(Date.now() + 864e5)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [formError, setFormError] = useState('')
  const bodyRef = useRef(null)
  const imageRef = useRef(null)
  const isLive = initial && (!initial.status || initial.status === 'published')

  // Toolbar: wraps/prefixes the selected text with the Markdown the page
  // renders, so nobody has to type symbols by hand.
  const edit = (fn) => {
    const el = bodyRef.current
    const start = el?.selectionStart ?? body.length
    const end = el?.selectionEnd ?? body.length
    const { text, cursor } = fn(body.slice(0, start), body.slice(start, end), body.slice(end))
    setBody(text)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(cursor, cursor)
    })
  }
  const wrap = (mark, placeholder) =>
    edit((before, sel, after) => {
      const inner = sel || placeholder
      return { text: `${before}${mark}${inner}${mark}${after}`, cursor: before.length + mark.length + inner.length + mark.length }
    })
  const linePrefix = (prefix, placeholder) =>
    edit((before, sel, after) => {
      const lineStart = before.lastIndexOf('\n') + 1
      const head = before.slice(0, lineStart)
      const current = before.slice(lineStart) + (sel || (before.slice(lineStart) ? '' : placeholder))
      const lines = current.split('\n').map((l) => `${prefix}${l}`).join('\n')
      return { text: `${head}${lines}${after}`, cursor: head.length + lines.length }
    })
  const insertBlock = (block) =>
    edit((before, sel, after) => {
      const pre = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
      const text = `${before}${pre}${block}\n\n${after}`
      return { text, cursor: before.length + pre.length + block.length + 2 }
    })
  const addLink = () => {
    const url = window.prompt('Pega el enlace (https://…)')
    if (!url) return
    edit((before, sel, after) => {
      const label = sel || 'texto del enlace'
      const chunk = `[${label}](${url.trim()})`
      return { text: `${before}${chunk}${after}`, cursor: before.length + chunk.length }
    })
  }
  const addInlineImage = async (file) => {
    if (!file) return
    try {
      const url = await resizeImageToDataUrl(file, 1100, 0.72)
      insertBlock(`![imagen](${url})`)
    } catch {
      setImageError('No se pudo leer esa imagen.')
    }
  }

  // One Firestore document holds the whole post — keep it under ~1MB.
  const tooBig = () => title.length + subtitle.length + body.length + coverImageUrl.length > 950_000

  const save = (status) => {
    setFormError('')
    if (tooBig()) return setFormError('El anuncio pesa demasiado (demasiadas imágenes). Quita alguna o usa imágenes más livianas.')
    const data = { title: title.trim(), subtitle: subtitle.trim(), coverImageUrl: coverImageUrl.trim(), body, pinned, category, requireAck, status }
    if (status === 'scheduled') {
      const when = new Date(publishAt)
      if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) return setFormError('Elige una fecha y hora futuras para programarlo.')
      data.publishAt = Timestamp.fromDate(when)
    } else data.publishAt = null
    onSave(data)
  }
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

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
        {[
          ['Título', () => linePrefix('## ', 'Título de sección')],
          ['B', () => wrap('**', 'negrita')],
          ['I', () => wrap('*', 'cursiva')],
          ['• Lista', () => linePrefix('- ', 'elemento')],
          ['❝ Cita', () => linePrefix('> ', 'cita')],
          ['🔗 Enlace', addLink],
          ['🖼 Imagen', () => imageRef.current?.click()],
        ].map(([label, fn]) => (
          <button
            key={label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={fn}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] text-[#CCCCCC] hover:bg-white/[0.07] hover:text-[#F5F5F5] ${label === 'B' ? 'font-bold' : label === 'I' ? 'italic' : ''}`}
          >
            {label}
          </button>
        ))}
        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => addInlineImage(e.target.files?.[0])} />
        <div className="ml-auto flex items-center gap-1 rounded-full bg-white/[0.04] p-0.5 lg:hidden">
          {['editar', 'vista previa'].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className="rounded-full px-3 py-1 text-[11.5px] font-medium capitalize" style={{ background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === t ? '#F5F5F5' : '#777777' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Text and live preview side by side on a computer; tabs on a phone. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe el anuncio. Usa los botones de arriba para títulos, negrita, listas, enlaces e imágenes."
          rows={14}
          className={`${tab === 'editar' ? 'block' : 'hidden'} w-full resize-y rounded-xl border border-white/[0.1] bg-[#0E0E0E] px-4 py-3 text-[13.5px] leading-relaxed text-[#F5F5F5] placeholder:text-[#555555] outline-none lg:block`}
        />
        <div className={`${tab === 'editar' ? 'hidden' : 'block'} ador-wrap max-h-[480px] min-h-[200px] overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 lg:block`}>
          <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[#666666]">Vista previa</p>
          {body.trim() ? renderMarkdown(body) : <p className="text-[13px] text-[#555555]">Así se verá el texto del anuncio.</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[#AAAAAA]">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-3.5 w-3.5 accent-[#B8860B]" />
          Destacado (arriba del todo)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[#AAAAAA]">
          <input type="checkbox" checked={requireAck} onChange={(e) => setRequireAck(e.target.checked)} className="h-3.5 w-3.5 accent-[#B8860B]" />
          Pedir confirmación de lectura
        </label>
      </div>

      {scheduling && !isLive && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E8C15A]/25 bg-[#E8C15A]/[0.05] p-3">
          <span className="text-[12.5px] text-[#E8C15A]">Publicar el</span>
          <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="rounded-lg border border-white/[0.1] bg-[#141414] px-3 py-1.5 text-[13px] text-[#F5F5F5] outline-none [color-scheme:dark]" />
          <span className="basis-full text-[11.5px] leading-relaxed text-[#9A9A9A]">
            Se publica y avisa al equipo a esa hora <strong className="text-[#CFC6B8]">si algún administrador tiene ADOR OS abierto</strong>. Si nadie lo tiene abierto, sale en cuanto alguien entre.
          </span>
        </div>
      )}

      {(formError || imageError) && <p className="text-[12.5px] text-[#EF8A88]">{formError || imageError}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="mr-auto rounded-lg px-4 py-2 text-[13px] text-[#888888] hover:text-[#F5F5F5]">
          Cancelar
        </button>
        {isLive ? (
          <button type="button" disabled={!canSave} onClick={() => save('published')} className="ador-btn-primary rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        ) : (
          <>
            <button type="button" disabled={!title.trim() || saving} onClick={() => save('draft')} className="rounded-lg border border-white/[0.12] px-4 py-2 text-[13px] text-[#DDDDDD] hover:bg-white/[0.05] disabled:opacity-50">
              Guardar borrador
            </button>
            {scheduling ? (
              <button type="button" disabled={!canSave} onClick={() => save('scheduled')} className="rounded-lg bg-[#E8C15A] px-4 py-2 text-[13px] font-semibold text-[#1C1A16] disabled:opacity-50">
                {saving ? 'Guardando…' : 'Programar'}
              </button>
            ) : (
              <button type="button" onClick={() => setScheduling(true)} className="rounded-lg border border-white/[0.12] px-4 py-2 text-[13px] text-[#DDDDDD] hover:bg-white/[0.05]">
                Programar…
              </button>
            )}
            <button type="button" disabled={!canSave} onClick={() => save('published')} className="ador-btn-primary rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-50">
              {saving ? 'Publicando…' : 'Publicar ahora'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
