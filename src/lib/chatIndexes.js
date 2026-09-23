// Derived chat state — everything Comunicación computes from the raw
// Firestore data it listens to: unread flags, the Inbox list, Menciones,
// Hilos, Guardados and Archivos (filtered to what you can see), and the
// sidebar counters. Pure functions, no React, so ChatModule.jsx only
// orchestrates and this logic can be read (and reused) on its own.
import { conversationKind, isPrivate, userLabel, groupLabel, unreadCountOf } from './chat'

// A conversation "has news" when its last message landed after the last
// time this user marked it read (users/{uid}.chatLastRead, see
// markChatRead in lib/firestore.js) — one timestamp per conversation, not
// a per-message read receipt.
export function isUnread(lastMessageAt, lastReadAt) {
  if (!lastMessageAt?.toMillis) return false
  if (!lastReadAt?.toMillis) return true
  return lastMessageAt.toMillis() > lastReadAt.toMillis()
}

// Human label for any conversation, resolved from live data (so a renamed
// channel or group shows its current name everywhere).
export function makeLabelFor({ uid, users, allChannels }) {
  const nameOf = (id) => userLabel(users.find((u) => u.id === id))
  return (type, convId, participantUids) => {
    if (type === 'dm') {
      const other = (participantUids || []).find((x) => x !== uid)
      return other ? nameOf(other) : 'Mensaje directo'
    }
    const c = allChannels.find((x) => x.id === convId)
    if (!c) return 'Conversación'
    return conversationKind(c) === 'group' ? groupLabel(c, users, uid) : `#${c.name}`
  }
}

const ms = (ts) => ts?.toMillis?.() || 0

export function buildChatIndexes({ uid, users, visible, myDms, profile, mentions, saved, files, labelFor }) {
  const lastRead = profile?.chatLastRead || {}
  const muted = profile?.chatMuted || {}
  const readCount = profile?.chatReadCount || {}

  const unreadMap = {}
  for (const c of visible) unreadMap[c.id] = !muted[c.id] && isUnread(c.lastMessageAt, lastRead[c.id])
  for (const d of myDms) unreadMap[d.id] = !muted[d.id] && isUnread(d.updatedAt, lastRead[d.id])

  const visibleKeys = new Set([...visible.map((c) => c.id), ...myDms.map((d) => d.id)])

  // A mention or reply inside a thread is read once that thread is opened
  // (`thread_{parentId}`), not the conversation around it.
  const readKeyOf = (m) => (m.threadParentId ? `thread_${m.threadParentId}` : m.conversationKey)
  const indexed = mentions
    .filter((m) => visibleKeys.has(m.conversationKey))
    .map((m) => ({ ...m, conversationLabel: labelFor(m.convType, m.convId, m.participantUids), unread: ms(m.createdAt) > ms(lastRead[readKeyOf(m)]) }))
    .sort((a, b) => ms(b.createdAt) - ms(a.createdAt))
  const myMentions = indexed.filter((m) => m.kind !== 'reply')

  // Hilos: one row per thread you take part in, its latest reply first.
  const myThreads = []
  const seenThreads = new Set()
  for (const m of indexed) {
    if (m.kind !== 'reply' || seenThreads.has(m.threadParentId)) continue
    seenThreads.add(m.threadParentId)
    myThreads.push({ ...m, unread: indexed.some((x) => x.kind === 'reply' && x.threadParentId === m.threadParentId && x.unread) })
  }

  const mySaved = saved.map((x) => ({ ...x, conversationLabel: labelFor(x.convType, x.convId, x.participantUids) })).sort((a, b) => ms(b.savedAt) - ms(a.savedAt))
  const savedIds = new Set(saved.map((x) => x.messageId))
  const myFiles = files.filter((f) => visibleKeys.has(f.conversationKey)).map((f) => ({ ...f, conversationLabel: labelFor(f.convType, f.convId, f.participantUids) }))

  const inboxConversations = [
    ...visible.map((c) => ({
      key: c.id,
      convType: 'conv',
      convId: c.id,
      kind: conversationKind(c),
      private: isPrivate(c),
      memberCount: (c.memberUids || []).length,
      label: conversationKind(c) === 'group' ? groupLabel(c, users, uid) : c.name,
      lastMessage: c.lastMessage,
      lastAt: c.lastMessageAt,
      messageCount: c.messageCount,
      unread: unreadMap[c.id],
      unreadCount: unreadMap[c.id] ? unreadCountOf(c.messageCount, readCount[c.id]) : 0,
    })),
    ...myDms.map((d) => {
      const other = (d.participantUids || []).find((x) => x !== uid)
      const otherUser = users.find((u) => u.id === other)
      return {
        key: d.id,
        convType: 'dm',
        convId: d.id,
        participantUids: d.participantUids,
        label: otherUser ? userLabel(otherUser) : d.participantNames?.[other] || 'Mensaje directo',
        photo: otherUser?.photoDataUrl,
        lastMessage: d.lastMessage,
        lastAt: d.updatedAt,
        messageCount: d.messageCount,
        unread: unreadMap[d.id],
        unreadCount: unreadMap[d.id] ? unreadCountOf(d.messageCount, readCount[d.id]) : 0,
      }
    }),
  ].sort((a, b) => ms(b.lastAt) - ms(a.lastAt))

  const viewCounts = {
    inbox: inboxConversations.filter((c) => c.unread && c.lastMessage).length,
    mentions: myMentions.filter((m) => m.unread).length,
    threads: myThreads.filter((t) => t.unread).length,
  }

  return { unreadMap, visibleKeys, myMentions, myThreads, mySaved, savedIds, myFiles, inboxConversations, viewCounts }
}
