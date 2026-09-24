import { sendPush } from './push'

// Shared News rules. A post is live when it has no status (older posts)
// or status 'published'; drafts and scheduled posts are only seen by admins.
export const isPublished = (post) => !post.status || post.status === 'published'

// "Unread" for the bell and the News badge: live, not yours, and either not
// opened yet (only the last 14 days count, so old history never nags) or
// asking for a read confirmation you haven't given.
const RECENT_MS = 14 * 864e5
export function needsAttention(post, uid) {
  if (!uid || !isPublished(post) || post.createdByUid === uid) return false
  if (post.requireAck && !(post.acks || []).includes(uid)) return true
  const at = post.createdAt?.toMillis?.() || 0
  return Date.now() - at < RECENT_MS && !(post.readBy || []).includes(uid)
}

// Push "📰 Nuevo anuncio" to everyone else (server/push.js kind 'news').
export function notifyNewsPublished(post, sender) {
  return sendPush({ kind: 'news', postId: post.id, title: post.title, requireAck: Boolean(post.requireAck) }, sender).catch(() => {})
}
