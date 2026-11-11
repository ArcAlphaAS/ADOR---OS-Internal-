import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { SearchIcon } from '../icons'
import { haptic } from '../../lib/haptics'

// Buscar en todo ADOR OS en el teléfono: una pantalla completa como la búsqueda de
// iOS, no el cuadrito de escritorio. Campo grande arriba (16 px, sin zoom de iOS)
// con "Cancelar", y debajo los resultados agrupados en filas de 52 px fáciles de
// tocar. Se cierra con Cancelar, con el gesto de deslizar hacia abajo desde arriba
// o al elegir un resultado.
const HINTS = ['Clientes', 'Tareas', 'Mensajes', 'Personas', 'Documentos', 'Objetivos']

export default function PhoneSearch({ query, setQuery, results, onSelect, onClose }) {
  const inputRef = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120)
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const has = query.trim().length > 0
  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="fixed inset-0 z-[120] flex flex-col bg-black"
      role="dialog"
      aria-label="Buscar en ADOR OS"
    >
      <div className="flex items-center gap-2 px-4 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#1C1C1E] px-4" style={{ height: 44 }}>
          <SearchIcon size={16} className="flex-shrink-0 text-[#8E8E93]" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en ADOR OS"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-[#F5F5F5] outline-none placeholder:text-[#8E8E93] [&::-webkit-search-cancel-button]:hidden"
          />
          {has && (
            <button type="button" aria-label="Borrar" onClick={() => { setQuery(''); inputRef.current?.focus() }} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.16] text-[11px] text-[#0A0A0A]">✕</button>
          )}
        </label>
        <button type="button" onClick={onClose} className="flex-shrink-0 px-1 text-[16px] text-[#F4EEE2]" style={{ minHeight: 44 }}>Cancelar</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }} data-keep-scroll>
        {!has ? (
          <div className="pt-6">
            <p className="text-[13px] text-[#8E8E93]">Busca en todo ADOR OS</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[#CFCFCF]">{HINTS.join(' · ')}</p>
          </div>
        ) : !results.hasResults ? (
          <p className="pt-10 text-center text-[15px] text-[#8E8E93]">{results.loadingMessages ? 'Buscando también en los mensajes…' : `Sin resultados para “${query.trim()}”`}</p>
        ) : (
          <>
            {results.groups.map((group) => (
              <section key={group.key} className="pb-3">
                <h2 className="px-1 pb-1.5 pt-4 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">{group.label}</h2>
                <div className="overflow-hidden rounded-[20px] bg-[#1C1C1E]">
                  {group.items.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { haptic(); onSelect(item) }}
                      className="flex w-full items-center gap-3 px-4 text-left active:bg-white/[0.06]"
                      style={{ minHeight: 52, borderTop: i ? '0.5px solid rgba(255,255,255,0.08)' : 'none' }}
                    >
                      <span className="min-w-0 flex-1 py-2">
                        <span className="block truncate text-[16px] text-[#F5F5F5]">{item.title}</span>
                        {item.meta && <span className="block truncate text-[13px] text-[#8E8E93]">{item.meta}</span>}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5F5F63" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {results.loadingMessages && <p className="pb-2 pt-1 text-center text-[13px] text-[#8E8E93]">Buscando también en los mensajes…</p>}
          </>
        )}
      </div>
    </motion.div>,
    document.body
  )
}
