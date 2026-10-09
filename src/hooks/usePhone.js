import { useSyncExternalStore } from 'react'

// True on phone-width screens (< 768px) — the breakpoint where Comunicación
// shows one pane at a time and takes its glass look (see index.css
// .ador-chat-bg). Computers and tablets in landscape never match.
const QUERY = '(max-width: 767px)'
const subscribe = (cb) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export default function usePhone() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
}
