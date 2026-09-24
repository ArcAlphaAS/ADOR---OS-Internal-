import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './hooks/useToast.jsx'
import { registerServiceWorker } from './lib/push'
import { installKeyboardHandling } from './lib/keyboard'

registerServiceWorker()
installKeyboardHandling()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
