import { useEffect, useRef, useState } from 'react'
import { subscribeScheduledFor, claimScheduledMessage, deleteScheduledMessage } from '../lib/firestore'
import { deliverMessage } from '../lib/chatSend'

const CHECK_MS = 20_000
const STALE_CLAIM_MS = 5 * 60 * 1000

// "Enviar más tarde", with no server: mounted once in AppShell, it listens
// to the scheduled messages this person is the author or a recipient of
// (lib/firestore.js subscribeScheduledFor) and sends the ones that are due.
// The listener only costs reads when something changes; the due check
// itself is a local timer. Whichever open app claims a message first sends
// it (claimScheduledMessage is a transaction), then deletes the doc.
//
// If nobody involved has ADOR OS open at that time, it goes out the moment
// one of them opens it — which is also when they'd see it.
export function useScheduledSender(uid) {
  const [items, setItems] = useState([])
  const busyRef = useRef(new Set())

  useEffect(() => {
    if (!uid || uid === 'preview') return
    return subscribeScheduledFor(uid, setItems)
  }, [uid])

  useEffect(() => {
    if (!items.length) return
    const run = async () => {
      const now = Date.now()
      for (const it of items) {
        const due = (it.sendAt?.toMillis?.() ?? Infinity) <= now
        const claimedRecently = it.status === 'sending' && now - (it.claimedAt?.toMillis?.() || 0) < STALE_CLAIM_MS
        if (!due || claimedRecently || busyRef.current.has(it.id)) continue
        busyRef.current.add(it.id)
        try {
          const claimed = await claimScheduledMessage(it.id)
          if (!claimed) continue
          await deliverMessage({
            convType: claimed.convType,
            convId: claimed.convId,
            dmParticipants: claimed.dmParticipants,
            participantUids: claimed.participantUids,
            conversationLabel: claimed.conversationLabel,
            payload: claimed.payload,
            authorUid: claimed.authorUid,
            authorName: claimed.authorName,
          })
          await deleteScheduledMessage(it.id)
        } catch (error) {
          // Left as 'sending'; another open app (or this one) retries it
          // once the claim goes stale.
          console.error('No se pudo enviar un mensaje programado:', error.message)
        } finally {
          busyRef.current.delete(it.id)
        }
      }
    }
    run()
    const t = setInterval(run, CHECK_MS)
    return () => clearInterval(t)
  }, [items])

  return items
}
