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
export async function deliverMessage({ convType, convId, dmParticipants, participantUids, conversationLabel, payload, authorUid, authorName, parentId = null }) {
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

  if (convType === 'conv' && payload.mentions?.length) createMentions(payload.mentions, { ...pointer, kind: 'mention', text: snippet }, authorUid, authorName).catch(() => {})
  if (attachment?.kind === 'image' && !attachment.expired)
    indexChatFile({ ...pointer, kind: 'image', thumbUrl: attachment.thumbUrl, blobId: attachment.blobId, name: attachment.name }).catch(() => {})
  if (attachment?.kind === 'voice' && !attachment.expired) indexChatFile({ ...pointer, kind: 'voice', blobId: attachment.blobId, duration: attachment.duration, name: 'Nota de voz' }).catch(() => {})
  const drive = findDriveLink(payload.text)
  if (drive) indexChatFile({ ...pointer, kind: 'drive', url: drive, name: `${driveDocType(drive)} de Drive` }).catch(() => {})

  return { ref, pointer, snippet }
}
