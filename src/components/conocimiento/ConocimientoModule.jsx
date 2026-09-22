import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  subscribeKnowledgeDocs,
  createKnowledgeDoc,
  updateKnowledgeDoc,
  deleteKnowledgeDoc,
  subscribeKnowledgeSections,
  createKnowledgeSection,
  subscribeUserProfile,
} from '../../lib/firestore'
import { BASE_CATEGORY_TREE, mergeSections, buildKnowledgeIndex, subcategoryMeta, subcategoryLabel, categoryLabelOf, subcategoryCounts, categoryCounts, renderMarkdown } from '../../lib/knowledge'
import { isAdmin } from '../../lib/permissions'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import DocEditor from './DocEditor'
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
        className="flex items-center gap-1.5 rounded-lg py-1.5 pl-4 pr-2 text-left text-[11.5px] text-[#555555] transition-colors duration-150 hover:text-[#888888]"
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
        className="min-w-0 flex-1 rounded-md border border-white/[0.14] bg-[#141414] px-2 py-1 text-[11.5px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
      />
    </div>
  )
}

// ---- Left sidebar: nested category → subcategory tree, connector-lined
// per the reference image the user shared. Categories collapse/expand via
// a chevron (separate from the label, which filters); admins can add a
// custom section to any category from "+ Nueva sección". ----
function KnowledgeTree({ tree, search, onSearch, counts, subCounts, filter, onSelectAll, onSelectCategory, onSelectSubcategory, total, isAdminUser, onCreateSection }) {
  const [collapsed, setCollapsed] = useState(() => new Set())
  const toggleCollapsed = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex w-[240px] flex-shrink-0 flex-col gap-4">
      <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3.5 py-2">
        <SearchIcon size={13} className="text-[#666666]" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
        />
      </div>

      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onSelectAll}
          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors duration-150"
          style={{ color: filter.type === 'all' ? '#5B9BD9' : '#CCCCCC' }}
        >
          <span className="flex items-center gap-2">
            <BookIcon size={14} />
            Todos
          </span>
          <span className="text-[11px] text-[#555555]">{total}</span>
        </button>

        {tree.map((cat) => {
          const catActive = filter.type === 'category' && filter.id === cat.id
          const isCollapsed = collapsed.has(cat.id)
          return (
            <div key={cat.id}>
              <div className="flex items-center rounded-lg transition-colors duration-150" style={{ color: catActive ? '#5B9BD9' : '#CCCCCC' }}>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(cat.id)}
                  className="flex h-7 w-6 flex-shrink-0 items-center justify-center text-[#666666] hover:text-[#F5F5F5]"
                >
                  <ChevronDownIcon size={11} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms ease-out' }} />
                </button>
                <button type="button" onClick={() => onSelectCategory(cat.id)} className="flex flex-1 items-center justify-between py-2 pr-2.5 text-left text-[13px] font-medium">
                  <span className="truncate">{cat.label}</span>
                  <span className="text-[11px] text-[#555555]">{counts[cat.id] || 0}</span>
                </button>
              </div>
              {!isCollapsed && (
                <div className="ml-[13px] flex flex-col border-l border-white/[0.1] pb-0.5 pl-3">
                  {cat.subcategories.map((sub) => {
                    const Icon = subIcon(sub)
                    const subActive = filter.type === 'subcategory' && filter.id === sub.id
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => onSelectSubcategory(sub.id)}
                        className="relative flex items-center justify-between gap-2 rounded-lg py-1.5 pl-4 pr-2 text-left text-[12px] transition-colors duration-150"
                        style={{ color: subActive ? '#5B9BD9' : '#888888', background: subActive ? 'rgba(30,95,173,0.1)' : 'transparent' }}
                      >
                        <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-white/[0.12]" />
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Icon size={12} className="flex-shrink-0" />
                          <span className="truncate">{sub.label}</span>
                        </span>
                        <span className="flex-shrink-0 text-[10.5px] text-[#555555]">{subCounts[sub.id] || 0}</span>
                      </button>
                    )
                  })}
                  {isAdminUser && <NewSectionRow onCreate={(name) => onCreateSection(cat.id, name)} />}
                </div>
              )}
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
// flat, line-style FolderIcon (see icons.jsx) adapted from a reference
// image the user shared, rather than every subcategory's own curated icon.
function TypeCards({ tree, counts, onSelect }) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">Tipos de conocimiento</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tree.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className="ador-glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors duration-150 hover:bg-white/[0.05]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#888888]">
                <FolderIcon size={16} />
              </span>
              <span>
                <span className="block text-[13px] font-medium text-[#F5F5F5]">{cat.label}</span>
                <span className="block text-[11px] text-[#666666]">{counts[cat.id] || 0} documentos</span>
              </span>
            </span>
          </button>
        ))}
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
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#666666] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
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
        <p className="text-[13px] text-[#444444]">
          {isAdminUser ? 'Usa "+ Nuevo documento" para empezar a construir el conocimiento de ADOR.' : 'Un administrador todavía no ha añadido documentos.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">{title}</p>
      <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_32px] gap-3 border-b border-white/[0.06] px-5 py-2.5">
          {['Nombre', 'Categoría', 'Última edición', 'Autor', ''].map((h) => (
            <span key={h} className="font-medium text-[#444444]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {docs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onOpen(doc)}
              className="grid cursor-pointer grid-cols-[1.6fr_1fr_1fr_1fr_32px] items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#F5F5F5]">{doc.title}</p>
                {docPreview(doc) && <p className="truncate text-[11.5px] text-[#666666]">{docPreview(doc)}</p>}
              </div>
              <span className="truncate text-[12px] text-[#5B9BD9]">
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
        <button type="button" onClick={onShowAll} className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[#5B9BD9] hover:text-[#7BAEE0]">
          Ver todos los documentos →
        </button>
      )}
    </div>
  )
}

