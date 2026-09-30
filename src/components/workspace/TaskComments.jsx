import { useEffect, useMemo, useRef, useState } from 'react'
import { subscribeTaskComments, addTaskComment, deleteTaskComment } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'
import { EMOJIS } from '../../lib/chat'
import { useDrivePicker } from '../../hooks/useDrivePicker'
import { PaperclipIcon, SmileIcon, CloseIcon } from '../icons'

const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const label = (u) => u.displayName || u.email || 'Usuario'

function timeLabel(value) {
  const d = value?.toDate?.()
  if (!d) return 'ahora'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Text with the @Name tokens of the people actually mentioned in gold.
function CommentText({ text, mentions }) {
  const names = (mentions || []).map((m) => m.name).filter(Boolean)
  if (!names.length) return <>{text}</>
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(@(?:${escaped.join('|')}))`, 'g'))
  return parts.map((part, i) =>
    names.some((n) => part === `@${n}`) ? (
      <span key={i} className="font-medium text-[#E8C15A]">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

// Discusión dentro de la tarea, con @menciones. Quien la tiene asignada y
// quien se menciona recibe un aviso (push) — ver addTaskComment.
export default function TaskComments({ task, users, userById, actorUserId, actorName }) {
  const showToast = useToast()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [caret, setCaret] = useState(0)
  const [files, setFiles] = useState([]) // Drive files waiting to be published
  const [emojiOpen, setEmojiOpen] = useState(false)
  const inputRef = useRef(null)
  const drive = useDrivePicker('workspace')

  useEffect(() => subscribeTaskComments(task.id, setComments), [task.id])

  // "@par" right before the cursor opens the suggestions.
  const mentionQuery = useMemo(() => {
    const m = text.slice(0, caret).match(/@([^\s@]*)$/)
    return m ? m[1].toLowerCase() : null
  }, [text, caret])
  const suggestions = mentionQuery === null ? [] : users.filter((u) => u.id !== actorUserId && label(u).toLowerCase().replace(/\s+/g, '').includes(mentionQuery)).slice(0, 5)

  const insertAtCaret = (insert, replaceMention = false) => {
    const before = text.slice(0, caret)
    const after = text.slice(caret)
    const head = replaceMention ? before.replace(/@[^\s@]*$/, '') : before
    const next = head + insert + after
    const pos = (head + insert).length
    setText(next)
    setCaret(pos)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(pos, pos)
    })
  }
  const pick = (u) => insertAtCaret(`@${label(u)} `, true)

  const attachFromDrive = async () => {
    const picked = await drive.pick({ multiple: true, title: 'Adjuntar a la actualización' })
    if (picked.length) setFiles((f) => [...f, ...picked.map((x) => ({ name: x.name, url: x.url, fileId: x.fileId, mimeType: x.mimeType || '', iconUrl: x.iconUrl || null }))])
  }

  const send = async () => {
    const value = text.trim()
    if ((!value && files.length === 0) || sending) return
    const mentions = users.filter((u) => u.id !== actorUserId && value.includes(`@${label(u)}`)).map((u) => ({ uid: u.id, name: label(u) }))
    setSending(true)
    try {
      await withTimeout(addTaskComment(task, value, mentions, { uid: actorUserId, name: actorName }, files))
      setText('')
      setFiles([])
      setEmojiOpen(false)
    } catch (e) {
      showToast(`No se pudo comentar: ${e.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div id="task-comments">
      <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
        Actualizaciones{comments.length ? ` · ${comments.length}` : ''}
      </span>
      {comments.length === 0 ? (
        <p className="text-[13px] font-light text-[#444444]">Aún no hay actualizaciones. Comparte avances o usa @ para avisarle a alguien.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => {
            const author = userById[c.authorUid]
            return (
              <div key={c.id} className="group flex gap-2.5">
                <Avatar photoURL={author?.photoDataUrl} displayName={c.authorName} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[#888888]">
                    <span className="font-medium text-[#F5F5F5]">{c.authorName}</span> · {timeLabel(c.createdAt)}
                    {c.authorUid === actorUserId && (
                      <button
                        type="button"
                        onClick={() => deleteTaskComment(task.id, c.id).catch((e) => showToast(e.message))}
                        className="ml-2 text-[11px] text-[#666666] opacity-0 transition-opacity hover:text-[#EF5350] group-hover:opacity-100"
                      >
                        Eliminar
                      </button>
                    )}
                  </p>
                  <p className="ador-wrap mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#DDDDDD]">
                    <CommentText text={c.text} mentions={c.mentions} />
                  </p>
                  {(c.attachments || []).map((f) => (
                    <a key={f.fileId || f.url} href={f.url} target="_blank" rel="noreferrer" className="mt-1.5 flex max-w-[300px] items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 transition-colors hover:bg-white/[0.06]">
                      {f.iconUrl ? <img src={f.iconUrl} alt="" className="h-4 w-4" /> : <PaperclipIcon size={14} />}
                      <span className="min-w-0 truncate text-[12px] text-[#F0F0F0]">{f.name}</span>
                      <span className="ml-auto flex-shrink-0 text-[10.5px] text-[#B8860B]">Drive ↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="relative mt-3 rounded-2xl border border-white/[0.1] bg-[#1A1A1A] transition-colors focus-within:border-white/[0.22]">
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 z-10 mb-1 overflow-hidden rounded-xl border border-white/[0.1] bg-[#1A1A1A] p-1 shadow-xl">
            {suggestions.map((u) => (
              <button key={u.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(u)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#F5F5F5] hover:bg-white/[0.06]">
                <Avatar photoURL={u.photoDataUrl} displayName={u.displayName} email={u.email} size={20} />
                {label(u)}
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={text}
          rows={3}
          onChange={(e) => {
            setText(e.target.value)
            setCaret(e.target.selectionStart)
          }}
          onSelect={(e) => setCaret(e.target.selectionStart)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && suggestions.length === 0) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Escribe una actualización y menciona a otros con @"
          className="block w-full resize-none rounded-t-2xl bg-transparent px-4 pt-3 text-[13px] text-[#F5F5F5] outline-none placeholder:text-[#666666]"
        />

        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-1">
            {files.map((f, i) => (
              <span key={f.fileId || i} className="flex max-w-[220px] items-center gap-1.5 rounded-full bg-white/[0.07] py-1 pl-2.5 pr-1.5 text-[11.5px] text-[#DDDDDD]">
                <span className="truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles((list) => list.filter((_, j) => j !== i))} className="text-[#888888] hover:text-[#F5F5F5]">
                  <CloseIcon size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {emojiOpen && (
          <div className="mx-2 mb-1 flex flex-wrap gap-0.5 rounded-xl bg-white/[0.04] p-1.5">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => insertAtCaret(e)} className="flex h-7 w-7 items-center justify-center rounded-md text-[16px] hover:bg-white/[0.08]">
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-0.5 px-2 pb-2 pt-1">
          <button type="button" title="Mencionar a alguien" onMouseDown={(e) => e.preventDefault()} onClick={() => insertAtCaret('@')} className="flex h-8 w-8 items-center justify-center rounded-lg text-[15px] font-medium text-[#999999] transition-colors hover:bg-white/[0.07] hover:text-[#F5F5F5]">
            @
          </button>
          <button type="button" title="Adjuntar archivo de Google Drive" onClick={attachFromDrive} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#999999] transition-colors hover:bg-white/[0.07] hover:text-[#F5F5F5]">
            <PaperclipIcon size={15} />
          </button>
          <button type="button" title="Emoji" onMouseDown={(e) => e.preventDefault()} onClick={() => setEmojiOpen((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.07]" style={{ color: emojiOpen ? '#E8C15A' : '#999999' }}>
            <SmileIcon size={15} />
          </button>
          <button type="button" onClick={send} disabled={(!text.trim() && files.length === 0) || sending} className="ador-btn-primary ml-auto rounded-xl px-4 py-1.5 text-[12.5px] font-medium disabled:opacity-40">
            {sending ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
        {drive.prompt}
      </div>
    </div>
  )
}
