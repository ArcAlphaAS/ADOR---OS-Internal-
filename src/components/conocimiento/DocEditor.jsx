import { useState } from 'react'
import { CATEGORY_TREE, categoryOf, renderMarkdown } from '../../lib/knowledge'

// Plain-textarea markdown editor with an Editar/Vista previa toggle — no
// block editor, no rich-text toolbar. Shared between "+ Nuevo documento"
// and editing an existing one; the parent decides create vs. update.
export default function DocEditor({ initial, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [subcategory, setSubcategory] = useState(initial?.subcategory || CATEGORY_TREE[0].subcategories[0].id)
  const [content, setContent] = useState(initial?.content || '')
  const [tab, setTab] = useState('editar')

  const activeCategoryId = categoryOf(subcategory) || CATEGORY_TREE[0].id
  const canSave = title.trim() && content.trim() && !saving

  return (
    <div className="ador-glass ador-grain flex flex-col gap-4 rounded-2xl p-6">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del documento"
        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-[15px] font-medium text-[#F5F5F5] placeholder:text-[#444444] outline-none"
      />

      {/* Two-level picker: pick the top category, then one of its
          subcategories — a document always lives at the leaf level (see
          lib/knowledge.jsx, CATEGORY_TREE). */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {CATEGORY_TREE.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSubcategory(cat.subcategories[0].id)}
              className="flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-150"
              style={{
                background: activeCategoryId === cat.id ? '#1E5FAD' : 'rgba(255,255,255,0.04)',
                color: activeCategoryId === cat.id ? '#F5F5F5' : '#888888',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pl-1">
          {CATEGORY_TREE.find((c) => c.id === activeCategoryId)?.subcategories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSubcategory(sub.id)}
              className="flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors duration-150"
              style={{
                borderColor: subcategory === sub.id ? '#5B9BD9' : 'rgba(255,255,255,0.1)',
                color: subcategory === sub.id ? '#5B9BD9' : '#888888',
              }}
            >
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 self-start rounded-full bg-white/[0.04] p-1">
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

      {tab === 'editar' ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={'# Título\n\nEscribe en Markdown — **negrita**, *cursiva*, listas con "- ", `código`, [links](url)...'}
          rows={16}
          className="w-full resize-y rounded-xl border border-white/[0.1] bg-[#0E0E0E] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#F5F5F5] placeholder:text-[#444444] outline-none"
        />
      ) : (
        <div className="min-h-[300px] rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
          {content.trim() ? renderMarkdown(content) : <p className="text-[13px] text-[#444444]">Nada que previsualizar todavía.</p>}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-[13px] text-[#888888] hover:text-[#F5F5F5]">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave({ title: title.trim(), subcategory, content })}
          className="ador-btn-primary rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
