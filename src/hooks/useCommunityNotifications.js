import { useEffect, useMemo, useState } from 'react'
import { subscribeMyCommunityPosts, subscribeUserProfile, saveUserProfile, subscribeCommunityAlerts, markCommunityAlertRead, clearCommunityAlerts } from '../lib/firestore'

// Bell items for activity on *your* Comunidad posts: someone commented, or
// said "Asistiré" to your event. Each post carries `lastActivity` (written
// by addCommunityComment / setCommunityRsvp); it counts as new until you
// open Comunidad (`users/{uid}.communitySeenAt`). Only your own posts are
// subscribed, so the whole feed (and its photos) isn't downloaded app-wide.
export function useCommunityNotifications(uid, onNavigate) {
  const [posts, setPosts] = useState([])
  const [seenAt, setSeenAt] = useState(null) // null = profile not loaded yet
  const [alerts, setAlerts] = useState([]) // @mentions in posts and comments
  useEffect(() => {
    if (!uid || uid === 'preview') return
    const offAlerts = subscribeCommunityAlerts(uid, setAlerts)
    const offPosts = subscribeMyCommunityPosts(uid, setPosts)
    const offProfile = subscribeUserProfile(uid, (p) => setSeenAt(p?.communitySeenAt || 0))
    return () => { offPosts(); offProfile(); offAlerts() }
  }, [uid])

  return useMemo(() => {
    if (seenAt === null) return []
    const mentionItems = alerts.map((a) => ({
      key: `community-mention:${a.id}`,
      at: a.createdAt?.toMillis?.() || 0,
      text: `@ ${a.fromName} te mencionó en Comunidad${a.text ? `: “${a.text}”` : ''}`,
      time: '',
      onClick: () => {
        markCommunityAlertRead(a.id).catch(() => {})
        onNavigate?.('news', { type: 'community' })
      },
    }))
    return [...mentionItems, ...posts
      .filter((p) => p.lastActivity?.uid && p.lastActivity.uid !== uid && (p.lastActivity.at?.toMillis?.() || 0) > seenAt)
      .map((p) => {
        const a = p.lastActivity
        const what = p.title || p.text?.slice(0, 40) || 'tu publicación'
        return {
          key: `community:${p.id}:${a.at?.toMillis?.() || 0}`,
          at: a.at?.toMillis?.() || 0,
          text: a.kind === 'rsvp' ? `👥 ${a.name} asistirá a “${what}”` : `💬 ${a.name} comentó en “${what}”`,
          time: '',
          onClick: () => onNavigate?.('news', { type: 'community' }),
        }
      })
      ].sort((x, y) => y.at - x.at)
  }, [posts, alerts, seenAt, uid, onNavigate])
}

// Mounted by NewsModule while the Comunidad tab is open: marks everything
// as seen (and again whenever new activity arrives while you're looking).
export function useMarkCommunitySeen(uid, active, latestActivityAt) {
  useEffect(() => {
    if (!active || !uid || uid === 'preview') return
    saveUserProfile(uid, { communitySeenAt: Date.now() }).catch(() => {})
    clearCommunityAlerts(uid).catch(() => {})
  }, [active, uid, latestActivityAt])
}
