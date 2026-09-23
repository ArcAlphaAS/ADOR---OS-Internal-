import { useEffect } from 'react'
import { runChatRetention } from '../lib/chatRetention'

// Kicks off the daily chat cleanup (lib/chatRetention.js) a little after
// ADOR OS opens, when nothing else is loading. The transaction inside makes
// sure only one person's app does it per day.
export function useChatRetention(uid) {
  useEffect(() => {
    if (!uid || uid === 'preview') return
    const t = setTimeout(() => runChatRetention().catch(() => {}), 20_000)
    return () => clearTimeout(t)
  }, [uid])
}
