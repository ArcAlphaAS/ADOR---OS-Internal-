import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircleIcon, CloseIcon } from '../components/icons'

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
            className="ador-modal-surface ador-grain pointer-events-auto flex items-center gap-3 rounded-2xl py-3 pl-4 pr-3"
          >
            <CheckCircleIcon size={18} style={{ color: '#1E5FAD', flexShrink: 0 }} />
            <span className="text-[13px] text-[#F5F5F5]">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
            >
              <CloseIcon size={12} />
            </button>
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
    (message) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message }])
      setTimeout(() => dismiss(id), 3000)
    },
    [dismiss]
  )

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
