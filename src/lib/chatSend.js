import { sendChannelMessage, sendDmMessage, sendThreadReply, createMentions, indexChatFile } from './firestore'
import { findDriveLink, driveDocType } from './chat'

// The one way a message gets written, whoever sends it: the composer,
// "Reenviar", or a scheduled message going out from someone's open app
// (hooks/useScheduledSender.js). Writes the message, then the small index
// docs that point back at it — @mentions, and conversation files / Drive
// links for Archivos and the 90-day retention.
//
//   convType     'conv' (channel/group) | 'dm'
//   convId       the channel id, or the DM id (dmIdFor)
//   dmParticipants  [{uid, name}, {uid, name}] — DMs only
//   participantUids DMs only, stored on the index docs
//   audienceUids    who a message marked Importante asks to confirm (everyone
//                   in the conversation except the author)
export async function deliverMessage({ convType, convId, dmParticipants, participantUids, conversationLabel, payload, authorUid, authorName, parentId = null, audienceUids = [] }) {
  const ref = parentId
    ? await sendThreadReply(convType, convId, parentId, payload, authorUid, authorName)
    : convType === 'conv'
      ? await sendChannelMessage(convId, payload, authorUid, authorName)
      : await sendDmMessage(convId, dmParticipants, payload, authorUid, authorName)

  const pointer = {
    convType,
    convId,
    conversationKey: convId,
    conversationLabel,
    ...(participantUids ? { participantUids } : {}),
    messageId: ref.id,
    authorName,
    authorUid,
    ...(parentId ? { threadParentId: parentId } : {}),
  }
  const attachment = payload.attachment
  const snippet = (payload.text || (attachment ? '📎 Archivo' : '')).slice(0, 200)

  const snippetText = snippet || (payload.poll ? `📊 ${payload.poll.question}` : '')
  const notified = new Set([authorUid])
  if (convType === 'conv' && payload.mentions?.length) {
    createMentions(payload.mentions, { ...pointer, kind: 'mention', text: snippetText }, authorUid, authorName).catch(() => {})
    payload.mentions.forEach((m) => notified.add(m.uid))
  }
  // Importante: everyone it asks to confirm hears about it, whatever their
  // notification setting for that channel (unless they silenced it).
  if (convType === 'conv' && payload.important) {
    const targets = audienceUids.filter((uid) => !notified.has(uid))
    if (targets.length) createMentions(targets.map((uid) => ({ uid })), { ...pointer, kind: 'important', text: snippetText }, authorUid, authorName).catch(() => {})
    targets.forEach((uid) => notified.add(uid))
  }
  // Responder citando in a channel or group: the quoted person hears about
  // it like a mention (in a DM every message already reaches them).
  const quoted = payload.replyTo?.authorUid
  if (convType === 'conv' && quoted && !notified.has(quoted)) {
    createMentions([{ uid: quoted }], { ...pointer, kind: 'quote', text: snippetText }, authorUid, authorName).catch(() => {})
  }
  if (attachment?.kind === 'image' && !attachment.expired)
    indexChatFile({ ...pointer, kind: 'image', thumbUrl: attachment.thumbUrl, blobId: attachment.blobId, name: attachment.name }).catch(() => {})
  if (attachment?.kind === 'voice' && !attachment.expired) indexChatFile({ ...pointer, kind: 'voice', blobId: attachment.blobId, duration: attachment.duration, name: 'Nota de voz' }).catch(() => {})
  const drive = findDriveLink(payload.text)
  if (drive) indexChatFile({ ...pointer, kind: 'drive', url: drive, name: `${driveDocType(drive)} de Drive` }).catch(() => {})

  return { ref, pointer, snippet }
}
