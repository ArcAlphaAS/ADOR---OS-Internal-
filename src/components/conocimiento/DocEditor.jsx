import { useState } from 'react'
import { renderMarkdown, parseAttachments, buildFileContent, linkLabel } from '../../lib/knowledge'
import { useDrivePicker } from '../../hooks/useDrivePicker'
import { driveFileKind } from '../../lib/googleDrive'
import { FOLDER_TINTS } from './FolderIllustration'

// Plain-textarea markdown editor with an Editar/Vista previa toggle — no
// block editor, no rich-text toolbar. Shared between "+ Nuevo documento"
// and editing an existing one; the parent decides create vs. update. `tree`
// is the live, sections-merged tree from ConocimientoModule (not imported
// statically), so admin-added sections show up here immediately too.
export default function DocEditor({ tree, initial, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [subcategory, setSubcategory] = useState(initial?.subcategory || tree[0].subcategories[0].id)
  const parsed = parseAttachments(initial?.content || '')
  const startsAsFiles = !initial || (parsed.files.length > 0 && !/^#/m.test(parsed.note) && parsed.note.length < 600)
  const [mode, setMode] = useState(startsAsFiles ? 'archivo' : 'escribir')
  const [files, setFiles] = useState(parsed.files)
  const [note, setNote] = useState(startsAsFiles ? parsed.note : '')
  const [content, setContent] = useState(initial?.content || '')
  const [linkUrl, setLinkUrl] = useState('')
  const drive = useDrivePicker('conocimiento')
  const switchMode = (m) => {
    if (m === mode) return
    if (m === 'escribir') setContent(buildFileContent(files, note))
    else {
      const p = parseAttachments(content)
      setFiles(p.files)
      setNote(p.note)
    }
    setMode(m)
  }
  const addFiles = (list) => {
    setFiles((cur) => [...cur, ...list])
    if (!title.trim() && list[0]) setTitle(list[0].name.replace(/\.[a-z0-9]{2,5}$/i, ''))
  }
  const pickFromDrive = async () => {
    const picked = await drive.pick({ multiple: true, title: 'Añadir a Conocimiento' })
    if (picked.length) addFiles(picked.map((f) => ({ name: f.name, url: f.url, kind: driveFileKind(f.mimeType) })))
  }
  const addLink = () => {
    const url = linkUrl.trim()
    const info = /^https?:\/\//i.test(url) ? linkLabel(url) : null
    if (!info) return
    addFiles([{ name: title.trim() || info.host, url, kind: info.kind }])
    setLinkUrl('')
  }
  // Attach from Drive inside the Markdown editor (old flow).
  const attachFromDrive = async () => {
    const picked = await drive.pick({ multiple: true, title: 'Adjuntar al documento' })
    if (!picked.length) return
    const lines = picked.map((f) => `📎 [${f.name.replace(/[[\]]/g, '')}](${f.url}) — ${driveFileKind(f.mimeType)}`).join('\n')
    setContent((c) => `${c.trimEnd()}${c.trim() ? '\n\n' : ''}${lines}\n`)
    setTab('editar')
  }
  const [tab, setTab] = useState('editar')
  const finalContent = mode === 'archivo' ? buildFileContent(files, note) : content

  const activeCategoryId = tree.find((cat) => cat.subcategories.some((s) => s.id === subcategory))?.id || tree[0].id
  const canSave = title.trim() && finalContent.trim() && !saving

  const catIndex = Math.max(0, tree.findIndex((c) => c.id === activeCategoryId))
  const tint = FOLDER_TINTS[catIndex % FOLDER_TINTS.length]
  const field = 'w-full rounded-2xl bg-white/[0.05] px-4 py-3 text-[14px] text-[#F5F5F5] placeholder:text-[#767676] outline-none transition-colors focus:bg-white/[0.08]'

  return (
    <div className="mx-auto w-full max-w-[1120px] rounded-[28px] bg-[#141414] shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between px-8 pt-6">
        <p className="text-[12px] font-medium text-[#8A8A8A]">{initial ? 'Editar documento' : 'Nuevo documento'}</p>
        <button type="button" onClick={onCancel} aria-label="Cerrar" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-[#B5B5B5] hover:bg-white/[0.12]">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
        </button>
      </div>

      <div className="flex flex-col gap-7 px-8 pb-8 pt-4">
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sin título"
          className="w-full bg-transparent text-[34px] leading-tight tracking-[-0.01em] text-[#F5F5F5] placeholder:text-[#4A4A4A] outline-none"
          style={{ fontFamily: "ui-serif, 'New York', Georgia, serif" }}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div className="flex min-w-0 flex-col gap-7">
        <div className="flex items-center gap-1 self-start rounded-full bg-white/[0.05] p-1">
          {[['archivo', 'Archivo o enlace'], ['escribir', 'Escribir']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => switchMode(id)} className="rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors duration-150" style={{ background: mode === id ? 'rgba(255,255,255,0.12)' : 'transparent', color: mode === id ? '#F5F5F5' : '#888888' }}>
              {label}
            </button>
          ))}
        </div>

        {mode === 'archivo' ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-white/[0.035] px-6 py-9 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.07] text-[#E4E4E4]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M12 17v-6m0 0-2.5 2.5M12 11l2.5 2.5" /></svg>
              </span>
              <div>
                <p className="text-[15px] font-medium text-[#F5F5F5]">Añade archivos desde Google Drive</p>
                <p className="mt-1 text-[12.5px] text-[#8A8A8A]">PDF, documentos, hojas o presentaciones. Si el archivo es nuevo, lo subes desde ahí mismo.</p>
              </div>
              <button type="button" onClick={pickFromDrive} disabled={drive.busy} className="ador-btn-primary mt-1 rounded-full px-6 py-2.5 text-[13px] font-medium disabled:opacity-50">
                {drive.busy ? 'Abriendo Drive…' : 'Elegir de Drive'}
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.05] py-1.5 pl-4 pr-1.5 focus-within:bg-white/[0.08]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                placeholder="O pega un enlace de Google Drive"
                className="min-w-0 flex-1 bg-transparent py-2 text-[14px] text-[#F5F5F5] placeholder:text-[#767676] outline-none"
              />
              <button type="button" onClick={addLink} disabled={!linkUrl.trim()} className="rounded-xl bg-white/[0.1] px-4 py-2 text-[13px] text-[#F5F5F5] transition-opacity disabled:opacity-30">Añadir</button>
            </div>

            {files.length > 0 && (
              <ul className="flex flex-col gap-2">
                {files.map((f, i) => (
                  <li key={`${f.url}-${i}`} className="flex items-center gap-3.5 rounded-2xl bg-white/[0.05] p-3">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[10.5px] font-semibold uppercase tracking-wide text-[#0B0B0B]" style={{ background: tint }}>{f.kind.slice(0, 4)}</span>
                    <span className="min-w-0 flex-1">
                      <input value={f.name} onChange={(e) => setFiles((cur) => cur.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="w-full bg-transparent text-[14px] font-medium text-[#F5F5F5] outline-none" />
                      <span className="block text-[11.5px] text-[#8A8A8A]">{f.kind}</span>
                    </span>
                    <button type="button" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} className="rounded-full px-3 py-1 text-[12px] text-[#8A8A8A] hover:bg-white/[0.06] hover:text-[#EF5350]">Quitar</button>
                  </li>
                ))}
              </ul>
            )}

          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full bg-white/[0.05] p-1">
                {['editar', 'vista previa'].map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className="rounded-full px-3 py-1 text-[11.5px] font-medium capitalize transition-colors" style={{ background: tab === t ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab === t ? '#F5F5F5' : '#777777' }}>{t}</button>
                ))}
              </div>
              <button type="button" onClick={attachFromDrive} disabled={drive.busy} className="ml-auto rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12px] text-[#C9C9C9] hover:bg-white/[0.1] disabled:opacity-50">
                {drive.busy ? 'Abriendo Drive…' : 'Adjuntar de Drive'}
              </button>
            </div>
            {tab === 'editar' ? (
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={'# Título\n\nEscribe en Markdown — **negrita**, *cursiva*, listas con "- ", [links](url)...'} rows={14} className={`${field} resize-y font-mono text-[13px] leading-relaxed`} />
            ) : (
              <div className="min-h-[280px] rounded-2xl bg-white/[0.035] px-5 py-4">
                {content.trim() ? renderMarkdown(content) : <p className="text-[13px] text-[#8A8A8A]">Nada que previsualizar todavía.</p>}
              </div>
            )}
          </div>
        )}
          </div>
          <div className="flex flex-col gap-7 lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Guardar en</p>
          <div className="flex flex-wrap gap-2">
            {tree.map((cat, i) => {
              const on = activeCategoryId === cat.id
              return (
                <button key={cat.id} type="button" onClick={() => setSubcategory(cat.subcategories[0].id)} className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors" style={{ background: on ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.045)', color: on ? '#F5F5F5' : '#9A9A9A' }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: FOLDER_TINTS[i % FOLDER_TINTS.length], opacity: on ? 1 : 0.6 }} />
                  {cat.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1.5 pl-1">
            {tree.find((c) => c.id === activeCategoryId)?.subcategories.map((sub) => (
              <button key={sub.id} type="button" onClick={() => setSubcategory(sub.id)} className="rounded-full px-3 py-1 text-[12px] transition-colors" style={{ background: subcategory === sub.id ? tint : 'transparent', color: subcategory === sub.id ? '#0B0B0B' : '#8A8A8A', fontWeight: subcategory === sub.id ? 600 : 400 }}>
                {sub.label}
              </button>
            ))}
          </div>
        </div>

            {mode === 'archivo' && (
              <div className="flex flex-col gap-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Descripción</p>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="De qué trata, cuándo usarlo… (opcional)" rows={6} className={`${field} resize-none leading-relaxed`} />
              </div>
            )}
          </div>
        </div>
        {drive.prompt}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-8 py-4">
        <button type="button" onClick={onCancel} className="rounded-full px-5 py-2.5 text-[13px] text-[#9A9A9A] hover:text-[#F5F5F5]">Cancelar</button>
        <button type="button" disabled={!canSave} onClick={() => onSave({ title: title.trim(), subcategory, content: finalContent })} className="ador-btn-primary rounded-full px-6 py-2.5 text-[13px] font-medium disabled:opacity-40">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
