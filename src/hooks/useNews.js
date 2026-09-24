import { useEffect, useMemo, useState } from 'react'
import { subscribeNews, claimScheduledNews } from '../lib/firestore'
import { needsAttention, notifyNewsPublished } from '../lib/news'

// App-wide News signals (mounted from AppShell / TopBar):
//   useNewsAttention — announcements you haven't read (or must confirm),
//                      for the bell and the badge on the News icon.
//   useNewsPublisher — admins only: publishes scheduled posts when their
//                      time comes and sends the notification (no server
//                      cron needed; a transaction makes sure it's once).

export function useNewsAttention(uid, onNavigate) {
  const [posts, setPosts] = useState([])
  useEffect(() => {
    if (!uid || uid === 'preview') return
    return subscribeNews(setPosts)
  }, [uid])
  return useMemo(() => {
    const pending = posts.filter((p) => needsAttention(p, uid))
    const items = pending.map((p) => ({
      key: `news:${p.id}`,
      from: p.createdBy,
      at: p.createdAt?.toMillis?.() || 0,
      text: `${p.requireAck ? '📰 Confirma que leíste' : '📰 Nuevo anuncio'}: ${p.title}`,
      time: '',
      onClick: () => onNavigate?.('news', { type: 'news', id: p.id }),
    }))
    return { count: pending.length, items }
  }, [posts, uid, onNavigate])
}

export function useNewsPublisher(uid, isAdmin, senderName) {
  const [posts, setPosts] = useState([])
  useEffect(() => {
    if (!uid || uid === 'preview' || !isAdmin) return
    return subscribeNews(setPosts)
  }, [uid, isAdmin])
  useEffect(() => {
    const scheduled = posts.filter((p) => p.status === 'scheduled' && p.publishAt?.toMillis)
    if (!scheduled.length) return
    const run = () => {
      for (const p of scheduled) {
        if (p.publishAt.toMillis() > Date.now()) continue
        claimScheduledNews(p.id)
          .then((claimed) => claimed && notifyNewsPublished(claimed, { uid, name: senderName }))
          .catch(() => {})
      }
    }
    run()
    const t = setInterval(run, 30_000)
    return () => clearInterval(t)
  }, [posts, uid, senderName])
}
