import { useEffect, useRef, useState } from 'react'
import { fetchRecentMessages } from '../lib/firestore'

// How far back each conversation is searched, and how long a fetched copy
// is reused before searching again reads fresh messages.
const DEPTH = 150
const CACHE_MS = 15 * 60_000

// Firestore has no full-text search, and a paid search service (Algolia,
// Typesense) is overkill for a 3-person firm. Instead: when you search,
// read the last DEPTH messages of every conversation you can see — once,
// no live listeners — and match on the device, accent- and case-
// insensitive, every word must appear. Cached 15 minutes per
// conversation so refining a search doesn't re-read anything. Thread
// replies aren't included (they live one level deeper).
const cache = new Map() // convId → { at, messages }

export function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

async function messagesFor(conv) {
  const hit = cache.get(conv.convId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.messages
  const messages = await fetchRecentMessages(conv.convType, conv.convId, DEPTH)
  cache.set(conv.convId, { at: Date.now(), messages })
  return messages
}

export function useMessageSearch(conversations, query) {
  const [state, setState] = useState({ loading: false, results: [], searched: '' })
  const runRef = useRef(0)
  const convKey = conversations.map((c) => c.convId).join(',')

  useEffect(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    if (!words.length) {
      setState({ loading: false, results: [], searched: '' })
      return
    }
    const run = ++runRef.current
    setState((s) => ({ ...s, loading: true }))
    const timer = setTimeout(async () => {
      const lists = await Promise.all(conversations.map((c) => messagesFor(c).then((ms) => ms.map((m) => ({ message: m, conv: c }))).catch(() => [])))
      if (run !== runRef.current) return
      const results = lists
        .flat()
        .filter(({ message }) => {
          const hay = normalize(`${message.text || ''} ${message.attachment?.name || ''} ${message.authorName || ''}`)
          return words.every((w) => hay.includes(w))
        })
        .sort((a, b) => (b.message.createdAt?.toMillis?.() || 0) - (a.message.createdAt?.toMillis?.() || 0))
        .slice(0, 150)
      setState({ loading: false, results, searched: query.trim() })
    }, 300)
    return () => clearTimeout(timer)
  }, [query, convKey])

  return state
}
