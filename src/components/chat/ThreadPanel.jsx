import { useEffect, useRef, useState } from 'react'
import { subscribeMessage, subscribeMessages, subscribeTyping } from '../../lib/firestore'
import { typingNames, typingLabel } from '../../lib/chat'
import { MessageBubble } from './MessageBubble'
import Composer from './Composer'
import SidePanel from './SidePanel'

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
  onRemind,
  onCreateTask,
  onOpenTask,
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
    showAvatar: true,
    currentUid,
    saved: savedIds.has(m.id),
    userName,
    userPhoto,
    onOpenProfile,
    onToggleSave: () => onToggleSave(m, m.id === parentId ? null : parentId),
    onOpenImage,
    onRemind: onRemind ? (at) => onRemind(m, at) : null,
    onCreateTask: onCreateTask ? () => onCreateTask(m) : null,
    onOpenTask,
  })

  return (
    <SidePanel title="Hilo" subtitle={conversationLabel} onClose={onClose} bodyClassName="flex min-h-0 flex-1 flex-col px-5 pb-4">

        <div ref={scrollRef} data-keep-scroll className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3">
          {parent === null ? (
            <p className="py-10 text-center text-[12.5px] text-[#7A7A7A]">Este mensaje ya no existe.</p>
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
                <span className="text-[11px] text-[#7A7A7A]">
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
          <Composer compact key={parentId} draftKey={`thread_${parentId}`} onSend={(draft) => onSend(draft, parent)} onTyping={onTyping} mentionCandidates={mentionCandidates} placeholder="Responder en el hilo..." onError={onError} />
        )}
    </SidePanel>
  )
}
