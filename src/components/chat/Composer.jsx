import { useEffect, useRef, useState } from 'react'
import { mentionQueryAt, EMOJIS, FORMATS, scheduleOptions, formatReminderTime, MAX_POLL_OPTIONS } from '../../lib/chat'
import { getDraft, setDraft } from '../../lib/chatDrafts'
import { useDrivePicker } from '../../hooks/useDrivePicker'
import { resizeImageToDataUrl } from '../../lib/image'
import { ArrowRightIcon, CloseIcon, PaperclipIcon, ImageIcon, SmileIcon, MicIcon, ClockIcon, ReplyIcon, PollIcon, AlertIcon, PlusIcon } from '../icons'
import { formatDuration } from './MessageBubble'
import PersonAvatar from './PersonAvatar'

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
    const rec = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 })
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
//
// `draftKey` keeps what you half-wrote per conversation (lib/chatDrafts.js).
// `replyTo` shows "Respondiendo a…" above the box. `onSchedule(draft, at)`
// enables "Enviar más tarde" (text only — images and voice go now).
// `canPoll` adds "Encuesta"; `canMarkImportant` adds "Importante" (asks
// everyone in the conversation to confirm they read it).
export default function Composer({ onSend, onError, onTyping, mentionCandidates = [], placeholder, compact, draftKey, replyTo, onCancelReply, onSchedule, canPoll, canMarkImportant }) {
  const [text, setText] = useState(() => getDraft(draftKey))
  const [panel, setPanel] = useState(null) // 'more' | 'format' | 'emoji' | 'schedule' | 'poll' | null
  const [customAt, setCustomAt] = useState('')
  const [important, setImportant] = useState(false)
  // "Archivo de Google Drive": files stay in the company's Drive; the
  // message carries a link card (a pasted Drive link still works too).
  const drive = useDrivePicker('chat')
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

  // Auto-grow up to ~6 lines, then scroll inside. Also re-measured when the
  // box changes width (window resized, a side panel opened), otherwise it
  // could stay tall from an earlier, narrower layout.
  const fitHeight = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }
  useEffect(fitHeight, [text])
  useEffect(() => {
    setDraft(draftKey, text)
  }, [text, draftKey])
  // "Responder" on a message puts the cursor here, ready to type.
  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo?.id])
  useEffect(() => {
    const el = inputRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let lastWidth = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return
      lastWidth = el.clientWidth
      fitHeight()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const reset = () => {
    if (lastTypingRef.current) {
      lastTypingRef.current = 0
      onTyping?.(false)
    }
    setText('')
    setPendingImage(null)
    setPanel(null)
    setMentions([])
    setMentionQuery(null)
    setImportant(false)
  }

  const submit = () => {
    if (!text.trim() && !pendingImage) return
    const finalMentions = mentions.filter((m) => text.includes(`@${m.name}`))
    onSend({ text: text.trim(), image: pendingImage || undefined, mentions: finalMentions, important: important || undefined })
    reset()
  }

  const schedule = (at) => {
    if (!text.trim()) return onError('Escribe el mensaje antes de programarlo.')
    if (pendingImage) return onError('Las imágenes se envían al momento — quita la imagen para programar el texto.')
    if (important) return onError('Los mensajes importantes se envían al momento — quita “Importante” para programarlo.')
    if (!(at instanceof Date) || Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000) return onError('Elige una hora al menos un minuto en el futuro.')
    const finalMentions = mentions.filter((m) => text.includes(`@${m.name}`))
    onSchedule({ text: text.trim(), mentions: finalMentions }, at)
    reset()
    setCustomAt('')
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
      const [thumbUrl, fullDataUrl] = await Promise.all([resizeImageToDataUrl(file, 400, 0.7), resizeImageToDataUrl(file, 1280, 0.78)])
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
          <span className="text-[13.5px] text-[#F5F5F5]">Grabando nota de voz</span>
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
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#B8860B]/60 bg-[#0A0A0A]/80 text-[13.5px] text-[#E8C15A]">
          Suelta la imagen para adjuntarla
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-xl border border-white/[0.1] bg-[#141414] p-1.5">
          <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.08em] text-[#7A7A7A]">Mencionar</p>
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
              <PersonAvatar uid={c.uid} name={c.name} size={20} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      {panel === 'more' && (
        <div className={`grid gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {[
            { id: 'format', icon: <span className="text-[12.5px] font-semibold">Aa</span>, label: 'Formato', hint: 'Negrita, cursiva, tachado, código', onPick: () => setPanel('format') },
            {
              id: 'drive',
              icon: <PaperclipIcon size={14} />,
              label: drive.busy ? 'Abriendo Google Drive…' : 'Archivo de Google Drive',
              hint: 'PDF, Excel, contratos… o súbelo desde tu computadora',
              onPick: async () => {
                setPanel(null)
                const files = await drive.pick({ multiple: true, title: 'Compartir en la conversación' })
                for (const f of files) onSend({ driveFile: f })
              },
            },
            canPoll && { id: 'poll', icon: <PollIcon size={14} />, label: 'Encuesta', hint: 'Pregunta rápida, todos votan con un clic', onPick: () => setPanel('poll') },
            canMarkImportant && {
              id: 'important',
              icon: <AlertIcon size={14} />,
              label: important ? 'Quitar “Importante”' : 'Marcar importante',
              hint: 'Pide a todos confirmar que lo leyeron',
              active: important,
              onPick: () => {
                setImportant((v) => !v)
                setPanel(null)
                inputRef.current?.focus()
              },
            },
            onSchedule && { id: 'schedule', icon: <ClockIcon size={14} />, label: 'Enviar más tarde', hint: 'Elige día y hora de envío', onPick: () => setPanel('schedule') },
          ]
            .filter(Boolean)
            .map((o) => (
              <button
                key={o.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={o.onPick}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]"
                style={o.active ? { background: 'rgba(184,134,11,0.12)' } : undefined}
              >
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]" style={{ color: o.active ? '#E8C15A' : '#CCCCCC' }}>
                  {o.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium" style={{ color: o.active ? '#E8C15A' : '#E5E5E5' }}>
                    {o.label}
                  </span>
                  <span className="block text-[11px] leading-snug text-[#858585]">{o.hint}</span>
                </span>
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
              className="flex h-7 min-w-7 items-center justify-center rounded-md border border-white/[0.08] px-2 text-[12.5px] text-[#CCCCCC] hover:border-white/[0.2] hover:text-[#F5F5F5]"
              style={{ fontWeight: f.id === 'bold' ? 700 : 400, fontStyle: f.id === 'italic' ? 'italic' : 'normal', textDecoration: f.id === 'strike' ? 'line-through' : 'none', fontFamily: f.id === 'code' ? 'monospace' : undefined }}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-2 text-[11px] text-[#7A7A7A]">Selecciona texto y aplica · Shift+Enter para nueva línea</span>
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

      {panel === 'schedule' && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5">
          <span className="px-1.5 text-[11px] text-[#8A8A8A]">Enviar</span>
          {scheduleOptions().map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                schedule(o.at)
              }}
              className="rounded-full border border-white/[0.1] px-2.5 py-1 text-[12.5px] text-[#CCCCCC] hover:border-white/[0.2] hover:text-[#F5F5F5]"
            >
              {o.label}
            </button>
          ))}
          <span className="flex items-center gap-1.5">
            <input
              type="datetime-local"
              value={customAt}
              onChange={(e) => setCustomAt(e.target.value)}
              className="rounded-full border border-white/[0.1] bg-transparent px-2.5 py-1 text-[12.5px] text-[#CCCCCC] outline-none [color-scheme:dark]"
            />
            {customAt && (
              <button type="button" onClick={() => schedule(new Date(customAt))} className="rounded-full px-2.5 py-1 text-[12.5px] font-medium text-[#1C1A16]" style={{ background: '#E8C15A' }}>
                Programar {formatReminderTime(new Date(customAt))}
              </button>
            )}
          </span>
          <span className="basis-full px-1.5 text-[11px] text-[#7A7A7A]">Sale solo a esa hora desde el ADOR OS de quien esté conectado — tú o quien lo recibe.</span>
        </div>
      )}

      {panel === 'poll' && (
        <PollForm
          onCancel={() => setPanel(null)}
          onError={onError}
          onPublish={(poll) => {
            onSend({ poll })
            setPanel(null)
          }}
        />
      )}

      {important && (
        <div className="flex items-center gap-2 px-1 text-[12.5px] text-[#E8C15A]">
          <AlertIcon size={13} />
          Importante — se pedirá a todos que confirmen que lo leyeron.
          <button type="button" onClick={() => setImportant(false)} className="ml-auto text-[11px] text-[#858585] hover:text-[#F5F5F5]">
            Quitar
          </button>
        </div>
      )}

      {replyTo && (
        <div className="flex items-center gap-2.5 rounded-xl border-l-2 border-[#B8860B] bg-white/[0.03] py-1.5 pr-2 pl-3">
          <ReplyIcon size={13} className="flex-shrink-0 text-[#E8C15A]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-[#E8C15A]">Respondiendo a {replyTo.authorName}</span>
            <span className="block truncate text-[12.5px] text-[#AAAAAA]">{replyTo.text}</span>
          </span>
          <button type="button" onClick={onCancelReply} title="Cancelar respuesta" className="flex-shrink-0 text-[#858585] hover:text-[#F5F5F5]">
            <CloseIcon size={11} />
          </button>
        </div>
      )}

      {pendingImage && (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 pr-3">
          <img src={pendingImage.thumbUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] text-[#DDDDDD]">{pendingImage.name}</p>
            <p className="text-[11px] text-[#8A8A8A]">Archivo de conversación · se borra a los 90 días — lo importante, súbelo a Drive</p>
          </div>
          <button type="button" onClick={() => setPendingImage(null)} className="text-[#858585] hover:text-[#F5F5F5]">
            <CloseIcon size={12} />
          </button>
        </div>
      )}

      {drive.prompt}

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
            if (e.key === 'Escape') {
              if (replyTo && onCancelReply) return onCancelReply()
              reset()
            }
          }}
          placeholder={placeholder || 'Escribe un mensaje...'}
          className={`max-h-[140px] min-w-0 flex-1 resize-none self-center bg-transparent py-1.5 text-[13.5px] leading-relaxed text-[#F5F5F5] placeholder:text-[#858585] outline-none ${compact ? 'basis-full' : 'basis-[220px]'}`}
        />
        <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
          {/* Only the everyday tools stay in view (emoji, imagen, voz);
              everything else lives behind "+" with its name and what it
              does — nine buttons in a row read as clutter. */}
          <span className="relative">
            <ToolButton title="Más opciones" active={panel === 'more'} onClick={() => togglePanel('more')}>
              <PlusIcon size={16} />
            </ToolButton>
            {(important || panel === 'format' || panel === 'poll' || panel === 'schedule') && panel !== 'more' && (
              <span className="pointer-events-none absolute top-1 right-1 h-1.5 w-1.5 rounded-full" style={{ background: '#E8C15A' }} />
            )}
          </span>
          <ToolButton title="Emoji" active={panel === 'emoji'} onClick={() => togglePanel('emoji')}>
            <SmileIcon size={17} />
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


// Inline poll builder, in normal flow above the text box like every other
// composer panel. Starts with Sí / No filled in — the most common quick
// vote between partners — editable, up to MAX_POLL_OPTIONS options.
let optionSeq = 0
const newOption = (label = '') => ({ id: `o${Date.now().toString(36)}${optionSeq++}`, label })

function PollForm({ onPublish, onCancel, onError }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(() => [newOption('Sí'), newOption('No')])
  const [multi, setMulti] = useState(false)
  const inputClass = 'w-full rounded-lg border border-white/[0.1] bg-[#141414] px-3 py-1.5 text-[13.5px] text-[#F5F5F5] placeholder:text-[#7A7A7A] outline-none focus:border-white/[0.22]'

  const publish = () => {
    const clean = options.map((o) => ({ ...o, label: o.label.trim() })).filter((o) => o.label)
    if (!question.trim()) return onError('Escribe la pregunta de la encuesta.')
    if (clean.length < 2) return onError('La encuesta necesita al menos dos opciones.')
    onPublish({ question: question.trim(), options: clean, multi })
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">
        <PollIcon size={12} /> Nueva encuesta
      </p>
      <input autoFocus type="text" value={question} maxLength={200} onChange={(e) => setQuestion(e.target.value)} placeholder="¿Qué quieres preguntar?" className={inputClass} />
      {options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <input
            type="text"
            value={o.label}
            maxLength={80}
            onChange={(e) => setOptions((list) => list.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))}
            placeholder={`Opción ${i + 1}`}
            className={inputClass}
          />
          {options.length > 2 && (
            <button type="button" title="Quitar opción" onClick={() => setOptions((list) => list.filter((x) => x.id !== o.id))} className="flex-shrink-0 text-[#858585] hover:text-[#F5F5F5]">
              <CloseIcon size={11} />
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {options.length < MAX_POLL_OPTIONS && (
          <button type="button" onClick={() => setOptions((list) => [...list, newOption()])} className="text-[12.5px] text-[#E8C15A] hover:underline">
            + Opción
          </button>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[#AAAAAA]">
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} className="accent-[#B8860B]" />
          Permitir varias respuestas
        </label>
        <span className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onCancel} className="text-[12.5px] text-[#858585] hover:text-[#F5F5F5]">
            Cancelar
          </button>
          <button type="button" onClick={publish} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-[#1C1A16]" style={{ background: '#E8C15A' }}>
            Publicar encuesta
          </button>
        </span>
      </div>
    </div>
  )
}
