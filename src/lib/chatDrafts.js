import { useEffect, useState } from 'react'

// Borradores por conversación (Slack/WhatsApp): what you half-wrote in a
// conversation stays there when you switch away and come back. Kept in this
// browser's localStorage — a per-person convenience, not shared state, so
// no Firestore writes on every keystroke. Keyed by conversation id (or
// `thread_{parentId}` for a thread's own box).
const PREFIX = 'ador_chat_draft:'
const listeners = new Set()
let cache = null

function load() {
  if (cache) return cache
  cache = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) cache[k.slice(PREFIX.length)] = localStorage.getItem(k)
    }
  } catch {
    // storage blocked (private mode) — drafts just live for this session
  }
  return cache
}

export function getDraft(key) {
  return (key && load()[key]) || ''
}

export function setDraft(key, text) {
  if (!key) return
  const drafts = load()
  const value = text && text.trim() ? text : ''
  if ((drafts[key] || '') === value) return
  cache = { ...drafts }
  if (value) cache[key] = value
  else delete cache[key]
  try {
    if (value) localStorage.setItem(PREFIX + key, value)
    else localStorage.removeItem(PREFIX + key)
  } catch {
    // see load()
  }
  listeners.forEach((fn) => fn(cache))
}

// All drafts, live — for the "Borrador" marks in the sidebar and Inbox.
export function useChatDrafts() {
  const [drafts, setDrafts] = useState(load)
  useEffect(() => {
    listeners.add(setDrafts)
    return () => listeners.delete(setDrafts)
  }, [])
  return drafts
}
