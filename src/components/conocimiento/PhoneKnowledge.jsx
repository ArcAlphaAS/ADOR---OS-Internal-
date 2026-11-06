import { useState } from 'react'
import { SearchIcon, PlusIcon, ArrowLeftIcon, FileIcon } from '../icons'
import { subcategoryLabel, categoryLabelOf } from '../../lib/knowledge'

// Conocimiento en el teléfono (de una referencia): título grande con dos
// botones redondos, carpetas en cuadrícula de dos columnas, y los documentos
// como tarjetas redondeadas en vez de una tabla. Planas, en grises de modo
// oscuro, sin brillos.
const noun = (n) => (n === 1 ? '1 documento' : `${n} documentos`)

function Folder({ label, count, onClick }) {
  return (
    <button type="button" onClick={onClick} className="relative block w-full text-left" style={{ aspectRatio: '1 / 0.94' }}>
      <svg viewBox="0 0 160 150" className="absolute inset-0 h-full w-full overflow-visible" fill="none" aria-hidden>
        <path d="M0 22a18 18 0 0 1 18-18h40c8 0 12 3 16 9l7 9h61a18 18 0 0 1 18 18v90a18 18 0 0 1-18 18H18A18 18 0 0 1 0 128Z" fill="#161618" />
        <path d="M0 40a18 18 0 0 1 18-18h58c6 0 9 2 13 7l5 6h50a18 18 0 0 1 18 18v75a18 18 0 0 1-18 18H18A18 18 0 0 1 0 128Z" fill="#232325" stroke="rgba(255,255,255,0.05)" />
      </svg>
      <span className="absolute left-4 top-[34%] text-[#4A4A4E]"><FileIcon size={18} /></span>
      <span className="absolute inset-x-4 bottom-4">
        <span className="block truncate text-[17px] font-medium text-[#F5F5F5]">{label}</span>
        <span className="mt-0.5 block text-[13px] text-[#8E8E93]">{count ? noun(count) : 'Sin documentos'}</span>
      </span>
    </button>
  )
}

function DocCard({ index, doc, ago, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(doc)} className="flex w-full items-center gap-3 rounded-[22px] bg-[#1C1C1E] px-5 py-4 text-left">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium text-[#F5F5F5]">{doc.title}</span>
        <span className="mt-0.5 block truncate text-[13px] text-[#8E8E93]">
          {categoryLabelOf(index, doc.subcategory)} · {subcategoryLabel(index, doc.subcategory)} · {ago(doc.updatedAt)}
        </span>
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
    </button>
  )
}

export default function PhoneKnowledge({ pinned = [], recent = [], index, filter, search, onSearch, catCounts, subCounts, docs, scopedTitle, isAdminUser, onBack, onSelectCategory, onSelectSubcategory, onOpen, onNew, ago }) {
  const [searching, setSearching] = useState(false)
  const q = search.trim()
  const cat = filter.type === 'category' ? index.tree.find((c) => c.id === filter.id) : null
  const inFolder = filter.type !== 'all'

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center gap-3">
        {inFolder && (
          <button type="button" onClick={onBack} aria-label="Volver" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-[#F5F5F5]">
            <ArrowLeftIcon size={18} />
          </button>
        )}
        <h1 className="ador-title min-w-0 flex-1 truncate">{inFolder ? scopedTitle : 'Conocimiento'}</h1>
        <button type="button" onClick={() => setSearching((v) => !v)} aria-label="Buscar" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-[#F5F5F5]">
          <SearchIcon size={17} />
        </button>
        {isAdminUser && (
          <button type="button" onClick={onNew} aria-label="Nuevo documento" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-[#F5F5F5]">
            <PlusIcon size={18} />
          </button>
        )}
      </div>

      {(searching || q) && (
        <input
          autoFocus
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar en el conocimiento"
          className="w-full rounded-full bg-[#1C1C1E] px-5 py-3 text-[16px] text-[#F5F5F5] placeholder:text-[#8E8E93] outline-none"
        />
      )}

      {!q && filter.type === 'all' && (
        <div className="grid grid-cols-2 gap-3">
          {index.tree.map((c) => (
            <Folder key={c.id} label={c.label} count={catCounts[c.id] || 0} onClick={() => onSelectCategory(c.id)} />
          ))}
        </div>
      )}

      {!q && cat && (
        <div className="grid grid-cols-2 gap-3">
          {cat.subcategories.map((s) => (
            <Folder key={s.id} label={s.label} count={subCounts[s.id] || 0} onClick={() => onSelectSubcategory(s.id)} />
          ))}
        </div>
      )}

      {!q && filter.type === 'all' && pinned.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className="px-1 text-[13px] font-medium text-[#8E8E93]">📌 Fijados</p>
          {pinned.map((d) => <DocCard key={d.id} index={index} doc={d} ago={ago} onOpen={onOpen} />)}
        </div>
      )}

      {!q && filter.type === 'all' && recent.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
          <p className="mb-2 px-1 text-[13px] font-medium text-[#8E8E93]">Vistos recientemente</p>
          <div className="flex gap-2">
            {recent.map((d) => <button key={d.id} type="button" onClick={() => onOpen(d)} className="max-w-[220px] flex-shrink-0 truncate rounded-full bg-[#1C1C1E] px-4 py-2 text-[13.5px] text-[#D5D5D5]">{d.title}</button>)}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {!q && filter.type === 'all' && <p className="px-1 text-[13px] font-medium text-[#8E8E93]">Recientes</p>}
        {docs.length === 0 ? (
          <p className="rounded-[22px] bg-[#1C1C1E] px-5 py-6 text-center text-[14px] text-[#8E8E93]">
            {q ? 'Nada coincide con tu búsqueda.' : 'Aún no hay documentos aquí.'}
          </p>
        ) : (
          docs.map((d) => <DocCard key={d.id} index={index} doc={d} ago={ago} onOpen={onOpen} />)
        )}
      </div>
    </div>
  )
}
