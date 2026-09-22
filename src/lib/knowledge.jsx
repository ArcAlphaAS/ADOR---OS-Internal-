// Conocimiento vocabulary and a small hand-rolled Markdown renderer. No
// markdown library added — this covers the subset SOPs/reglas/estrategia
// docs actually need (headings, bold/italic, lists, quotes, code, links)
// without pulling in a dependency for one module, consistent with this
// project's "no UI component libraries, hand-build what's simple enough"
// rule (see CLAUDE.md §9 on the hand-drawn Finanzas chart for the same
// reasoning). Deliberately not a block editor — content is a single
// markdown string per document, edited as plain text.

export const CATEGORIES = [
  { id: 'estrategia', label: 'Estrategia' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'general', label: 'Información General' },
  { id: 'sops', label: 'SOPs' },
  { id: 'reglas', label: 'Reglas' },
]
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))
export function categoryLabel(id) {
  return CATEGORY_BY_ID[id]?.label || 'Información General'
}

// Live count per category for the sidebar — same "never a stored count,
// always derived from the real list" rule as every other cross-module
// number in this app.
export function categoryCounts(docs) {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]))
  for (const d of docs) {
    if (counts[d.category] !== undefined) counts[d.category] += 1
  }
  return counts
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
