import CardSkeleton from '../common/CardSkeleton'
import { useGrowFrom } from '../../hooks/useGrowFrom'
import { useState, useEffect, useMemo, useRef } from 'react'
import ContextMenu from '../common/ContextMenu'
import ConfirmDeleteModal from '../common/ConfirmDeleteModal'
import { useContextMenu } from '../../hooks/useContextMenu'
import { motion, AnimatePresence } from 'framer-motion'
import {
  subscribeKnowledgeDocs,
  createKnowledgeDoc,
  updateKnowledgeDoc,
  deleteKnowledgeDoc,
  subscribeKnowledgeSections,
  createKnowledgeSection,
  subscribeKnowledgeDocHistory,
  setKnowledgePinned,
  subscribeUserProfile,
} from '../../lib/firestore'
import { extractHeadings } from '../../lib/knowledge'
import { pushRecentDoc, readRecentDocs } from '../../lib/recentDocs'
import { SERIF } from '../news/NewsLayout'
import { BASE_CATEGORY_TREE, mergeSections, buildKnowledgeIndex, subcategoryMeta, subcategoryLabel, categoryLabelOf, subcategoryCounts, categoryCounts, renderMarkdown } from '../../lib/knowledge'
import { isAdmin } from '../../lib/permissions'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import DocEditor from './DocEditor'
import FolderIllustration from './FolderIllustration'
import PhoneKnowledge from './PhoneKnowledge'
import usePhone from '../../hooks/usePhone'
import Avatar from '../shell/Avatar'
import {
  BookIcon,
  FolderIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  LayersIcon,
  FlagIcon,
  GridIcon,
  NoteIcon,
  TrendUpIcon,
  CheckCircleIcon,
  KanbanIcon,
  FileIcon,
  BriefcaseIcon,
  AlertIcon,
  UsersIcon,
  MoreIcon,
  PinIcon,
} from '../icons'

const SUB_ICONS = {
  layers: LayersIcon,
  search: SearchIcon,
  flag: FlagIcon,
  grid: GridIcon,
  note: NoteIcon,
  trend: TrendUpIcon,
  check: CheckCircleIcon,
  kanban: KanbanIcon,
  file: FileIcon,
  briefcase: BriefcaseIcon,
  alert: AlertIcon,
  users: UsersIcon,
}
function subIcon(sub) {
  return SUB_ICONS[sub.icon] || FileIcon
}

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

function formatDate(ts) {
  if (!ts?.toDate) return null
  return ts.toDate().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(ts) {
  if (!ts?.toDate) return '—'
  const diffMs = Date.now() - ts.toDate().getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours} hora${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Hace ${days} día${days === 1 ? '' : 's'}`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `Hace ${weeks} semana${weeks === 1 ? '' : 's'}`
  return formatDate(ts)
}

function docPreview(doc) {
  return doc.content?.replace(/[#*`>_-]/g, '').trim().slice(0, 90) || ''
}

// Inline "+ Nueva sección" row — a text input that appears in place of the
// button, admin-only. Kept tiny on purpose: a section is just a name, no
// icon/description picker (custom sections get a generic file icon, see
// lib/knowledge.jsx's mergeSections).
function NewSectionRow({ onCreate }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onCreate(name.trim())
      setName('')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className="flex items-center gap-1.5 rounded-lg py-1.5 pl-4 pr-2 text-left text-[11.5px] text-[#8A8A8A] transition-colors duration-150 hover:text-[#888888]"
      >
        <PlusIcon size={10} /> Nueva sección
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 py-1 pl-4 pr-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') setOpen(false)
        }}
        onBlur={() => !name.trim() && setOpen(false)}
        placeholder="Nombre..."
        className="min-w-0 flex-1 rounded-md border border-white/[0.14] bg-[#141414] px-2 py-1 text-[11.5px] text-[#F5F5F5] placeholder:text-[#8A8A8A] outline-none"
      />
    </div>
  )
}

