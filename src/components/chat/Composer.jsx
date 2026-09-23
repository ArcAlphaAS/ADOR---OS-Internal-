import { useEffect, useRef, useState } from 'react'
import { findDriveLink, mentionQueryAt, EMOJIS, FORMATS } from '../../lib/chat'
import { resizeImageToDataUrl } from '../../lib/image'
import Avatar from '../shell/Avatar'
import { ArrowRightIcon, CloseIcon, PaperclipIcon, ImageIcon, FileIcon, SmileIcon, MicIcon } from '../icons'
import { formatDuration } from './MessageBubble'

// Firestore caps a document at 1MB; full-size images and voice notes live
// in their own chatBlobs doc, so each can use most of that on its own.
const MAX_BLOB_CHARS = 900_000
const MAX_VOICE_SECONDS = 60

function ToolButton({ title, onClick, active, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-35"
      style={active ? { background: 'rgba(255,255,255,0.08)', color: '#F5F5F5' } : undefined}
    >
      {children}
    </button>
  )
}

function useVoiceRecorder({ onDone, onError }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recRef = useRef(null)
  const cancelRef = useRef(false)

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return onError('Este navegador no permite grabar audio.')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return onError('Necesitamos permiso para usar el micrófono.')
    }
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t))
    const rec = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 })
    const chunks = []
    const startedAt = Date.now()
    cancelRef.current = false
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      setRecording(false)
      if (cancelRef.current) return
      const duration = (Date.now() - startedAt) / 1000
      if (duration < 1) return
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result.length > MAX_BLOB_CHARS) return onError('La nota de voz es demasiado larga.')
        onDone({ dataUrl: reader.result, duration })
      }
      reader.readAsDataURL(new Blob(chunks, { type: rec.mimeType }))
    }
    rec.start()
    recRef.current = rec
    setSeconds(0)
    setRecording(true)
  }

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_VOICE_SECONDS) recRef.current?.stop()
        return s + 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [recording])

  useEffect(
    () => () => {
      if (recRef.current?.state === 'recording') {
        cancelRef.current = true
        recRef.current.stop()
      }
    },
    []
  )

  return {
    recording,
    seconds,
    start,
    stop: () => recRef.current?.stop(),
    cancel: () => {
      cancelRef.current = true
      recRef.current?.stop()
    },
  }
}

