import { useEffect, useMemo, useRef, useState } from 'react'
import { subscribeTaskComments, addTaskComment, deleteTaskComment } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'

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
  const inputRef = useRef(null)

  useEffect(() => subscribeTaskComments(task.id, setComments), [task.id])

  // "@par" at the end of the text opens the suggestions.
  const mentionQuery = useMemo(() => {
    const m = text.match(/@([^\s@]*)$/)
    return m ? m[1].toLowerCase() : null
  }, [text])
  const suggestions = mentionQuery === null ? [] : users.filter((u) => u.id !== actorUserId && label(u).toLowerCase().replace(/\s+/g, '').includes(mentionQuery)).slice(0, 5)

  const pick = (u) => {
    setText((t) => t.replace(/@[^\s@]*$/, `@${label(u)} `))
    inputRef.current?.focus()
  }

  const send = async () => {
    const value = text.trim()
    if (!value || sending) return
    const mentions = users.filter((u) => u.id !== actorUserId && value.includes(`@${label(u)}`)).map((u) => ({ uid: u.id, name: label(u) }))
    setSending(true)
    try {
      await withTimeout(addTaskComment(task, value, mentions, { uid: actorUserId, name: actorName }))
      setText('')
    } catch (e) {
      showToast(`No se pudo comentar: ${e.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
        Comentarios{comments.length ? ` · ${comments.length}` : ''}
      </span>
      {comments.length === 0 ? (
        <p className="text-[13px] font-light text-[#444444]">Aún no hay comentarios. Usa @ para avisarle a alguien.</p>
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
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="relative mt-3">
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
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && suggestions.length === 0) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Escribe un comentario… (@ para mencionar)"
          className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-2.5 text-[13px] text-[#F5F5F5] outline-none placeholder:text-[#555555] focus:border-white/[0.2]"
        />
        <div className="mt-1.5 flex justify-end">
          <button type="button" onClick={send} disabled={!text.trim() || sending} className="ador-btn-primary rounded-xl px-4 py-1.5 text-[12.5px] font-medium disabled:opacity-40">
            {sending ? 'Enviando…' : 'Comentar'}
          </button>
        </div>
      </div>
    </div>
  )
}