// ---- Left sidebar: nested category → subcategory tree, connector-lined
// per the reference image the user shared. Categories collapse/expand via
// a chevron (separate from the label, which filters); admins can add a
// custom section to any category from "+ Nueva sección". ----
function KnowledgeTree({ tree, search, onSearch, counts, subCounts, filter, onSelectAll, onSelectCategory, onSelectSubcategory, total, isAdminUser, onCreateSection }) {
  // Como Notas o Finder: las carpetas empiezan cerradas y solo se abre la que estás usando.
  const [open, setOpen] = useState(() => new Set())
  useEffect(() => {
    const parent = filter.type === 'category' ? filter.id : filter.type === 'subcategory' ? tree.find((c) => c.subcategories.some((x) => x.id === filter.id))?.id : null
    if (parent) setOpen((prev) => (prev.has(parent) ? prev : new Set(prev).add(parent)))
  }, [filter, tree])
  const toggleCollapsed = (id) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex w-full flex-shrink-0 flex-col gap-4 lg:w-[240px]">
      <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3.5 py-2.5">
        <SearchIcon size={13} className="text-[#8A8A8A]" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#8A8A8A] outline-none"
        />
      </div>

      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onSelectAll}
          className="flex items-center justify-between rounded-[10px] px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors duration-150 hover:bg-white/[0.05]"
          style={{ color: filter.type === 'all' ? '#FFFFFF' : '#D0D0D0', background: filter.type === 'all' ? 'rgba(255,255,255,0.1)' : undefined }}
        >
          <span className="flex items-center gap-2.5">
            <BookIcon size={15} style={{ color: 'var(--mod, #8A8A8A)' }} />
            Todos
          </span>
          {total > 0 && <span className="text-[11.5px] text-[#8A8A8A]">{total}</span>}
        </button>

        <p className="px-2.5 pb-0.5 pt-4 text-[11px] font-medium text-[#8A8A8A]">Carpetas</p>

        {tree.map((cat) => {
          const catActive = filter.type === 'category' && filter.id === cat.id
          const isCollapsed = !open.has(cat.id)
          return (
            <div key={cat.id}>
              <div className="flex items-center rounded-[10px] transition-colors duration-150 hover:bg-white/[0.05]" style={{ color: catActive ? '#FFFFFF' : '#D0D0D0', background: catActive ? 'rgba(255,255,255,0.1)' : undefined }}>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(cat.id)}
                  className="flex h-7 w-6 flex-shrink-0 items-center justify-center text-[#8A8A8A] hover:text-[#F5F5F5]"
                >
                  <ChevronDownIcon size={11} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms ease-out' }} />
                </button>
                <button type="button" onClick={() => onSelectCategory(cat.id)} className="flex flex-1 items-center justify-between gap-2 py-2 pr-2.5 text-left text-[13.5px] font-medium">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <FolderIcon size={15} style={{ color: 'var(--mod, #8A8A8A)' }} />
                    <span className="truncate">{cat.label}</span>
                  </span>
                  {(counts[cat.id] || 0) > 0 && <span className="text-[11.5px] text-[#8A8A8A]">{counts[cat.id]}</span>}
                </button>
              </div>
              <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="overflow-hidden">
                <div className="ml-[19px] flex flex-col pb-1 pl-2.5 pt-0.5">
                  {cat.subcategories.map((sub) => {
                    const Icon = subIcon(sub)
                    const subActive = filter.type === 'subcategory' && filter.id === sub.id
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => onSelectSubcategory(sub.id)}
                        className="relative flex items-center justify-between gap-2 rounded-[9px] py-1.5 pl-2.5 pr-2 text-left text-[12.5px] transition-colors duration-150 hover:bg-white/[0.05]"
                        style={{ color: subActive ? '#FFFFFF' : '#A0A0A5', background: subActive ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Icon size={12} className="flex-shrink-0" />
                          <span className="truncate">{sub.label}</span>
                        </span>
                        {(subCounts[sub.id] || 0) > 0 && <span className="flex-shrink-0 text-[11px] text-[#8A8A8A]">{subCounts[sub.id]}</span>}
                      </button>
                    )
                  })}
                  {isAdminUser && <NewSectionRow onCreate={(name) => onCreateSection(cat.id, name)} />}
                </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Top-level categories only (Estrategia/Marketing/Operaciones/Compañía),
// not all 12 subcategories — direct follow-up feedback that the original
// version was too granular for a quick-access grid. Each card uses the
// bigger, illustrated FolderIllustration (a reference image the user
// shared, redrawn as layered gradient SVG) rather than the flat single-
// color FolderIcon used elsewhere — this grid is the one spot in the
// module meant to read as a set of "shelves," so it earns a richer, more
// illustrative treatment than a UI icon normally would.
// Neutral, corporate tints — muted, never saturated — assigned by position
// so a new category always gets one.
const FOLDER_TINTS = ['#7B8CA8', '#A39382', '#7E9A8D', '#8F8BA3', '#9A8A8A', '#7D95A0']

function TypeCards({ tree, counts, onSelect, docs }) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Tipos de conocimiento</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tree.map((cat, i) => {
          const tint = FOLDER_TINTS[i % FOLDER_TINTS.length]
          const n = counts[cat.id] || 0
          const last = docs.find((d) => cat.subcategories.some((s) => s.id === d.subcategory))
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className="group flex flex-col items-start gap-3 rounded-2xl bg-white/[0.04] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.07]"
            >
              <FolderIllustration id={cat.id} size={56} tint={tint} />
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-[#F5F5F5]">{cat.label}</span>
                <span className="block text-[11.5px] text-[#8A8A8A]">{n === 0 ? 'Vacía' : n === 1 ? '1 documento' : `${n} documentos`}</span>
                {last && <span className="mt-0.5 block truncate text-[11px] text-[#767676]">Última: {last.title}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DocRowMenu({ doc, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#8A8A8A] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
      >
        <MoreIcon size={14} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[998]"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div className="ador-glass ador-grain absolute right-0 top-8 z-[999] w-[140px] overflow-hidden rounded-xl p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onEdit(doc)
              }}
              className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[12px] text-[#F5F5F5] hover:bg-white/[0.06]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onDelete(doc)
              }}
              className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[12px] text-[#EF5350] hover:bg-[#EF5350]/10"
            >
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function DocsTable({ index, title, docs, total, showAll, onShowAll, onOpen, isAdminUser, onEdit, onDelete }) {
  if (docs.length === 0) {
    return (
      <div className="ador-glass ador-grain mt-6 flex flex-col items-center gap-2 rounded-2xl px-6 py-14 text-center">
        <BookIcon size={20} className="text-[#333333]" />
        <p className="text-[14px] font-medium text-[#888888]">Nada por aquí todavía</p>
        <p className="text-[13px] text-[#8A8A8A]">
          {isAdminUser ? 'Usa "+ Nuevo documento" para empezar a construir el conocimiento de ADOR.' : 'Un administrador todavía no ha añadido documentos.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">{title}</p>
      <div className="ador-glass ador-grain overflow-x-auto rounded-2xl">
        <div className="grid min-w-[640px] grid-cols-[1.6fr_1fr_1fr_1fr_32px] gap-3 border-b border-white/[0.06] px-5 py-2.5">
          {['Nombre', 'Categoría', 'Última edición', 'Autor', ''].map((h) => (
            <span key={h} className="font-medium text-[#8A8A8A]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {docs.map((doc) => (
            <div
              key={doc.id}
              data-doc-id={doc.id}
              onClick={() => onOpen(doc)}
              className="grid min-w-[640px] cursor-pointer grid-cols-[1.6fr_1fr_1fr_1fr_32px] items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#F5F5F5]">{doc.title}</p>
                {docPreview(doc) && <p className="truncate text-[11.5px] text-[#8A8A8A]">{docPreview(doc)}</p>}
              </div>
              <span className="truncate text-[12px] text-[#F4EEE2]">
                {categoryLabelOf(index, doc.subcategory)} · {subcategoryLabel(index, doc.subcategory)}
              </span>
              <span className="text-[12px] text-[#888888]">{timeAgo(doc.updatedAt)}</span>
              <span className="flex min-w-0 items-center gap-2">
                <Avatar displayName={doc.updatedBy || doc.createdBy} size={20} />
                <span className="truncate text-[12px] text-[#888888]">{doc.updatedBy || doc.createdBy}</span>
              </span>
              {isAdminUser ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <DocRowMenu doc={doc} onEdit={onEdit} onDelete={onDelete} />
                </div>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </div>
      {!showAll && total > docs.length && (
        <button type="button" onClick={onShowAll} className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[#F4EEE2] hover:text-white">
          Ver todos los documentos →
        </button>
      )}
    </div>
  )
}

function IntroCard() {
  return (
    <div className="ador-grain relative overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(160deg, #14181F 0%, #000000 100%)' }}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Internal intelligence</p>
      <p className="mt-3 text-[19px] font-semibold leading-tight text-[#F5F5F5]">El conocimiento convierte la intención en capacidad.</p>
      <p className="mt-3 text-[12px] text-[#8A8A8A]">Estrategia. Marketing. Operaciones. Compañía.</p>
    </div>
  )
}

function StatsCard({ index, docs }) {
  const authors = new Set(docs.map((d) => d.updatedBy || d.createdBy).filter(Boolean))
  const catCounts = categoryCounts(index, docs)
  const activeCategories = Object.values(catCounts).filter((n) => n > 0).length
  const latest = docs[0]
  return (
    <div className="ador-glass rounded-2xl p-5">
      <p className="mb-1 text-[13px] font-semibold text-[#F5F5F5]">Estadísticas</p>
      {[
        ['Documentos totales', docs.length],
        ['Categorías activas', activeCategories],
        ['Última edición', latest ? timeAgo(latest.updatedAt) : '—'],
        ['Colaboradores', authors.size],
      ].map(([label, value]) => (
        <div key={label} className="flex items-center justify-between border-t border-white/[0.05] py-2.5 first:border-0">
          <span className="text-[12.5px] text-[#888888]">{label}</span>
          <span className="text-[12.5px] font-medium text-[#F5F5F5]">{value}</span>
        </div>
      ))}
    </div>
  )
}

// Read-only, reverse-chronological — same layout convention as Clientes'
// HistorialTab and the Task Detail Panel's Historial section. Every entry
// here is auto-logged by createKnowledgeDoc/updateKnowledgeDoc (see
// lib/firestore.js), never hand-typed — unlike Clientes, there's no
// "registrar interacción" form, since a doc edit already has a clear,
// singular trigger to log from.
function HistorialSection({ docId }) {
  const [events, setEvents] = useState([])
  useEffect(() => subscribeKnowledgeDocHistory(docId, setEvents), [docId])

  return (
    <div>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Historial</p>
      {events.length === 0 ? (
        <p className="text-[12.5px] text-[#8A8A8A]">Sin actividad registrada todavía.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-baseline gap-2.5">
              <span className="h-1 w-1 flex-shrink-0 rounded-full bg-white/[0.2]" />
              <p className="text-[12.5px] text-[#888888]">{ev.description}</p>
              <span className="ml-auto flex-shrink-0 text-[11px] text-[#8A8A8A]">{timeAgo(ev.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DocView({ index, doc, isAdminUser, onBack, onEdit, onDelete, onTogglePin }) {
  const [tocOpen, setTocOpen] = useState(false)
  const headings = extractHeadings(doc.content).filter((h) => h.level <= 2)
  const jump = (id) => {
    setTocOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const editor = doc.updatedBy || doc.createdBy

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_230px]">
      <article className="mx-auto w-full max-w-[760px]">
        <div className="flex items-start justify-between gap-4">
          <button type="button" onClick={onBack} className="mb-5 flex items-center gap-1.5 text-[13px] text-[#8A8A8A] hover:text-[#F5F5F5]">
            <ArrowLeftIcon size={12} /> Volver
          </button>
          {isAdminUser && (
            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => onTogglePin(doc)} className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors duration-150" style={doc.pinned ? { borderColor: 'rgba(244,238,226,0.45)', color: '#F4EEE2' } : { borderColor: 'rgba(255,255,255,0.1)', color: '#888888' }}>
                <PinIcon size={12} /> {doc.pinned ? 'Fijado' : 'Fijar'}
              </button>
              <button type="button" onClick={onEdit} className="flex items-center gap-1.5 rounded-full border border-white/[0.1] px-3.5 py-1.5 text-[12px] text-[#888888] transition-colors duration-150 hover:border-white/[0.2] hover:text-[#F5F5F5]">
                <EditIcon size={12} /> Editar
              </button>
              <button type="button" onClick={() => onDelete(doc)} className="rounded-full px-3.5 py-1.5 text-[12px] text-[#8A8A8A] hover:text-[#EF5350]">Eliminar</button>
            </div>
          )}
        </div>

        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11.5px] font-medium text-[#A8A8A8]">
          {categoryLabelOf(index, doc.subcategory)} · {subcategoryLabel(index, doc.subcategory)}
        </span>
        <h1 className="ador-wrap mt-4 text-[32px] leading-[1.12] tracking-[-0.01em] text-[#F5F5F5] md:text-[42px]" style={SERIF}>{doc.title}</h1>

        <div className="mt-5 flex items-center gap-3 border-y border-white/[0.07] py-3.5">
          <Avatar displayName={editor} size={34} />
          <p className="min-w-0 text-[13.5px] leading-snug text-[#A8A8A8]">
            <span className="font-medium text-[#F5F5F5]">{doc.updatedBy ? 'Editado por' : 'Creado por'} {editor}</span>
            <span className="block text-[12.5px] text-[#8A8A8A]">
              {timeAgo(doc.updatedAt || doc.createdAt)}
              {doc.updatedBy && doc.createdBy && doc.createdBy !== doc.updatedBy ? ` · creado por ${doc.createdBy}` : ''}
            </span>
          </p>
        </div>

        {headings.length > 1 && (
          <div className="mt-5 xl:hidden">
            <button type="button" onClick={() => setTocOpen((v) => !v)} className="flex w-full items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3 text-[14px] font-medium text-[#E4E4E4]">
              En este documento
              <ChevronDownIcon size={14} style={{ transform: tocOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
            </button>
            {tocOpen && (
              <ul className="mt-1 rounded-2xl bg-white/[0.035] px-2 py-2">
                {headings.map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => jump(h.id)} className="w-full rounded-xl px-3 py-2 text-left text-[14px] text-[#C9C9C9] active:bg-white/[0.06]" style={{ paddingLeft: h.level === 2 ? 22 : 12 }}>{h.text}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="ador-wrap mt-7 flex flex-col gap-4 text-[16px] leading-[1.75] md:text-[16.5px]">
          {renderMarkdown(doc.content) || <p className="text-[14px] text-[#8A8A8A]">Este documento no tiene contenido todavía.</p>}
        </div>

        <div className="mt-12 border-t border-white/[0.07] pt-6">
          <HistorialSection docId={doc.id} />
        </div>
      </article>

      {headings.length > 1 && (
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <p className="mb-3 text-[12.5px] font-medium text-[#8A8A8A]">En este documento</p>
            <ul className="flex flex-col border-l border-white/[0.08]">
              {headings.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => jump(h.id)} className="-ml-px block w-full border-l border-transparent py-1.5 text-left text-[13px] text-[#9A9A9A] transition-colors hover:border-[#F4EEE2] hover:text-[#F5F5F5]" style={{ paddingLeft: h.level === 2 ? 26 : 14 }}>
                    {h.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  )
}

// Fijados y vistos recientemente: lo primero que se necesita al abrir Conocimiento.
function PinnedAndRecent({ pinned, recent, index, onOpen }) {
  if (pinned.length === 0 && recent.length === 0) return null
  return (
    <div className="mb-8 flex flex-col gap-6">
      {pinned.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Fijados</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pinned.map((d) => (
              <button key={d.id} type="button" onClick={() => onOpen(d)} className="ador-glass ador-grain ador-card-hover flex flex-col items-start gap-2 rounded-[20px] p-5 text-left">
                <span className="flex items-center gap-1.5 text-[11.5px] text-[#F4EEE2]"><PinIcon size={11} /> {subcategoryLabel(index, d.subcategory)}</span>
                <span className="text-[17px] leading-snug text-[#F5F5F5]" style={SERIF}>{d.title}</span>
                <span className="flex items-center gap-2 text-[12px] text-[#8A8A8A]"><Avatar displayName={d.updatedBy || d.createdBy} size={18} /> {d.updatedBy || d.createdBy} · {timeAgo(d.updatedAt || d.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {recent.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Vistos recientemente</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((d) => (
              <button key={d.id} type="button" onClick={() => onOpen(d)} className="max-w-full truncate rounded-full bg-white/[0.06] px-4 py-2 text-[13px] text-[#D5D5D5] transition-colors hover:bg-white/[0.1]">{d.title}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConocimientoModule({ user, focusDocId, onFocusHandled }) {
  const [docs, setDocs] = useState([])
  const [sections, setSections] = useState([])
  const [profile, setProfile] = useState(null)
  const [filter, setFilter] = useState({ type: 'all' })
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [openDocId, setOpenDocId] = useState(null)
  const [editing, setEditing] = useState(false) // false | true (editing open doc) | 'new'
  const [saving, setSaving] = useState(false)
  const showToast = useToast()
  const phone = usePhone()
  const actorName = actorNameFor(user)
  const isAdminUser = isAdmin(profile)

  const [docsLoaded, setDocsLoaded] = useState(false)
  useEffect(() => subscribeKnowledgeDocs((d) => { setDocs(d); setDocsLoaded(true) }), [])
  useEffect(() => subscribeKnowledgeSections(setSections), [])
  useEffect(() => subscribeUserProfile(user?.uid, setProfile), [user?.uid])

  // Opens straight to a document when arriving from a global-search result
  // (see AppShell.jsx's `focus` state / SearchResults.jsx), same pattern as
  // ClientesModule's focusClientId.
  useEffect(() => {
    if (!focusDocId) return
    setOpenDocId(focusDocId)
    pushRecentDoc(focusDocId)
    setEditing(false)
    onFocusHandled?.()
  }, [focusDocId, onFocusHandled])

  // Merged tree + lookup index, rebuilt only when the live sections list
  // changes — see lib/knowledge.jsx for why this is never module-level
  // static state (it has to reflect admin-added sections in real time).
  const index = useMemo(() => buildKnowledgeIndex(mergeSections(BASE_CATEGORY_TREE, sections)), [sections])

  const [recentIds, setRecentIds] = useState(readRecentDocs)
  const openDoc = docs.find((d) => d.id === openDocId) || null
  const pinnedDocs = docs.filter((d) => d.pinned)
  const recentDocs = recentIds.map((id) => docs.find((d) => d.id === id)).filter(Boolean).filter((d) => !d.pinned).slice(0, 5)
  const togglePin = (d) => withTimeout(setKnowledgePinned(d.id, !d.pinned)).catch((error) => showToast(`No se pudo fijar: ${error.message}`))
  const subCounts = subcategoryCounts(index, docs)
  const catCounts = categoryCounts(index, docs)

  const q = search.trim().toLowerCase()
  let scoped = docs
  if (filter.type === 'category') scoped = scoped.filter((d) => subcategoryMeta(index, d.subcategory)?.categoryId === filter.id)
  if (filter.type === 'subcategory') scoped = scoped.filter((d) => d.subcategory === filter.id)
  if (q) scoped = scoped.filter((d) => `${d.title} ${d.content}`.toLowerCase().includes(q))

  const visibleDocs = showAll || filter.type !== 'all' || q ? scoped : scoped.slice(0, 6)
  const tableTitle =
    filter.type === 'subcategory'
      ? subcategoryMeta(index, filter.id)?.label
      : filter.type === 'category'
        ? index.tree.find((c) => c.id === filter.id)?.label
        : 'Documentos recientes'

  const selectAll = () => {
    setFilter({ type: 'all' })
    setShowAll(false)
  }
  const selectCategory = (id) => {
    setFilter({ type: 'category', id })
    setShowAll(false)
  }
  const selectSubcategory = (id) => {
    setFilter({ type: 'subcategory', id })
    setShowAll(false)
  }

  const [docOrigin, setDocOrigin] = useState(null)
  const growRef = useGrowFrom(docOrigin)
  const handleOpen = (doc, rect) => {
    setDocOrigin(rect || null)
    pushRecentDoc(doc.id)
    setRecentIds(readRecentDocs())
    setOpenDocId(doc.id)
    setEditing(false)
  }
  const handleBack = () => {
    setDocOrigin(null)
    setOpenDocId(null)
    setEditing(false)
  }

  const handleSaveNew = async (data) => {
    setSaving(true)
    try {
      const ref = await withTimeout(createKnowledgeDoc(data, actorName))
      setEditing(false)
      setOpenDocId(ref.id)
    } catch (error) {
      showToast(`No se pudo crear el documento: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async (data) => {
    setSaving(true)
    try {
      await withTimeout(updateKnowledgeDoc(openDoc.id, data, actorName, openDoc))
      setEditing(false)
    } catch (error) {
      showToast(`No se pudo guardar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Eliminar pide escribir el título del documento (ConfirmDeleteModal).
  const [deletingDoc, setDeletingDoc] = useState(null)
  const handleDelete = (doc) => setDeletingDoc(doc)
  const doDelete = async (doc) => {
    await withTimeout(deleteKnowledgeDoc(doc.id))
    setOpenDocId((id) => (id === doc.id ? null : id))
    showToast(`Se eliminó «${doc.title}».`)
  }
  const { menu, bind, close } = useContextMenu()

  const handleCreateSection = (categoryId, name) =>
    withTimeout(createKnowledgeSection({ categoryId, label: name }, actorName)).catch((error) =>
      showToast(`No se pudo crear la sección: ${error.message}`)
    )

  // Un paso hacia atrás, nunca de golpe a la portada: edición → documento → carpeta
  // (subcarpeta → su carpeta → portada). Lo usan la flecha y el gesto desde el borde.
  const goBack = () => {
    if (editing) return setEditing(false)
    if (openDoc) return handleBack()
    if (q) return setSearch('')
    if (filter.type === 'subcategory') {
      const cat = subcategoryMeta(index, filter.id)?.categoryId
      return cat ? selectCategory(cat) : selectAll()
    }
    if (filter.type === 'category') return selectAll()
  }
  const edge = useRef(null)
  const edgeProps = phone
    ? {
        onTouchStart: (e) => { edge.current = e.touches[0].clientX < 28 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null },
        onTouchEnd: (e) => {
          const st = edge.current
          edge.current = null
          if (!st) return
          const t = e.changedTouches[0]
          if (t.clientX - st.x > 80 && Math.abs(t.clientY - st.y) < 60) goBack()
        },
      }
    : {}

  if (phone && !editing && !openDoc) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-4 pb-16 pt-6" {...edgeProps}>
        {!docsLoaded ? <CardSkeleton rows={5} /> : <PhoneKnowledge
          pinned={pinnedDocs}
          recent={recentDocs}
          index={index}
          filter={filter}
          search={search}
          onSearch={setSearch}
          catCounts={catCounts}
          subCounts={subCounts}
          docs={filter.type === 'all' && !q ? scoped.slice(0, 8) : scoped}
          scopedTitle={tableTitle}
          isAdminUser={isAdminUser}
          onBack={goBack}
          onSelectCategory={selectCategory}
          onSelectSubcategory={selectSubcategory}
          onOpen={handleOpen}
          onNew={() => { setOpenDocId(null); setEditing('new') }}
          ago={timeAgo}
        />}
      </div>
    )
  }

  return (
    <motion.div
      initial={false}
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-8 px-4 pb-16 pt-6 md:px-8 lg:flex-row lg:px-12 lg:pt-10"
      {...edgeProps}
      onContextMenu={(e) => {
        const id = e.target.closest?.('[data-doc-id]')?.dataset.docId
        const d = id && docs.find((x) => x.id === id)
        if (d) bind(d).onContextMenu(e)
      }}
    >
      {!phone && <KnowledgeTree
        tree={index.tree}
        search={search}
        onSearch={setSearch}
        counts={catCounts}
        subCounts={subCounts}
        filter={filter}
        onSelectAll={selectAll}
        onSelectCategory={selectCategory}
        onSelectSubcategory={selectSubcategory}
        total={docs.length}
        isAdminUser={isAdminUser}
        onCreateSection={handleCreateSection}
      />}

      <div className="min-w-0 flex-1">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Base de conocimiento</p>
            <h1 className="ador-title mt-1">Conocimiento</h1>
            <p className="mt-1 text-[13px] text-[#888888]">Documentación, marcos, investigación y reglas. Todo en un mismo lugar.</p>
          </div>
          {isAdminUser && !editing && (
            <button
              type="button"
              onClick={() => {
                setOpenDocId(null)
                setEditing('new')
              }}
              className="ador-btn-primary flex flex-shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-medium"
            >
              <PlusIcon size={14} /> Nuevo documento
            </button>
          )}
        </div>

        {editing ? (
          <DocEditor
            tree={index.tree}
            initial={editing === 'new' ? null : openDoc}
            onSave={editing === 'new' ? handleSaveNew : handleSaveEdit}
            onCancel={() => setEditing(false)}
            saving={saving}
          />
        ) : openDoc ? (
          <AnimatePresence mode="wait">
            <motion.div ref={growRef} key={openDoc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <DocView index={index} doc={openDoc} isAdminUser={isAdminUser} onBack={handleBack} onEdit={() => setEditing(true)} onDelete={handleDelete} onTogglePin={togglePin} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              {filter.type === 'all' && !q && <PinnedAndRecent pinned={pinnedDocs} recent={recentDocs} index={index} onOpen={handleOpen} />}
              {filter.type === 'all' && !q && <TypeCards tree={index.tree} counts={catCounts} onSelect={selectCategory} docs={docs} />}
              <DocsTable
                index={index}
                title={tableTitle}
                docs={visibleDocs}
                total={scoped.length}
                showAll={showAll || filter.type !== 'all' || !!q}
                onShowAll={() => setShowAll(true)}
                onOpen={handleOpen}
                isAdminUser={isAdminUser}
                onEdit={(doc) => {
                  setOpenDocId(doc.id)
                  setEditing(true)
                }}
                onDelete={handleDelete}
              />
            </div>
            <div className="flex flex-col gap-4">
              {docs.length === 0 ? <IntroCard /> : <StatsCard index={index} docs={docs} />}
            </div>
          </div>
        )}
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={menu.payload.title}
          subtitle={subcategoryLabel(index, menu.payload.subcategory)}
          onClose={close}
          items={[
            { label: 'Abrir', onClick: () => handleOpen(menu.payload) },
            isAdminUser && { label: menu.payload.pinned ? 'Quitar de fijados' : 'Fijar arriba', onClick: () => togglePin(menu.payload) },
            isAdminUser && { label: 'Editar…', onClick: () => { setOpenDocId(menu.payload.id); setEditing(true) } },
            isAdminUser && { divider: true },
            isAdminUser && { label: 'Eliminar documento…', danger: true, onClick: () => handleDelete(menu.payload) },
          ]}
        />
      )}
      {deletingDoc && (
        <ConfirmDeleteModal
          title={`¿Eliminar «${deletingDoc.title}»?`}
          description="El documento y su historial se borran para todo el equipo. Esta acción no se puede deshacer."
          name={deletingDoc.title}
          onClose={() => setDeletingDoc(null)}
          onConfirm={() => doDelete(deletingDoc)}
        />
      )}
    </motion.div>
  )
}
