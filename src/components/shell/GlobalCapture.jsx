import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, CloseIcon } from '../icons'
import { CATEGORIES, suggestCategory } from '../../lib/notes'
import { createNote } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'

// The "always have your notebook open" capture point — a floating button
// present across the whole shell (mounted once in AppShell, not per-module)
// so jotting something down never requires first navigating to Conocimiento.
// Saves immediately on submit with a locally-guessed category attached;
// never blocks on categorization being right — that's reviewed/corrected
// later in Conocimiento. See lib/notes.js for why this is keyword rules,
// not an LLM call.
export default function GlobalCapture({ user, actorName }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const category = suggestCategory(trimmed)
      await createNote({ text: trimmed, category, authorId: user?.uid || null }, actorName)
      setText('')
      setOpen(false)
      const meta = CATEGORIES[category]
      showToast(category === 'nota' ? 'Nota guardada en Conocimiento' : `Guardado en Conocimiento — sugerencia: ${meta.label}`)
    } catch (error) {
      showToast(`No se pudo guardar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="ador-btn-primary fixed bottom-24 right-7 z-40 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ boxShadow: '0 12px 32px -8px rgba(30,95,173,0.5)' }}
        title="Anotar algo rápido"
      >
        <PlusIcon size={24} />
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[10px]"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:inset-0 sm:items-center sm:pb-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="ador-modal-surface ador-grain w-full max-w-[520px] rounded-[28px] p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#F5F5F5]">Anota algo rápido</span>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>
                  <textarea
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
                    }}
                    placeholder="Tengo que… / Ordenar… / Llamar a… — como en tu cuaderno."
                    rows={3}
                    className="mt-4 w-full resize-none rounded-2xl border border-white/[0.08] bg-[#1A1A1A] px-4 py-3 text-[14px] text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-white/[0.2]"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-[#444444]">⌘/Ctrl + Enter para guardar</span>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={!text.trim() || saving}
                      className="ador-btn-primary rounded-full px-5 py-2 text-[13px] font-medium disabled:opacity-40"
                    >
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