function IntroCard() {
  return (
    <div className="ador-grain relative overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(160deg, #14181F 0%, #0A0A0A 100%)' }}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">Internal intelligence</p>
      <p className="mt-3 text-[19px] font-semibold leading-tight text-[#F5F5F5]">El conocimiento convierte la intención en capacidad.</p>
      <p className="mt-3 text-[12px] text-[#666666]">Estrategia. Marketing. Operaciones. Compañía.</p>
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

function DocView({ index, doc, isAdminUser, onBack, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="ador-glass ador-grain flex flex-col gap-5 rounded-2xl p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-[12px] text-[#666666] hover:text-[#F5F5F5]">
            <ArrowLeftIcon size={12} /> Volver
          </button>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.04em] text-[#888888]">
            {categoryLabelOf(index, doc.subcategory)} · {subcategoryLabel(index, doc.subcategory)}
          </span>
          <h1 className="mt-2 text-[24px] font-semibold text-[#F5F5F5]">{doc.title}</h1>
          <p className="mt-1 text-[12px] text-[#555555]">
            {doc.updatedBy ? `Editado por ${doc.updatedBy}` : `Creado por ${doc.createdBy}`}
            {formatDate(doc.updatedAt || doc.createdAt) ? ` · ${formatDate(doc.updatedAt || doc.createdAt)}` : ''}
          </p>
        </div>
        {isAdminUser && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.1] px-3.5 py-1.5 text-[12px] text-[#888888] transition-colors duration-150 hover:border-white/[0.2] hover:text-[#F5F5F5]"
            >
              <EditIcon size={12} /> Editar
            </button>
            {confirmDelete ? (
              <button type="button" onClick={() => onDelete(doc)} className="rounded-full bg-[#EF5350]/15 px-3.5 py-1.5 text-[12px] font-medium text-[#EF5350]">
                ¿Confirmar borrado?
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full px-3.5 py-1.5 text-[12px] text-[#666666] hover:text-[#EF5350]">
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-white/[0.06]" />

      {renderMarkdown(doc.content) || <p className="text-[13px] text-[#444444]">Este documento no tiene contenido todavía.</p>}
    </div>
  )
}

export default function ConocimientoModule({ user }) {
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
  const actorName = actorNameFor(user)
  const isAdminUser = isAdmin(profile)

  useEffect(() => subscribeKnowledgeDocs(setDocs), [])
  useEffect(() => subscribeKnowledgeSections(setSections), [])
  useEffect(() => subscribeUserProfile(user?.uid, setProfile), [user?.uid])

  // Merged tree + lookup index, rebuilt only when the live sections list
  // changes — see lib/knowledge.jsx for why this is never module-level
  // static state (it has to reflect admin-added sections in real time).
  const index = useMemo(() => buildKnowledgeIndex(mergeSections(BASE_CATEGORY_TREE, sections)), [sections])

  const openDoc = docs.find((d) => d.id === openDocId) || null
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

  const handleOpen = (doc) => {
    setOpenDocId(doc.id)
    setEditing(false)
  }
  const handleBack = () => {
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
      await withTimeout(updateKnowledgeDoc(openDoc.id, data, actorName))
      setEditing(false)
    } catch (error) {
      showToast(`No se pudo guardar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (doc) => {
    withTimeout(deleteKnowledgeDoc(doc.id))
      .then(() => setOpenDocId((id) => (id === doc.id ? null : id)))
      .catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
  }

  const handleCreateSection = (categoryId, name) =>
    withTimeout(createKnowledgeSection({ categoryId, label: name }, actorName)).catch((error) =>
      showToast(`No se pudo crear la sección: ${error.message}`)
    )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[1680px] gap-8 px-12 pb-16 pt-10"
    >
      <KnowledgeTree
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
      />

      <div className="min-w-0 flex-1">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">Base de conocimiento</p>
            <h1 className="mt-1 text-[28px] font-semibold text-[#F5F5F5]">Conocimiento</h1>
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
            <motion.div key={openDoc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <DocView index={index} doc={openDoc} isAdminUser={isAdminUser} onBack={handleBack} onEdit={() => setEditing(true)} onDelete={handleDelete} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="grid grid-cols-[1fr_300px] items-start gap-8">
            <div className="min-w-0">
              {filter.type === 'all' && !q && <TypeCards tree={index.tree} counts={catCounts} onSelect={selectCategory} />}
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
              <IntroCard />
              <StatsCard index={index} docs={docs} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
