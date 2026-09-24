// Comunicación's retention policy — how the chat stays inside Firebase's
// free tier (1 GB stored, 20k deletes/day) without a server. Modeled on
// Slack: the heavy stuff expires, the text is the company's memory.
//
//   Text messages ........... kept forever (tiny; decisions and context live here)
//   Images and voice notes .. 90 days, then the file is deleted and the
//                             message shows "Imagen expirada" (like WhatsApp)
//   Official documents ...... never stored here — they're Drive links
//   Call records ............ 7 days (only needed while the call is live)
//   Done reminders .......... deleted once handled
//   Mention/reply pointers .. 90 days
//   Error reports ........... 30 days
//
// Runs once a day from whichever founder opens ADOR OS first (see
// useChatRetention), in small batches so a big backlog never spikes the
// daily quota — anything left over is picked up the next day.
import { claimDailyCleanup, queryOlderThan, queryDoneReminders, expireChatFile, deleteRefs } from './firestore'

export const FILE_RETENTION_DAYS = 90
const CALL_RETENTION_DAYS = 7
const MENTION_RETENTION_DAYS = 90
// Error reports (lib/errorLog.js) are only useful while fresh.
const ERROR_RETENTION_DAYS = 30
const BATCH = 150

const daysAgo = (n) => new Date(Date.now() - n * 86400000)

export async function runChatRetention() {
  if (!(await claimDailyCleanup())) return null
  const report = { files: 0, calls: 0, reminders: 0, mentions: 0, errors: 0 }

  const files = await queryOlderThan('chatFiles', 'createdAt', daysAgo(FILE_RETENTION_DAYS), BATCH)
  for (const f of files) {
    // Drive links cost nothing to keep — only real stored files expire.
    if (f.kind === 'drive') continue
    await expireChatFile(f).catch(() => {})
    report.files++
  }

  const calls = await queryOlderThan('chatCalls', 'createdAt', daysAgo(CALL_RETENTION_DAYS), BATCH)
  await deleteRefs(calls.map((c) => c.ref)).catch(() => {})
  report.calls = calls.length

  const reminders = await queryDoneReminders(BATCH)
  await deleteRefs(reminders.map((r) => r.ref)).catch(() => {})
  report.reminders = reminders.length

  const mentions = await queryOlderThan('chatMentions', 'createdAt', daysAgo(MENTION_RETENTION_DAYS), BATCH)
  await deleteRefs(mentions.map((m) => m.ref)).catch(() => {})
  report.mentions = mentions.length

  const errors = await queryOlderThan('errorLogs', 'createdAt', daysAgo(ERROR_RETENTION_DAYS), BATCH)
  await deleteRefs(errors.map((e) => e.ref)).catch(() => {})
  report.errors = errors.length

  return report
}
