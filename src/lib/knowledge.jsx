// Conocimiento vocabulary and a small hand-rolled Markdown renderer. No
// markdown library added — this covers the subset SOPs/reglas/estrategia
// docs actually need (headings, bold/italic, lists, quotes, code, links)
// without pulling in a dependency for one module, consistent with this
// project's "no UI component libraries, hand-build what's simple enough"
// rule (see CLAUDE.md §9 on the hand-drawn Finanzas chart for the same
// reasoning). Deliberately not a block editor — content is a single
// markdown string per document, edited as plain text.

// Two-level taxonomy (category → subcategory/"sección"), per a reference
// image the user shared — a step up from the original flat-per-category
// design (still no true Notion-style infinite page nesting, just one
// grouping level). The 4 top-level categories are fixed (structural, like
// Finanzas' expense categories); their subcategories start from this seed
// list but admins can add more from the sidebar ("+ Nueva sección") —
// those live in the `knowledgeSections` collection and get merged in at
// render time via `mergeSections()`, never mutating this constant. Each
// document stores only its leaf subcategory id; the parent category is
// always derived (`categoryOf()`/`buildKnowledgeIndex()`) rather than also
// stored, so a doc's category/subcategory pair can never drift out of sync.
export const BASE_CATEGORY_TREE = [
  {
    id: 'estrategia',
    label: 'Estrategia',
    subcategories: [
      { id: 'frameworks', label: 'Frameworks', icon: 'layers' },
      { id: 'research', label: 'Research', icon: 'search' },
      { id: 'decisions', label: 'Decisions', icon: 'flag' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    subcategories: [
      { id: 'brand', label: 'Brand', icon: 'grid' },
      { id: 'content', label: 'Content', icon: 'note' },
      { id: 'campaigns', label: 'Campaigns', icon: 'trend' },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    subcategories: [
      { id: 'sops', label: 'SOPs', icon: 'check' },
      { id: 'processes', label: 'Processes', icon: 'kanban' },
      { id: 'templates', label: 'Templates', icon: 'file' },
    ],
  },
  {
    id: 'compania',
    label: 'Compañía',
    subcategories: [
      { id: 'principles', label: 'Principles', icon: 'briefcase' },
      { id: 'rules', label: 'Rules', icon: 'alert' },
      { id: 'culture', label: 'Culture', icon: 'users' },
    ],
  },
]

// Merges admin-created `knowledgeSections` docs into the seed tree, one
// custom subcategory per Firestore doc (grouped by its `categoryId`,
// ignored if that category id no longer exists). Custom sections use a
// generic "file" icon — only the 12 seed subcategories get a curated one.
export function mergeSections(baseTree, customSections) {
  return baseTree.map((cat) => ({
    ...cat,
    subcategories: [
      ...cat.subcategories,
      ...customSections
        .filter((s) => s.categoryId === cat.id)
        .map((s) => ({ id: s.id, label: s.label, icon: 'file', custom: true })),
    ],
  }))
}

// Builds the id → {label, categoryId, categoryLabel} lookup for a
// (possibly custom-sections-merged) tree — call once per render via
// useMemo and pass the result down, rather than relying on module-level
// state, so it always reflects the live `knowledgeSections` subscription.
export function buildKnowledgeIndex(tree) {
  const bySubId = new Map()
  for (const cat of tree) {
    for (const sub of cat.subcategories) {
      bySubId.set(sub.id, { ...sub, categoryId: cat.id, categoryLabel: cat.label })
    }
  }
  return { tree, bySubId }
}

export function subcategoryMeta(index, id) {
  return index.bySubId.get(id) || null
}
export function subcategoryLabel(index, id) {
  return subcategoryMeta(index, id)?.label || 'General'
}
// The parent category id for a document's leaf subcategory — always
// derived, never stored, so it can't disagree with the real tree.
export function categoryOf(index, subcategoryId) {
  return subcategoryMeta(index, subcategoryId)?.categoryId || null
}
export function categoryLabelOf(index, subcategoryId) {
  return subcategoryMeta(index, subcategoryId)?.categoryLabel || 'General'
}

// A readable summary of what changed on a doc edit, for the auto-logged
// Historial — same idea as lib/workspace.js's describeTaskChange, but
// DocEditor always saves title/subcategory/content together (there's no
// per-field inline editing here like Lista's cells), so this diffs against
// the previous doc rather than just checking which keys are in the patch.
export function describeKnowledgeChange(previous, data) {
  const changed = []
  if (!previous || previous.title !== data.title) changed.push('título')
  if (!previous || previous.subcategory !== data.subcategory) changed.push('sección')
  if (!previous || previous.content !== data.content) changed.push('contenido')
  if (changed.length === 0) return 'Documento actualizado'
  return `Editado: ${changed.join(', ')}`
}

// Live counts for the sidebar tree and the "Tipos de Conocimiento" cards —
// never stored, same rule as every other cross-module number in this app.
export function subcategoryCounts(index, docs) {
  const counts = {}
  for (const cat of index.tree) for (const sub of cat.subcategories) counts[sub.id] = 0
  for (const d of docs) {
    if (counts[d.subcategory] !== undefined) counts[d.subcategory] += 1
  }
  return counts
}
export function categoryCounts(index, docs) {
  const subCounts = subcategoryCounts(index, docs)
  return Object.fromEntries(index.tree.map((cat) => [cat.id, cat.subcategories.reduce((sum, s) => sum + subCounts[s.id], 0)]))
}

// ---- Inline markdown: **bold**, *italic*, `code`, [text](url) ----
const INLINE_RE = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g

function renderInline(text, keyPrefix) {
  const nodes = []
  let lastIndex = 0
  let match
  let i = 0
  INLINE_RE.lastIndex = 0
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    const key = `${keyPrefix}-${i++}`
    if (match[1] !== undefined) nodes.push(<strong key={key}>{match[1]}</strong>)
    else if (match[2] !== undefined) nodes.push(<em key={key}>{match[2]}</em>)
    else if (match[3] !== undefined)
      nodes.push(
        <code key={key} className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[0.9em]">
          {match[3]}
        </code>
      )
    else if (match[4] !== undefined)
      nodes.push(
        <a key={key} href={match[5]} target="_blank" rel="noreferrer" className="text-[#5B9BD9] underline underline-offset-2 hover:text-[#7BAEE0]">
          {match[4]}
        </a>
      )
    lastIndex = INLINE_RE.lastIndex
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

// ---- Block markdown: headings, lists, quotes, code fences, paragraphs ----
export function renderMarkdown(source) {
  if (!source?.trim()) return null
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    // Code fence
    if (line.trim().startsWith('```')) {
      const code = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++ // skip closing fence
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-xl bg-[#141414] px-4 py-3 text-[12.5px] leading-relaxed text-[#B8C4D0]">
          <code>{code.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Heading
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const sizes = { 1: 'text-[22px] mt-2', 2: 'text-[18px] mt-1', 3: 'text-[15px]' }
      const Tag = `h${level}`
      blocks.push(
        <Tag key={key++} className={`font-semibold text-[#F5F5F5] ${sizes[level]}`}>
          {renderInline(heading[2], `h${key}`)}
        </Tag>
      )
      i++
      continue
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const quote = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-white/[0.16] pl-4 text-[13.5px] italic text-[#888888]">
          {renderInline(quote.join(' '), `q${key}`)}
        </blockquote>
      )
      continue
    }

    // Bullet or numbered list
    const isBullet = /^\s*[-*]\s+/.test(line)
    const isNumbered = /^\s*\d+\.\s+/.test(line)
    if (isBullet || isNumbered) {
      const items = []
      while (i < lines.length && (isBullet ? /^\s*[-*]\s+/.test(lines[i]) : /^\s*\d+\.\s+/.test(lines[i]))) {
        const text = lines[i].replace(isBullet ? /^\s*[-*]\s+/ : /^\s*\d+\.\s+/, '')
        items.push(text)
        i++
      }
      const ListTag = isBullet ? 'ul' : 'ol'
      blocks.push(
        <ListTag key={key++} className={`${isBullet ? 'list-disc' : 'list-decimal'} flex flex-col gap-1 pl-5 text-[13.5px] leading-relaxed text-[#CCCCCC]`}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li${key}-${idx}`)}</li>
          ))}
        </ListTag>
      )
      continue
    }

    // Paragraph: consecutive non-blank, non-block lines
    const para = []
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,3}\s|>|```|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} className="text-[13.5px] leading-relaxed text-[#CCCCCC]">
        {renderInline(para.join(' '), `p${key}`)}
      </p>
    )
  }

  return <div className="flex flex-col gap-3">{blocks}</div>
}
