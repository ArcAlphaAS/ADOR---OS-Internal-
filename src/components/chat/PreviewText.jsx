// Vista previa de un mensaje en listas (chat, bandeja, campana): los emojis de
// color del sistema (🎤 📷 📎 🖼️) se cambian por iconos de línea, para que
// "Mensaje de voz (0:07)" se vea como el resto de la app y no como un emoji suelto.
const ICON = {
  // Onda de audio (como las notas de voz de Apple), no un micrófono.
  '🎤': <path d="M4.5 10v4M8.25 7v10M12 4v16M15.75 8v8M19.5 10.5v3" />,
  '📷': <><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" /><circle cx="12" cy="13" r="3.2" /></>,
  '📎': <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7L9.5 17" />,
  '🖼️': <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m5 17 5-4 3 2.5 3-3 3 3" /></>,
}

export default function PreviewText({ text }) {
  const t = String(text ?? '')
  // El icono puede ir después de un prefijo ("Tú: 🎤 Mensaje de voz").
  let at = -1
  let key = null
  for (const k of Object.keys(ICON)) {
    const i = t.indexOf(k)
    if (i >= 0 && (at < 0 || i < at)) {
      at = i
      key = k
    }
  }
  if (!key) return t
  return (
    <>
      {t.slice(0, at)}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block -translate-y-px" aria-hidden="true">{ICON[key]}</svg>
      {t.slice(at + key.length).trim()}
    </>
  )
}
