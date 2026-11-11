import { soundsOn, setSoundsOn } from '../../lib/sounds'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'
import { MODULE_LABELS, moduleColor } from '../../lib/moduleColors'
import { SearchIcon } from '../icons'
import { SPRING } from '../../lib/motion'

// Paleta de comandos (⌘K / Ctrl+K), como Spotlight: escribes y encuentra a la vez pantallas,
// acciones y cualquier cosa de ADOR OS (clientes, tareas, mensajes, personas, documentos…).
// ↑ ↓ para moverte, Enter para ejecutar, Esc para cerrar.
const MODULE_ORDER = ['inicio', 'workspace', 'objetivos', 'clientes', 'finanzas', 'chat', 'calendario', 'conocimiento', 'news', 'directorio', 'ador-ia', 'admin']
const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function CommandPalette({ open, onClose, uid, access, onNavigate, onToggleTheme, onShowShortcuts, onReload }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const raw = useGlobalSearch(open ? query : '', uid)

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const commands = useMemo(() => {
    const nav = MODULE_ORDER.filter((id) => access.canSee(id) && (id !== 'admin' || access.isAdmin)).map((id, i) => ({
      key: `go-${id}`, group: 'Ir a', label: MODULE_LABELS[id], hint: i < 9 ? `⌥${i + 1}` : '', color: moduleColor(id), run: () => onNavigate(id),
    }))
    const actions = [
      { key: 'theme', group: 'Acciones', label: 'Cambiar entre tema claro y oscuro', run: onToggleTheme },
      { key: 'sounds', group: 'Acciones', label: soundsOn() ? 'Apagar sonidos' : 'Activar sonidos', run: () => setSoundsOn(!soundsOn()) },
      { key: 'shortcuts', group: 'Acciones', label: 'Ver atajos de teclado', hint: '⌘/', run: onShowShortcuts },
      { key: 'reload', group: 'Acciones', label: 'Actualizar ADOR OS', run: onReload },
    ]
    return [...nav, ...actions]
  }, [access, onNavigate, onToggleTheme, onShowShortcuts, onReload])

  const q = fold(query).trim()
  const matches = q ? commands.filter((c) => fold(c.label).includes(q)) : commands
  const results = q.length >= 2 ? raw.groups.map((g) => ({ ...g, items: g.items.filter((i) => access.canSee(i.target[0])) })).filter((g) => g.items.length) : []
  const flat = [
    ...matches.map((c) => ({ kind: 'cmd', ...c })),
    ...results.flatMap((g) => g.items.map((it) => ({ kind: 'res', key: `r-${it.id}`, group: g.label, label: it.title, hint: it.meta, run: () => onNavigate(it.target[0], it.target[1]) }))),
  ]
  useEffect(() => setIndex(0), [query])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const exec = (item) => {
    if (!item) return
    onClose()
    setTimeout(() => item.run(), 40)
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(flat.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); exec(flat[index]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  let lastGroup = null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="palette" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="fixed inset-0 z-[130] flex items-start justify-center bg-black/55 px-4 pt-[14vh] backdrop-blur-[6px]" onMouseDown={onClose}>
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.985 }} transition={SPRING} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-[640px]" role="dialog" aria-label="Paleta de comandos">
            <div className="ador-modal-surface overflow-hidden rounded-[22px]">
              <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
                <SearchIcon size={18} className="text-[#8E8E93]" />
                <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} placeholder="Busca o escribe un comando…" className="min-w-0 flex-1 bg-transparent text-[17px] text-[#F5F5F5] outline-none placeholder:text-[#767676]" />
                <kbd className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[11px] text-[#9A9A9A]">esc</kbd>
              </div>
              <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2" data-keep-scroll>
                {flat.length === 0 ? (
                  <p className="px-5 py-10 text-center text-[14px] text-[#8E8E93]">{raw.loadingMessages ? 'Buscando…' : `Sin resultados para “${query.trim()}”`}</p>
                ) : (
                  flat.map((it, i) => {
                    const header = it.group !== lastGroup
                    lastGroup = it.group
                    return (
                      <div key={it.key}>
                        {header && <p className="px-5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[#8A8A8A]">{it.group}</p>}
                        <button type="button" data-active={i === index} onMouseMove={() => setIndex(i)} onClick={() => exec(it)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left" style={{ background: i === index ? 'rgba(255,255,255,0.07)' : 'transparent' }}>
                          {it.color && <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: it.color }} />}
                          <span className="min-w-0 flex-1 truncate text-[14.5px] text-[#F5F5F5]">{it.label}</span>
                          {it.hint && <span className="max-w-[40%] flex-shrink-0 truncate text-[12px] text-[#8A8A8A]">{it.hint}</span>}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="flex items-center gap-4 border-t border-white/[0.07] px-5 py-2.5 text-[11.5px] text-[#8A8A8A]">
                <span>↑ ↓ moverte</span>
                <span>↵ abrir</span>
                <span className="ml-auto">⌘K para abrir en cualquier momento</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
