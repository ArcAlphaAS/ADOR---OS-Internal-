import { useEffect, useRef, useState } from 'react'
import { subscribeMessage, subscribeMessages, subscribeTyping } from '../../lib/firestore'
import { typingNames, typingLabel } from '../../lib/chat'
import { MessageBubble, Composer } from './ChatThread'
import { CloseIcon } from '../icons'

const REPLY_PAGE = 100

// Slack's thread panel: the original message on top, its replies below,
// and a composer that answers inside the thread instead of the channel.
// Rendered as a normal-flow column beside the conversation (like
// Detalles / the profile panel), so it needs no portal.
export default function ThreadPanel({
  convType,
  convId,
  parentId,
  conversationLabel,
  currentUid,
  savedIds,
  userName,
  userPhoto,
  mentionCandidates,
  jumpToId,
  onClose,
  onSend,
  onTyping,
  onEdit,
  onDelete,
  onReact,
  onToggleSave,
  onOpenProfile,
  onOpenImage,
  onRead,
  onError,
}) {
  const [parent, setParent] = useState(undefined)
  const [replies, setReplies] = useState([])
  const [typing, setTyping] = useState({})
  const [, setTick] = useState(0)
  const scrollRef = useRef(null)

  useEffect(() => subscribeMessage(convType, convId, parentId, setParent), [convType, convId, parentId])
  useEffect(() => subscribeMessages(convType, convId, REPLY_PAGE, setReplies, parentId), [convType, convId, parentId])
  useEffect(() => subscribeTyping(`${convId}_thread_${parentId}`, setTyping), [convId, parentId])

  const typers = typingNames(typing, currentUid)
  useEffect(() => {
    if (!typers.length) return
    const t = setInterval(() => setTick((n) => n + 1), 2000)
    return () => clearInterval(t)
  }, [typers.length])

  // Opening the thread (or a new reply arriving while it's open) marks it
  // read — the same timestamp that clears Hilos and the bell.
  useEffect(() => {
    onRead()
  }, [replies.length, parentId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const target = jumpToId && document.getElementById(`reply-${jumpToId}`)
    if (target) {
      target.scrollIntoView({ block: 'center' })
      target.animate([{ background: 'rgba(184,134,11,0.18)' }, { background: 'transparent' }], { duration: 1800, easing: 'ease-out' })
    } else el.scrollTop = el.scrollHeight
  }, [replies.length, jumpToId])

  const bubbleProps = (m) => ({
    message: m,
    mine: m.authorUid === currentUid,
    currentUid,
    saved: savedIds.has(m.id),
    userName,
    userPhoto,
    onOpenProfile,
    onToggleSave: () => onToggleSave(m, m.id === parentId ? null : parentId),
    onOpenImage,
  })

  return (
    <aside className="flex w-[340px] flex-shrink-0 flex-col">
      <div className="ador-glass ador-grain flex min-h-0 flex-1 flex-col rounded-2xl p-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <p className="text-[14px] font-semibold text-[#F5F5F5]">Hilo</p>
            <p className="text-[11.5px] text-[#555555]">{conversationLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#666666] hover:text-[#F5F5F5]">
            <CloseIcon size={12} />
          </button>
        </div>

        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3">
          {parent === null ? (
            <p className="py-10 text-center text-[12.5px] text-[#555555]">Este mensaje ya no existe.</p>
          ) : parent ? (
            <>
              <div className="flex">
                <MessageBubble
                  {...bubbleProps(parent)}
                  onEdit={(text) => onEdit(parent.id, text, null)}
                  onDelete={() => {
                    onDelete(parent.id, null)
                    onClose()
                  }}
                  onReact={(emoji, has) => onReact(parent.id, emoji, has, null)}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#555555]">
                  {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'}
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              {replies.map((r) => (
                <div key={r.id} id={`reply-${r.id}`} className={`flex ${r.authorUid === currentUid ? 'justify-end' : 'justify-start'}`}>
                  <MessageBubble
                    {...bubbleProps(r)}
                    onEdit={(text) => onEdit(r.id, text, parentId)}
                    onDelete={() => onDelete(r.id, parentId)}
                    onReact={(emoji, has) => onReact(r.id, emoji, has, parentId)}
                  />
                </div>
              ))}
            </>
          ) : null}
        </div>

        <p className="h-4 px-1 text-[11px] italic text-[#777777]">{typingLabel(typers)}</p>
        {parent !== null && (
          <Composer compact key={parentId} onSend={(draft) => onSend(draft, parent)} onTyping={onTyping} mentionCandidates={mentionCandidates} placeholder="Responder en el hilo..." onError={onError} />
        )}
      </div>
    </aside>
  )
}
