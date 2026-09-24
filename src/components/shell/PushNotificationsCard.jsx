import { useEffect, useState } from 'react'
import { pushStatus, enablePush, sendPush, canInstallApp, onInstallAvailability, installApp } from '../../lib/push'

// "Notificaciones en este dispositivo" — turns push on for this phone or
// computer (lib/push.js). Two shapes:
//   variant="settings" — always shown in Configuración, with a test button.
//   variant="prompt"   — the one-time nudge in Comunicación's sidebar;
//                        disappears once on or dismissed.
const DISMISS_KEY = 'ador_push_prompt_dismissed'

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export default function PushNotificationsCard({ user, variant = 'settings' }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [dismissed, setDismissed] = useState(readDismissed)
  const [installable, setInstallable] = useState(canInstallApp)
  useEffect(() => onInstallAvailability(setInstallable), [])

  useEffect(() => {
    let alive = true
    pushStatus().then((s) => alive && setStatus(s)).catch(() => alive && setStatus('unsupported'))
    return () => {
      alive = false
    }
  }, [])

  const turnOn = async () => {
    setBusy(true)
    setMessage('')
    try {
      await enablePush(user.uid)
      setStatus('on')
      setMessage('Listo — te llegarán avisos aunque ADOR OS esté cerrada.')
    } catch (error) {
      setMessage(error.message)
      setStatus(await pushStatus().catch(() => 'off'))
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setBusy(true)
    setMessage('')
    try {
      const r = await sendPush({ kind: 'test' }, { uid: user.uid, name: user.displayName })
      setMessage(r?.sent ? 'Enviada — cierra o minimiza ADOR OS y debería aparecer en unos segundos.' : 'No se encontró este dispositivo. Pulsa "Activar" otra vez.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // private mode — it shows again next time
    }
  }

  if (!status || !user?.uid || user.uid === 'preview') return null

  const copy = {
    on: 'Activadas en este dispositivo. Te avisamos de mensajes directos, menciones, respuestas en tus hilos y llamadas.',
    off: 'Recibe en la barra de notificaciones los mensajes directos, menciones y llamadas, aunque ADOR OS esté cerrada.',
    denied: 'Bloqueadas. En iPhone: Ajustes → Notificaciones → ADOR OS. En computadora: la configuración del sitio en el navegador.',
    install: 'En iPhone/iPad las notificaciones funcionan con ADOR OS en la pantalla de inicio: Safari → Compartir → Añadir a pantalla de inicio, y ábrela desde ese ícono.',
    unsupported: 'Este navegador no admite notificaciones.',
  }[status]

  if (variant === 'prompt') {
    if (dismissed || status === 'on' || status === 'unsupported') return null
    return (
      <div className="rounded-xl border border-dashed border-white/[0.12] px-3 py-2.5">
        <p className="text-[12.5px] leading-relaxed text-[#9A9A9A]">{copy}</p>
        {message && <p className="mt-1.5 text-[12px] leading-relaxed text-[#E8C15A]">{message}</p>}
        <div className="mt-1.5 flex items-center gap-3">
          {status === 'off' && (
            <button type="button" onClick={turnOn} disabled={busy} className="text-[12.5px] font-medium text-[#E8C15A] hover:underline disabled:opacity-60">
              {busy ? 'Activando…' : 'Activar notificaciones'}
            </button>
          )}
          <button type="button" onClick={dismiss} className="text-[12.5px] text-[#8A8A8A] hover:text-[#F5F5F5]">
            {status === 'off' ? 'Ahora no' : 'Ocultar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ador-glass w-full rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-[#F5F5F5]">Notificaciones en este dispositivo</span>
        <span className={`text-[11px] font-medium ${status === 'on' ? 'text-[#4CAF50]' : 'text-[#888888]'}`}>{status === 'on' ? 'Activadas' : status === 'denied' ? 'Bloqueadas' : 'Apagadas'}</span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-[#888888]">{copy}</p>
      {message && <p className="mt-1.5 text-[12px] leading-relaxed text-[#E8C15A]">{message}</p>}
      {(status === 'off' || status === 'on') && (
        <div className="mt-2 flex items-center gap-4">
          {status === 'off' && (
            <button type="button" onClick={turnOn} disabled={busy} className="text-[12.5px] font-medium text-[#E8C15A] hover:underline disabled:opacity-60">
              {busy ? 'Activando…' : 'Activar'}
            </button>
          )}
          {installable && variant === 'settings' && (
            <button type="button" onClick={() => installApp().then((ok) => ok && setMessage('Instalada — ábrela desde el Dock o el menú de apps; te llegarán avisos aunque no tengas el navegador delante.'))} className="text-[12.5px] font-medium text-[#E8C15A] hover:underline">
              Instalar en esta computadora
            </button>
          )}
          {status === 'on' && (
            <button type="button" onClick={test} disabled={busy} className="text-[12.5px] font-medium text-[#E8C15A] hover:underline disabled:opacity-60">
              {busy ? 'Enviando…' : 'Enviar notificación de prueba'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
