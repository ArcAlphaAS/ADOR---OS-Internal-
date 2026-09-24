// "Registro de errores" — so a failure on a partner's computer doesn't go
// unnoticed. Free and in-house (no Sentry account): unexpected errors are
// written to the `errorLogs` collection and listed in Administración →
// Errores; the daily cleanup deletes them after 30 days.
//
// Kept small on purpose, so it can never eat the free quota or leak data:
//   - at most MAX_PER_SESSION reports per open tab, identical ones once;
//   - message + a trimmed stack + which screen, never form contents or tokens;
//   - known noise is ignored (browser extensions, ResizeObserver warnings,
//     network blips, the dev-only preview user).
import { writeErrorLog } from './firestore'

const MAX_PER_SESSION = 15
const IGNORE = [/ResizeObserver loop/i, /chrome-extension:\/\//i, /moz-extension:\/\//i, /Failed to fetch/i, /NetworkError/i, /Load failed/i, /network-request-failed/i, /unavailable/i, /Script error\.?$/i]

let context = { uid: null, name: null, module: null }
let sent = 0
const seen = new Set()

export function setErrorContext(patch) {
  context = { ...context, ...patch }
}

export function reportError(error, extra = {}) {
  try {
    if (!context.uid || context.uid === 'preview' || sent >= MAX_PER_SESSION) return
    const message = String(error?.message || error || 'Error desconocido').slice(0, 500)
    const stack = String(error?.stack || '').slice(0, 1500)
    if (IGNORE.some((re) => re.test(message) || re.test(stack))) return
    const fingerprint = `${message}|${stack.split('\n')[1] || ''}`
    if (seen.has(fingerprint)) return
    seen.add(fingerprint)
    sent += 1
    writeErrorLog({
      message,
      stack,
      source: extra.source || 'window',
      module: context.module || null,
      path: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 200),
      uid: context.uid,
      userName: context.name || null,
    }).catch(() => {})
  } catch {
    // reporting must never throw
  }
}

let installed = false
export function installErrorLogging() {
  if (installed) return
  installed = true
  window.addEventListener('error', (e) => reportError(e.error || e.message, { source: 'window' }))
  window.addEventListener('unhandledrejection', (e) => {
    // Firestore permission errors are expected for the dev preview user
    // and surface as toasts elsewhere; everything else is worth knowing.
    reportError(e.reason, { source: 'promise' })
  })
}
