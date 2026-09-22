import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { subscribeKnowledgeDocs, createKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc, subscribeUserProfile } from '../../lib/firestore'
import { CATEGORIES, categoryLabel, categoryCounts, renderMarkdown } from '../../lib/knowledge'
import { isAdmin } from '../../lib/permissions'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import DocEditor from './DocEditor'
import { BookIcon, SearchIcon, PlusIcon, EditIcon, ArrowLeftIcon } from '../icons'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

function formatDate(ts) {
  if (!ts?.toDate) return null
  return ts.toDate().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CategorySidebar({ counts, selected, onSelect, total }) {
  return (
    <div className="flex w-[220px] flex-shrink-0 flex-col gap-1">
      <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#444444]">Categorías</p>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors duration-150"
        style={{ background: selected === null ? 'rgba(30,95,173,0.14)' : 'transparent', color: selected === null ? '#5B9BD9' : '#888888' }}
      >
        Todos
        <span className="text-[11px] text-[#555555]">{total}</span>
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors duration-150"
          style={{ background: selected === c.id ? 'rgba(30,95,173,0.14)' : 'transparent', color: selected === c.id ? '#5B9BD9' : '#888888' }}
        >
          {c.label}
          <span className="text-[11px] text-[#555555]">{counts[c.id] || 0}</span>
        </button>
      ))}
    </div>
  )
}

function DocCard({ doc, onOpen }) {
  const preview = doc.content?.replace(/[#*`>_-]/g, '').trim().slice(0, 120)
  return (
    <button
      type="button"
      onClick={() => onOpen(doc)}
      className="ador-glass flex w-full flex-col gap-1.5 rounded-2xl px-5 py-4 text-left transition-colors duration-150 hover:bg-white/[0.05]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[14px] font-semibold text-[#F5F5F5]">{doc.title}</p>
        <span className="flex-shrink-0 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.04em] text-[#888888]">
          {categoryLabel(doc.category)}
        </span>
      </div>
      {preview && <p className="line-clamp-2 text-[12.5px] text-[#666666]">{preview}</p>}
      <p className="mt-1 text-[11px] text-[#444444]">
        {doc.updatedBy ? `Editado por ${doc.updatedBy}` : ''}
        {formatDate(doc.updatedAt) ? ` · ${formatDate(doc.updatedAt)}` : ''}
      </p>
    </button>
  )
}

function DocList({ docs, search, onOpen, isAdminUser }) {
  const q = search.trim().toLowerCase()
  const filtered = q ? docs.filter((d) => `${d.title} ${d.content}`.toLowerCase().includes(q)) : docs

  if (docs.length === 0) {
    return (
      <div className="ador-glass ador-grain flex flex-col items-center gap-2 rounded-2xl px-6 py-16 text-center">
        <BookIcon size={20} className="text-[#333333]" />
        <p className="text-[14px] font-medium text-[#888888]">Todavía no hay documentos aquí</p>
        <p className="text-[13px] text-[#444444]">
          {isAdminUser ? 'Usa "+ Nuevo documento" para empezar a construir el conocimiento de ADOR.' : 'Un administrador todavía no ha añadido documentos.'}
        </p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return <p className="px-2 py-16 text-center text-[13px] text-[#444444]">Sin resultados para "{search}".</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((d) => (
        <DocCard key={d.id} doc={d} onOpen={onOpen} />
      ))}
    </div>
  )
}

function DocView({ doc, isAdminUser, onBack, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="ador-glass ador-grain flex flex-col gap-5 rounded-2xl p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-[12px] text-[#666666] hover:text-[#F5F5F5]">
            <ArrowLeftIcon size={12} /> Volver
          </button>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.04em] text-[#888888]">
            {categoryLabel(doc.category)}
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
              <button
                type="button"
                onClick={() => onDelete(doc)}
                className="rounded-full bg-[#EF5350]/15 px-3.5 py-1.5 text-[12px] font-medium text-[#EF5350]"
              >
                ¿Confirmar borrado?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-full px-3.5 py-1.5 text-[12px] text-[#666666] hover:text-[#EF5350]"
              >
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
  const [profile, setProfile] = useState(null)
  const [category, setCategory] = useState(null)
  const [search, setSearch] = useState('')
  const [openDocId, setOpenDocId] = useState(null)
  const [editing, setEditing] = useState(false) // false | true (editing open doc) | 'new'
  const [saving, setSaving] = useState(false)
  const showToast = useToast()
  const actorName = actorNameFor(user)
  const isAdminUser = isAdmin(profile)

  useEffect(() => subscribeKnowledgeDocs(setDocs), [])
  useEffect(() => subscribeUserProfile(user?.uid, setProfile), [user?.uid])

  const openDoc = docs.find((d) => d.id === openDocId) || null
  const scoped = category ? docs.filter((d) => d.category === category) : docs
  const counts = categoryCounts(docs)

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
      .then(() => setOpenDocId(null))
      .catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-12 pb-16 pt-10"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">Base de conocimiento</p>
          <h1 className="mt-1 text-[28px] font-semibold text-[#F5F5F5]">Conocimiento</h1>
          <p className="mt-1 text-[13px] text-[#888888]">Estrategia, marketing, SOPs y reglas de ADOR — todo en un mismo lugar.</p>
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
          initial={editing === 'new' ? null : openDoc}
          onSave={editing === 'new' ? handleSaveNew : handleSaveEdit}
          onCancel={() => setEditing(false)}
          saving={saving}
        />
      ) : openDoc ? (
        <AnimatePresence mode="wait">
          <motion.div key={openDoc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
            <DocView doc={openDoc} isAdminUser={isAdminUser} onBack={handleBack} onEdit={() => setEditing(true)} onDelete={handleDelete} />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="flex gap-8">
          <CategorySidebar counts={counts} selected={category} onSelect={setCategory} total={docs.length} />
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3.5 py-2">
              <SearchIcon size={14} className="text-[#666666]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en Conocimiento..."
                className="w-full bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
              />
            </div>
            <DocList docs={scoped} search={search} onOpen={handleOpen} isAdminUser={isAdminUser} />
          </div>
        </div>
      )}
    </motion.div>
  )
}
