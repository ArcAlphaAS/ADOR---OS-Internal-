import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircleIcon, CloseIcon } from '../components/icons'
import { runUndo } from '../lib/undo'

const ToastContext = createContext(null)

function ToastStack({ toasts, onDismiss }) {
  return createPortal(
    <div className="pointer-events-none fixed right-6 top-6 z-[100] flex flex-col items-end gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto"
          >
            <div className="ador-modal-surface ador-grain flex items-center gap-3 rounded-2xl py-3 pl-4 pr-3" role={toast.tone === 'error' ? 'alert' : 'status'}>
              {toast.tone === 'error' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF8A88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5M12 16h.01" />
                </svg>
              ) : (
                <CheckCircleIcon size={18} style={{ color: '#F4EEE2', flexShrink: 0 }} />
              )}
              <span className="text-[13px] text-[#F5F5F5]">{toast.message}</span>
              {toast.action && (
                <button type="button" onClick={() => { toast.action.onClick(); onDismiss(toast.id) }} className="flex-shrink-0 rounded-full bg-white/[0.1] px-3 py-1 text-[12.5px] font-semibold text-[#F4EEE2] hover:bg-white/[0.16]">
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={() => onDismiss(toast.id)}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
              >
                <CloseIcon size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message, opts) => {
      const id = ++idRef.current
      const tone = opts?.tone || (/^(No se pudo|No tienes permiso|Error|Falló|Tardó)/i.test(String(message)) ? 'error' : 'ok')
      setToasts((prev) => [...prev, { id, message, tone, action: opts?.action || null }])
      setTimeout(() => dismiss(id), tone === 'error' ? 5000 : opts?.action ? 7000 : 3000)
    },
    [dismiss]
  )

  // Fallos de acciones que antes eran silenciosas (lib/notifyFail.js).
  useEffect(() => {
    const onFail = (e) => showToast(e.detail?.message || 'No se pudo completar.', { tone: 'error' })
    window.addEventListener('ador:fail', onFail)
    return () => window.removeEventListener('ador:fail', onFail)
  }, [showToast])

  // Acciones que se pueden deshacer (lib/undo.js): aviso con botón "Deshacer".
  useEffect(() => {
    const onUndoToast = (e) => showToast(e.detail.message, { action: { label: 'Deshacer', onClick: () => runUndo(e.detail.id) } })
    const onUndone = (e) => showToast(`Deshecho: ${e.detail.message}`)
    window.addEventListener('ador:undo-toast', onUndoToast)
    window.addEventListener('ador:undone', onUndone)
    return () => {
      window.removeEventListener('ador:undo-toast', onUndoToast)
      window.removeEventListener('ador:undone', onUndone)
    }
  }, [showToast])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within ToastProvider')
  return showToast
}