// The composer, following the reference layout: text in the middle, tools
// on the right (Aa formato · emoji · adjuntar · imagen · voz) and send.
// Every panel it opens (format bar, emoji grid, attach options, @-mention
// suggestions) sits in normal flow directly above the input — nothing
// floats, so nothing needs a portal. The reference's separate "+" was left
// out: it duplicated the paperclip.
export default function Composer({ onSend, onError, onTyping, mentionCandidates = [], placeholder, compact }) {
  const [text, setText] = useState('')
  const [panel, setPanel] = useState(null) // 'format' | 'emoji' | 'attach' | null
  const [driveMode, setDriveMode] = useState(false)
  const [pendingImage, setPendingImage] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [mentions, setMentions] = useState([])
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)
  const inputRef = useRef(null)
  const lastTypingRef = useRef(0)

  // "Escribiendo…" signal, throttled to one write every 3s while typing.
  const signalTyping = (value) => {
    if (!onTyping) return
    const now = Date.now()
    if (value.trim() && now - lastTypingRef.current > 3000) {
      lastTypingRef.current = now
      onTyping(true)
    }
  }
  const voice = useVoiceRecorder({ onDone: (v) => onSend({ voice: v }), onError })

  const suggestions = mentionQuery
    ? mentionCandidates.filter((c) => c.name.toLowerCase().includes(mentionQuery.query.toLowerCase())).slice(0, 5)
    : []

  // Auto-grow up to ~6 lines, then scroll inside.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [text])

  const reset = () => {
    if (lastTypingRef.current) {
      lastTypingRef.current = 0
      onTyping?.(false)
    }
    setText('')
    setPendingImage(null)
    setDriveMode(false)
    setPanel(null)
    setMentions([])
    setMentionQuery(null)
  }

  const submit = () => {
    if (driveMode && !findDriveLink(text)) return onError('Pega un enlace de Google Drive, Docs, Sheets o Slides.')
    if (!text.trim() && !pendingImage) return
    const finalMentions = mentions.filter((m) => text.includes(`@${m.name}`))
    onSend({ text: text.trim(), image: pendingImage || undefined, mentions: finalMentions })
    reset()
  }

  const updateText = (value, cursor) => {
    setText(value)
    signalTyping(value)
    setMentionQuery(mentionCandidates.length ? mentionQueryAt(value, cursor) : null)
    setMentionIndex(0)
  }

  const insertMention = (candidate) => {
    const el = inputRef.current
    const cursor = el.selectionStart
    const before = text.slice(0, mentionQuery.start)
    const after = text.slice(cursor)
    const token = `@${candidate.name} `
    setText(before + token + after)
    setMentions((m) => (m.some((x) => x.uid === candidate.uid) ? m : [...m, { uid: candidate.uid, name: candidate.name }]))
    setMentionQuery(null)
    requestAnimationFrame(() => {
      el.focus()
      const pos = before.length + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const insertAtCursor = (str) => {
    const el = inputRef.current
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    setText(text.slice(0, start) + str + text.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + str.length, start + str.length)
    })
  }

  const applyFormat = (wrap) => {
    const el = inputRef.current
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = text.slice(start, end) || 'texto'
    setText(text.slice(0, start) + wrap + selected + wrap + text.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + wrap.length, start + wrap.length + selected.length)
    })
  }

  const pickImage = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) attachImage(file)
  }

  // Ctrl+V / ⌘V of a screenshot or copied image, and drag-and-drop, both
  // land here — same compression path as the image button.
  const onPaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === 'file' && i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    const file = item.getAsFile()
    attachImage(new File([file], file.name && file.name !== 'image.png' ? file.name : `Captura ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}.png`, { type: file.type }))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'))
    if (file) attachImage(file)
    else if (e.dataTransfer?.files?.length) onError('Solo imágenes por ahora — los documentos oficiales se comparten desde Google Drive.')
  }

  const attachImage = async (file) => {
    if (!file.type.startsWith('image/')) return onError('Solo imágenes aquí — los documentos oficiales se comparten desde Google Drive.')
    setProcessing(true)
    try {
      const [thumbUrl, fullDataUrl] = await Promise.all([resizeImageToDataUrl(file, 480, 0.72), resizeImageToDataUrl(file, 1600, 0.82)])
      if (fullDataUrl.length > MAX_BLOB_CHARS) return onError('La imagen es demasiado pesada incluso comprimida. Prueba con una más pequeña.')
      setPendingImage({ thumbUrl, fullDataUrl, name: file.name })
      setPanel(null)
      inputRef.current?.focus()
    } catch (err) {
      onError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const togglePanel = (id) => setPanel((p) => (p === id ? null : id))

  if (voice.recording) {
    return (
      <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
        <div className="flex flex-1 items-center gap-3 rounded-full border border-[#EF5350]/40 bg-[#EF5350]/[0.06] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EF5350]" style={{ animation: 'ador-pulse 1.2s ease-in-out infinite' }} />
          <span className="text-[13px] text-[#F5F5F5]">Grabando nota de voz</span>
          <span className="ml-auto font-mono text-[12.5px] text-[#AAAAAA]">
            {formatDuration(voice.seconds)} / {formatDuration(MAX_VOICE_SECONDS)}
          </span>
        </div>
        <button type="button" onClick={voice.cancel} className="text-[12.5px] text-[#888888] hover:text-[#F5F5F5]">
          Cancelar
        </button>
        <button type="button" onClick={voice.stop} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: '#B8860B' }} title="Enviar nota de voz">
          <ArrowRightIcon size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`relative flex flex-col gap-2 ${compact ? '' : 'border-t border-white/[0.06]'} pt-3`}
      onDragOver={(e) => {
        if ([...(e.dataTransfer?.items || [])].some((i) => i.kind === 'file')) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false)}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#B8860B]/60 bg-[#0A0A0A]/80 text-[13px] text-[#E8C15A]">
          Suelta la imagen para adjuntarla
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-xl border border-white/[0.1] bg-[#141414] p-1.5">
          <p className="px-2 pb-1 text-[10.5px] uppercase tracking-[0.08em] text-[#555555]">Mencionar</p>
          {suggestions.map((c, i) => (
            <button
              key={c.uid}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(c)
              }}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#DDDDDD]"
              style={i === mentionIndex ? { background: 'rgba(255,255,255,0.06)' } : undefined}
            >
              <Avatar displayName={c.name} photoURL={c.photo} size={20} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      {panel === 'format' && (
        <div className="flex items-center gap-1">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              title={f.title}
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat(f.wrap)
              }}
              className="flex h-7 min-w-7 items-center justify-center rounded-md border border-white/[0.08] px-2 text-[12px] text-[#CCCCCC] hover:border-white/[0.2] hover:text-[#F5F5F5]"
              style={{ fontWeight: f.id === 'bold' ? 700 : 400, fontStyle: f.id === 'italic' ? 'italic' : 'normal', textDecoration: f.id === 'strike' ? 'line-through' : 'none', fontFamily: f.id === 'code' ? 'monospace' : undefined }}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-2 text-[11px] text-[#555555]">Selecciona texto y aplica · Shift+Enter para nueva línea</span>
        </div>
      )}

      {panel === 'emoji' && (
        <div className="grid grid-cols-12 gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onMouseDown={(ev) => {
                ev.preventDefault()
                insertAtCursor(e)
              }}
              className="flex h-8 items-center justify-center rounded-md text-[17px] hover:bg-white/[0.08]"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {panel === 'attach' && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title="El documento oficial vive en Google Drive — compártelo como enlace"
            onClick={() => {
              setDriveMode(true)
              setPanel(null)
              inputRef.current?.focus()
            }}
            className="flex items-center gap-2 rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] text-[#CCCCCC] hover:border-white/[0.2] hover:text-[#F5F5F5]"
          >
            <FileIcon size={13} /> Documento de Drive
          </button>
          <button type="button" disabled title="Requiere activar Firebase Storage — todavía no está habilitado" className="flex cursor-not-allowed items-center gap-2 rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] text-[#CCCCCC] opacity-40">
            <PaperclipIcon size={13} /> Otro archivo (PDF, Excel…)
          </button>
        </div>
      )}

      {pendingImage && (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 pr-3">
          <img src={pendingImage.thumbUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] text-[#DDDDDD]">{pendingImage.name}</p>
            <p className="text-[11px] text-[#555555]">Archivo de conversación — añade un mensaje o envíalo solo</p>
          </div>
          <button type="button" onClick={() => setPendingImage(null)} className="text-[#666666] hover:text-[#F5F5F5]">
            <CloseIcon size={12} />
          </button>
        </div>
      )}

      {driveMode && (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[11.5px] text-[#888888]">Pega el enlace del documento en Drive — el oficial se queda allá, aquí solo compartes el acceso.</p>
          <button type="button" onClick={() => setDriveMode(false)} className="flex-shrink-0 text-[11.5px] text-[#666666] hover:text-[#F5F5F5]">
            Cancelar
          </button>
        </div>
      )}

      {/* Tools wrap onto their own line under the text when the column is
          narrow (a side panel open, or the thread composer), instead of
          squeezing the text box down to a few characters. */}
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1 rounded-[22px] border border-white/[0.1] bg-white/[0.03] py-1.5 pr-1.5 pl-4">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => updateText(e.target.value, e.target.selectionStart)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (suggestions.length) {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                return setMentionIndex((i) => (i + 1) % suggestions.length)
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                return setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
              }
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                return insertMention(suggestions[mentionIndex])
              }
              if (e.key === 'Escape') return setMentionQuery(null)
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') reset()
          }}
          placeholder={driveMode ? 'https://docs.google.com/...' : placeholder || 'Escribe un mensaje...'}
          className={`max-h-[140px] min-w-0 flex-1 resize-none self-center bg-transparent py-1.5 text-[13.5px] leading-relaxed text-[#F5F5F5] placeholder:text-[#666666] outline-none ${compact ? 'basis-full' : 'basis-[220px]'}`}
        />
        <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
          <ToolButton title="Formato" active={panel === 'format'} onClick={() => togglePanel('format')}>
            <span className="text-[13px] font-medium">Aa</span>
          </ToolButton>
          <ToolButton title="Emoji" active={panel === 'emoji'} onClick={() => togglePanel('emoji')}>
            <SmileIcon size={17} />
          </ToolButton>
          <ToolButton title="Adjuntar documento" active={panel === 'attach' || driveMode} onClick={() => togglePanel('attach')}>
            <PaperclipIcon size={16} />
          </ToolButton>
          <ToolButton title={processing ? 'Procesando imagen…' : 'Imagen'} disabled={processing} onClick={() => fileRef.current?.click()}>
            <ImageIcon size={16} />
          </ToolButton>
          <ToolButton title="Nota de voz (máx. 1 min)" onClick={voice.start}>
            <MicIcon size={16} />
          </ToolButton>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() && !pendingImage}
            className="ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#F5F5F5] transition-opacity duration-150 disabled:opacity-40"
            style={{ background: '#B8860B' }}
            title="Enviar"
          >
            <ArrowRightIcon size={15} />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
      </div>
    </div>
  )
}

