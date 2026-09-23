import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  limitToLast,
  increment,
  deleteField,
  runTransaction,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { app, isFirebaseConfigured } from '../firebase'
import { describeTaskChange } from './workspace'
import { describeKnowledgeChange } from './knowledge'

// Central data model. Every entity references related entities by ID —
// this is the substrate the rest of ADOR OS builds on.
//
//   /users/{userId}                 profile, role, preferences
//   /clients/{clientId}             SPC/SP records — see clientStages.js for
//                                    pipeline stages. Holds its own payment
//                                    (pago1/pago2) and intervention-progress
//                                    fields rather than syncing to separate
//                                    collections — see CLAUDE.md §7/§8 for why.
//     /clients/{clientId}/history/{eventId}    timeline entries
//     /clients/{clientId}/documents/{docId}    uploaded-file metadata
//   /proyectosInternos/{id}          Workspace's internal-work container —
//                                    Intervenciones are NOT stored here or
//                                    anywhere else; they're derived live from
//                                    clients where stage === 'intervencion_activa'
//                                    (see lib/workspace.js header for why)
//   /tasks/{taskId}                 references workstreamId ('client:{id}' or
//                                    'proyecto:{id}', see lib/workspace.js),
//                                    assignedTo (array of userIds)
//   /decisions/{decisionId}         references clientId or proyectoId (optional)
//   /meetings/{meetingId}           references clientId
//   /notifications/{notificationId} references userId
export const COLLECTIONS = {
  users: 'users',
  clients: 'clients',
  tasks: 'tasks',
  decisions: 'decisions',
  meetings: 'meetings',
  notifications: 'notifications',
  expenses: 'expenses',
  incomes: 'incomes',
  settings: 'settings',
  proyectosInternos: 'proyectosInternos',
  objetivos: 'objetivos',
  experimentos: 'experimentos',
  notes: 'notes',
  directoryPeople: 'directoryPeople',
  directoryTeams: 'directoryTeams',
  knowledgeDocs: 'knowledgeDocs',
  knowledgeSections: 'knowledgeSections',
  news: 'news',
  communityPosts: 'communityPosts',
  chatChannels: 'chatChannels',
  chatDms: 'chatDms',
  chatCalls: 'chatCalls',
  chatMentions: 'chatMentions',
  chatSaved: 'chatSaved',
  chatFiles: 'chatFiles',
  chatBlobs: 'chatBlobs',
  chatTyping: 'chatTyping',
  presence: 'presence',
}

export const db = isFirebaseConfigured ? getFirestore(app) : null

// Generic live-collection subscription. Returns [] until Firestore is
// configured and the query resolves — no module should assume data exists.
function subscribeToCollection(collectionName, constraints, onData) {
  if (!db) return () => {}
  const ref = collection(db, collectionName)
  const q = constraints.length ? query(ref, ...constraints) : ref
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    },
    (error) => {
      console.error(`Firestore subscription to "${collectionName}" failed:`, error.message)
    }
  )
}

export function subscribeClients(onData) {
  return subscribeToCollection(COLLECTIONS.clients, [orderBy('createdAt', 'desc')], onData)
}

// `assignedTo` is an array of userIds (a task can have up to a few
// Asociados on it) — array-contains matches Home's "Tareas Hoy" against it.
export function subscribeTasksForUser(userId, onData) {
  return subscribeToCollection(COLLECTIONS.tasks, [where('assignedTo', 'array-contains', userId)], onData)
}

// Tasks someone else assigned to `userId` that they haven't accepted or
// rejected yet — powers AssignmentConfirmGate.jsx's blocking popup. See
// applyTaskUpdate/createTask for how pendingConfirmations gets populated.
export function subscribeAssignedPending(userId, onData) {
  return subscribeToCollection(COLLECTIONS.tasks, [where('pendingConfirmations', 'array-contains', userId)], onData)
}

// Workspace's shared board — every task across the 3 founders, not just the
// signed-in user's own (that's what subscribeTasksForUser is for, used by
// Home's "Tareas Hoy").
export function subscribeAllTasks(onData) {
  return subscribeToCollection(COLLECTIONS.tasks, [], onData)
}

// `actorUserId` (optional — omitted by any call site that doesn't yet know
// it) is only used to figure out which of `data.assignedTo` are *other*
// people, so they land in `pendingConfirmations` and need to accept before
// the task counts as theirs — see AssignmentConfirmGate.jsx and CLAUDE.md
// §20. Assigning yourself never needs confirmation.
export function createTask(data, actorName, actorUserId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  const assignedTo = data.assignedTo || []
  const pendingConfirmations = actorUserId ? assignedTo.filter((uid) => uid !== actorUserId) : []
  return addDoc(collection(db, COLLECTIONS.tasks), {
    status: 'por_hacer',
    ...data,
    pendingConfirmations,
    lastAssignedBy: pendingConfirmations.length > 0 ? actorName : null,
    createdBy: actorName,
    createdAt: serverTimestamp(),
  }).then(async (ref) => {
    await addTaskHistoryEvent(ref.id, `Tarea creada por ${actorName}`)
    return ref
  })
}

export function updateTask(taskId, data) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.tasks, taskId), data)
}

export function toggleTaskComplete(task, actorName) {
  const completing = task.status !== 'completado'
  return updateTask(task.id, {
    status: completing ? 'completado' : 'por_hacer',
    completedAt: completing ? serverTimestamp() : null,
  }).then(() => addTaskHistoryEvent(task.id, `${completing ? 'Marcada como completada' : 'Reabierta'} por ${actorName}`))
}

export function deleteTask(taskId) {
  if (!db) return Promise.resolve()
  return deleteDoc(doc(db, COLLECTIONS.tasks, taskId))
}

// Read-only activity trail per task — same pattern as Clientes' history
// (see addHistoryEvent above), just without a manual "log an interaction"
// form: every entry here is auto-generated by createTask/toggleTaskComplete/
// applyTaskUpdate, never hand-typed.
export function subscribeTaskHistory(taskId, onData) {
  if (!db) return () => {}
  const ref = collection(db, COLLECTIONS.tasks, taskId, 'history')
  return onSnapshot(
    query(ref, orderBy('createdAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error('Firestore subscription to task history failed:', error.message)
  )
}

export function addTaskHistoryEvent(taskId, description) {
  if (!db) return Promise.resolve()
  return addDoc(collection(db, COLLECTIONS.tasks, taskId, 'history'), {
    description,
    createdAt: serverTimestamp(),
  })
}

// Every inline cell edit (Lista's TaskRow, the Task Detail Panel, Kanban's
// drag-and-drop) routes through this instead of calling updateTask directly,
// so every change — no matter which surface it came from — leaves the same
// activity trail.
// `completedAt` rides alongside any status change routed through here
// (Lista's status pill, Task Detail Panel, Kanban drag-and-drop) so
// "tasks completed this week" (see lib/weeklySummary.js) has a real
// timestamp to filter on instead of guessing from `createdAt`.
//
// Takes the full `task` (not just its id) because assigning a *new* person
// needs to diff against the task's current `assignedTo` to know who's
// actually new — only newly-added people (never the actor themselves) go
// into `pendingConfirmations`, existing assignees already confirmed stay
// confirmed. See createTask's pendingConfirmations comment / CLAUDE.md §20.
export function applyTaskUpdate(task, data, actorUserId, actorName) {
  const patch = { ...data }
  if ('status' in data) patch.completedAt = data.status === 'completado' ? serverTimestamp() : null
  if ('assignedTo' in data) {
    const prevAssigned = task.assignedTo || []
    const prevPending = task.pendingConfirmations || []
    const newlyAdded = data.assignedTo.filter((uid) => !prevAssigned.includes(uid) && uid !== actorUserId)
    patch.pendingConfirmations = Array.from(new Set([...prevPending.filter((uid) => data.assignedTo.includes(uid)), ...newlyAdded]))
    if (newlyAdded.length > 0) patch.lastAssignedBy = actorName
  }
  return updateTask(task.id, patch).then(() => addTaskHistoryEvent(task.id, `${describeTaskChange(data)} — ${actorName}`))
}

// The Accept/Reject response to AssignmentConfirmGate.jsx's blocking popup.
// Accepting only clears `userId` out of pendingConfirmations — they stay in
// `assignedTo`. Rejecting removes them from both, so the task goes back to
// reading as "not theirs" everywhere (Hoy, Personal, the team board's
// avatar stack) without deleting the task itself.
export function respondToAssignment(task, userId, accept, actorName) {
  const pendingConfirmations = (task.pendingConfirmations || []).filter((uid) => uid !== userId)
  const patch = accept
    ? { pendingConfirmations }
    : { pendingConfirmations, assignedTo: (task.assignedTo || []).filter((uid) => uid !== userId) }
  return updateTask(task.id, patch).then(() =>
    addTaskHistoryEvent(task.id, accept ? `${actorName} confirmó la asignación` : `${actorName} rechazó la asignación`)
  )
}

// ---- Workspace: Proyectos Internos ----
// Intervenciones deliberately have no equivalent create/update/delete here —
// they're derived from Clientes, never authored directly in Workspace.

export function subscribeProyectosInternos(onData) {
  return subscribeToCollection(COLLECTIONS.proyectosInternos, [orderBy('createdAt', 'desc')], onData)
}

export function createProyectoInterno(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.proyectosInternos), {
    ...data,
    createdBy: actorName,
    createdAt: serverTimestamp(),
  })
}

export function createDecision(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.decisions), {
    ...data,
    registeredBy: actorName,
    decidedAt: serverTimestamp(),
  })
}

export function subscribeDecisions(onData) {
  return subscribeToCollection(COLLECTIONS.decisions, [], onData)
}

export function subscribeMeetings(onData) {
  return subscribeToCollection(COLLECTIONS.meetings, [], onData)
}

export function subscribeNotificationsForUser(userId, onData) {
  return subscribeToCollection(
    COLLECTIONS.notifications,
    [where('userId', '==', userId)],
    onData
  )
}

// Profile fields that live outside Firebase Auth (which only holds
// displayName/photoURL) — e.g. birthday, last-used Clientes view. Stored at
// users/{uid}, merged so partial updates never clobber other fields.
export async function getUserProfile(userId) {
  if (!db || !userId) return null
  const snap = await getDoc(doc(db, COLLECTIONS.users, userId))
  return snap.exists() ? snap.data() : null
}

export function saveUserProfile(userId, data) {
  if (!db || !userId) return Promise.resolve()
  return setDoc(doc(db, COLLECTIONS.users, userId), data, { merge: true })
}

// Gates the "Conoce ADOR OS" first-login walkthrough — stored on the same
// profile doc (not localStorage) so it's per-account, not per-device: once
// seen on one machine, a new session on another doesn't show it again.
// Re-running it from Configuración just re-opens the overlay locally and
// writes this again on close, which is harmless (idempotent).
export function markOnboardingSeen(userId) {
  return saveUserProfile(userId, { onboardingSeenAt: serverTimestamp() })
}

// There's no Firebase Admin SDK wired in (no backend), so we can't list
// every Auth user from the client. Instead each founder's own session
// self-registers a lightweight directory entry on login (see App.jsx) —
// enough to populate "Asociado responsable" pickers for a 3-person team.
export function subscribeUsers(onData) {
  return subscribeToCollection(COLLECTIONS.users, [], onData)
}

export function subscribeUserProfile(userId, onData) {
  if (!db || !userId) return () => {}
  return onSnapshot(
    doc(db, COLLECTIONS.users, userId),
    (snap) => onData(snap.exists() ? snap.data() : null),
    (error) => console.error('Firestore subscription to user profile failed:', error.message)
  )
}

// ---- Clientes (SPC/SP) ----

// Human-readable sequential ID (e.g. "ADR-0007"), separate from the
// Firestore doc id (a long random string, never shown in the UI). Uses a
// transaction on a single shared counter doc — settings/counters — same
// "one shared doc" pattern as settings/finanzas (CLAUDE.md §9), rather than
// deriving a code from the doc id, so codes stay short and strictly
// sequential even under concurrent creates. The prefix is "ADR" (the firm),
// not "SPC", since the code is assigned once at creation and must stay
// valid after a client converts from SPC to SP.
async function getNextClientCode() {
  const counterRef = doc(db, COLLECTIONS.settings, 'counters')
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const current = snap.exists() ? snap.data().clientSeq || 0 : 0
    const value = current + 1
    tx.set(counterRef, { clientSeq: value }, { merge: true })
    return value
  })
  return `ADR-${String(next).padStart(4, '0')}`
}

export async function createClient(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  const code = await getNextClientCode()
  return addDoc(collection(db, COLLECTIONS.clients), {
    ...data,
    code,
    stageEnteredAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }).then(async (ref) => {
    await addHistoryEvent(ref.id, {
      type: 'created',
      description: `SPC creado por ${actorName}`,
    })
    return ref.id
  })
}

export function updateClient(clientId, data) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.clients, clientId), data)
}

export async function deleteClient(clientId) {
  if (!db) return
  for (const sub of ['history', 'documents']) {
    const snap = await getDocs(collection(db, COLLECTIONS.clients, clientId, sub))
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  }
  await deleteDoc(doc(db, COLLECTIONS.clients, clientId))
}

// Moves a client to a new stage, stamps stageEnteredAt for the "days in
// stage" indicator, and logs the transition (including the SPC→SP moment
// when a client first reaches Intervención Activa).
export async function moveClientStage(client, newStageId, actorName) {
  const wasSP = client.stage === 'intervencion_activa'
  const becomesSP = newStageId === 'intervencion_activa'
  await updateClient(client.id, { stage: newStageId, stageEnteredAt: serverTimestamp() })
  if (!wasSP && becomesSP) {
    await addHistoryEvent(client.id, {
      type: 'converted',
      description: `${client.name} pasó de SPC a SP — Intervención Activa iniciada por ${actorName}`,
    })
  } else {
    await addHistoryEvent(client.id, {
      type: 'stage_change',
      description: `Etapa cambiada por ${actorName}`,
      meta: { from: client.stage, to: newStageId },
    })
  }
}

// Lost is a flag on top of whatever stage the client froze at, not a STAGES
// entry — see lib/clientStages.js for why. The client keeps its `stage` so
// restoring it (a real correction, e.g. "se marcó por error") drops it back
// exactly where the pipeline left off, no data lost.
export async function markClientLost(client, reason, actorName) {
  await updateClient(client.id, { lost: true, lostReason: reason, lostAt: serverTimestamp() })
  await addHistoryEvent(client.id, {
    type: 'lost',
    description: `Marcado como perdido por ${actorName} — ${reason}`,
  })
}

export async function restoreClient(client, actorName) {
  await updateClient(client.id, { lost: false, lostReason: null, lostAt: null })
  await addHistoryEvent(client.id, {
    type: 'restored',
    description: `Restaurado al pipeline por ${actorName}`,
  })
}

export function subscribeClientHistory(clientId, onData) {
  if (!db) return () => {}
  const ref = collection(db, COLLECTIONS.clients, clientId, 'history')
  return onSnapshot(
    query(ref, orderBy('createdAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error('Firestore subscription to client history failed:', error.message)
  )
}

export function addHistoryEvent(clientId, event) {
  if (!db) return Promise.resolve()
  return addDoc(collection(db, COLLECTIONS.clients, clientId, 'history'), {
    ...event,
    createdAt: serverTimestamp(),
  })
}

export function subscribeClientDocuments(clientId, onData) {
  if (!db) return () => {}
  const ref = collection(db, COLLECTIONS.clients, clientId, 'documents')
  return onSnapshot(
    query(ref, orderBy('uploadedAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error('Firestore subscription to client documents failed:', error.message)
  )
}

export function addDocumentMeta(clientId, meta, actorName) {
  if (!db) return Promise.resolve()
  return addDoc(collection(db, COLLECTIONS.clients, clientId, 'documents'), {
    ...meta,
    uploadedAt: serverTimestamp(),
  }).then(() =>
    addHistoryEvent(clientId, {
      type: 'document',
      description: `${meta.name} subido por ${actorName}`,
    })
  )
}

// Payment dates are plain 'YYYY-MM-DD' strings (not Firestore Timestamps) so
// they stay simple to bind to a <input type="date"> and to edit manually —
// these are calendar dates the team enters, not exact server-clock events.
export async function registerPayment(client, key, amount, actorName) {
  const other = key === 'pago1' ? 'pago2' : 'pago1'
  await updateClient(client.id, {
    [key]: {
      ...client[key],
      amount,
      status: 'Recibido',
      date: client[key]?.date || new Date().toISOString().slice(0, 10),
    },
  })
  await addHistoryEvent(client.id, {
    type: 'payment',
    description: `${key === 'pago1' ? 'Pago 1 (60%)' : 'Pago 2 (40%)'} recibido — registrado por ${actorName}`,
  })
  const otherReceived = client[other]?.status === 'Recibido'
  if (otherReceived) {
    await addHistoryEvent(client.id, {
      type: 'payment_complete',
      description: 'Intervención Pagada — ambos pagos recibidos',
    })
  }
}

// ---- Finanzas ----
// Automatic income (SP payments marked Recibido) is derived from `clients`
// directly — see useFinanceData.js — so `incomes` here only holds manual
// entries (income not tied to a client payment record).

export function subscribeExpenses(onData) {
  return subscribeToCollection(COLLECTIONS.expenses, [orderBy('date', 'desc')], onData)
}

export function addExpense(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.expenses), {
    ...data,
    registeredBy: actorName,
    createdAt: serverTimestamp(),
  })
}

export function subscribeManualIncomes(onData) {
  return subscribeToCollection(COLLECTIONS.incomes, [orderBy('date', 'desc')], onData)
}

export function addManualIncome(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.incomes), {
    ...data,
    registeredBy: actorName,
    createdAt: serverTimestamp(),
  })
}

// Single shared doc rather than a collection — one quarterly target at a
// time, editable inline from the Finanzas dashboard.
export function subscribeFinanceSettings(onData) {
  if (!db) return () => {}
  return onSnapshot(
    doc(db, COLLECTIONS.settings, 'finanzas'),
    (snap) => onData(snap.exists() ? snap.data() : {}),
    (error) => console.error('Firestore subscription to finance settings failed:', error.message)
  )
}

export function setQuarterlyTarget(amount) {
  if (!db) return Promise.resolve()
  return setDoc(doc(db, COLLECTIONS.settings, 'finanzas'), { quarterlyTarget: amount }, { merge: true })
}

export function setAnnualTarget(amount) {
  if (!db) return Promise.resolve()
  return setDoc(doc(db, COLLECTIONS.settings, 'finanzas'), { annualTarget: amount }, { merge: true })
}

// Manually entered starting point for the runway projection (RunwayCard) —
// there's no bank-balance integration, so this is the one figure a founder
// has to type in themselves, same "one shared doc, edited inline" pattern
// as quarterlyTarget.
export function setCashBalance(amount) {
  if (!db) return Promise.resolve()
  return setDoc(doc(db, COLLECTIONS.settings, 'finanzas'), { cashBalance: amount }, { merge: true })
}

// ---- Objetivos ----
// One flat collection, no per-quarter subcollections — the module filters
// client-side by `quarter` (a quarterKey string, see lib/finance.js), same
// "just filter the small live subscription" approach used everywhere else
// in this app rather than adding server-side query constraints for a
// 3-founder-scale dataset.

export function subscribeObjetivos(onData) {
  return subscribeToCollection(COLLECTIONS.objetivos, [], onData)
}

export function createObjetivo(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.objetivos), {
    ...data,
    completed: false,
    createdBy: actorName,
    createdAt: serverTimestamp(),
  })
}

export function updateObjetivo(id, data) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.objetivos, id), data)
}

export function deleteObjetivo(id) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.objetivos, id))
}

// Only one objetivo can be the North Star at a time — a batch flips the
// previous holder off (if any) and the new one on atomically, so the UI
// never briefly shows two (or zero) starred objetivos mid-write.
export function setNorthStar(objetivoId, previousNorthStarId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  const batch = writeBatch(db)
  if (previousNorthStarId && previousNorthStarId !== objetivoId) {
    batch.update(doc(db, COLLECTIONS.objetivos, previousNorthStarId), { isNorthStar: false })
  }
  batch.update(doc(db, COLLECTIONS.objetivos, objetivoId), { isNorthStar: true })
  return batch.commit()
}

// The Friday 3-minute sync — deliberately just the *latest* state on the
// objetivo doc, no history subcollection yet (same "one target at a time"
// precedent as Finanzas' quarterlyTarget — add real history if it's ever
// needed). `progressValue` only applies to type:'kpi' objetivos with
// metric:'custom' (the only manually-tracked number in this module).
export function submitCheckin(objetivoId, { confidence, blocker, progressValue }, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  const patch = {
    confidence,
    blocker: blocker || null,
    lastCheckinAt: serverTimestamp(),
    lastCheckinBy: actorName,
  }
  if (progressValue !== undefined) patch.currentValue = progressValue
  return updateDoc(doc(db, COLLECTIONS.objetivos, objetivoId), patch)
}

// ---- Experimentos (validation log) ----
// A separate flat collection, not a subcollection of objetivos — an
// experiment's `objetivoId` link is optional (some bets aren't tied to a
// specific KR yet), so nesting it under one objetivo doc wouldn't fit every
// case. Same "small live subscription, filter client-side" approach as
// objetivos itself.

export function subscribeExperimentos(onData) {
  return subscribeToCollection(COLLECTIONS.experimentos, [], onData)
}

export function createExperimento(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.experimentos), {
    ...data,
    status: 'pendiente',
    result: null,
    createdBy: actorName,
    createdAt: serverTimestamp(),
  })
}

export function updateExperimento(id, data) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.experimentos, id), data)
}

export function deleteExperimento(id) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.experimentos, id))
}

// ---- Conocimiento: quick-capture notes ----
// The "cuaderno digital" — a fast, always-reachable capture point (global
// "+" button, see GlobalCapture.jsx) so a fleeting thought never has to wait
// for the right module to be open. Every note is saved immediately with a
// locally-guessed `category` (lib/notes.js's suggestCategory — keyword
// rules, no LLM call, see the 2026-09-16 conversation on why); the note
// itself is the source of truth until someone actually confirms turning it
// into a real task/etc., which is a deliberate v1 scope cut — see
// ConocimientoModule.jsx for which conversions are actually wired up.
export function subscribeNotes(onData) {
  return subscribeToCollection(COLLECTIONS.notes, [orderBy('createdAt', 'desc')], onData)
}

export function createNote(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.notes), {
    ...data,
    status: 'pendiente',
    createdBy: actorName,
    createdAt: serverTimestamp(),
  })
}

export function updateNote(noteId, data) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.notes, noteId), data)
}

export function deleteNote(noteId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.notes, noteId))
}

// Same find-or-create "General" Proyecto Interno pattern Workspace's
// InlineAddTask uses (ListaView.jsx) for its synthetic fallback workstream —
// done here as an explicit lookup since Conocimiento doesn't already have
// the live proyectosInternos list in hand the way Workspace does.
export async function findOrCreateGeneralProyecto(actorName) {
  if (!db) throw new Error('Firestore no configurado')
  const snap = await getDocs(query(collection(db, COLLECTIONS.proyectosInternos), where('name', '==', 'General')))
  if (!snap.empty) return snap.docs[0].id
  const ref = await createProyectoInterno({ name: 'General' }, actorName)
  return ref.id
}

// ---- Directorio: people & teams ----
// Deliberately decoupled from /users/{uid} — that collection is one row per
// real Firebase Auth account (self-registered on login, see App.jsx), while
// a Directorio entry is an informational profile for anyone at ADOR,
// including people who may never get their own ADOR OS login. Photos reuse
// the same resizeImageToDataUrl → photoDataUrl base64 pattern ProfileModal
// already established (lib/image.js) — no Firebase Storage dependency.
export function subscribeDirectoryPeople(onData) {
  return subscribeToCollection(COLLECTIONS.directoryPeople, [orderBy('createdAt', 'asc')], onData)
}

export function createDirectoryPerson(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.directoryPeople), {
    ...data,
    createdBy: actorName,
    createdAt: serverTimestamp(),
  })
}

export function updateDirectoryPerson(personId, data) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.directoryPeople, personId), data)
}

export function deleteDirectoryPerson(personId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.directoryPeople, personId))
}

export function subscribeDirectoryTeams(onData) {
  return subscribeToCollection(COLLECTIONS.directoryTeams, [orderBy('createdAt', 'asc')], onData)
}

export function createDirectoryTeam(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.directoryTeams), {
    ...data,
    createdBy: actorName,
    createdAt: serverTimestamp(),
  })
}

export function updateDirectoryTeam(teamId, data) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.directoryTeams, teamId), data)
}

export function deleteDirectoryTeam(teamId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.directoryTeams, teamId))
}

// ---- Conocimiento: wiki documents ----
// Flat per-category documents (no nesting) — see lib/knowledge.js for the
// fixed category list and the hand-rolled Markdown renderer. Admin-gated
// writes, same isAdmin() check as Directorio (lib/permissions.js).
export function subscribeKnowledgeDocs(onData) {
  return subscribeToCollection(COLLECTIONS.knowledgeDocs, [orderBy('updatedAt', 'desc')], onData)
}

export function createKnowledgeDoc(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.knowledgeDocs), {
    ...data,
    createdBy: actorName,
    createdAt: serverTimestamp(),
    updatedBy: actorName,
    updatedAt: serverTimestamp(),
  }).then((ref) => addKnowledgeHistoryEvent(ref.id, `Documento creado por ${actorName}`).then(() => ref))
}

// `previous` (the doc before this edit) is only used to describe what
// changed for the Historial entry — DocEditor always saves
// title/subcategory/content together (no per-field inline editing like
// Lista's cells), so there's no patch-shape to read the change from the
// way describeTaskChange does; see describeKnowledgeChange.
export function updateKnowledgeDoc(docId, data, actorName, previous) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.knowledgeDocs, docId), {
    ...data,
    updatedBy: actorName,
    updatedAt: serverTimestamp(),
  }).then(() => addKnowledgeHistoryEvent(docId, `${describeKnowledgeChange(previous, data)} — ${actorName}`))
}

export function deleteKnowledgeDoc(docId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.knowledgeDocs, docId))
}

// Read-only activity trail per document — same pattern as Clientes'/Tasks'
// history (see addHistoryEvent/addTaskHistoryEvent above): every entry is
// auto-generated by createKnowledgeDoc/updateKnowledgeDoc, never hand-typed.
export function subscribeKnowledgeDocHistory(docId, onData) {
  if (!db) return () => {}
  const ref = collection(db, COLLECTIONS.knowledgeDocs, docId, 'history')
  return onSnapshot(
    query(ref, orderBy('createdAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error('Firestore subscription to knowledge doc history failed:', error.message)
  )
}

export function addKnowledgeHistoryEvent(docId, description) {
  if (!db) return Promise.resolve()
  return addDoc(collection(db, COLLECTIONS.knowledgeDocs, docId, 'history'), {
    description,
    createdAt: serverTimestamp(),
  })
}

// Admin-created subcategories ("secciones") layered on top of the fixed
// 4-category tree — see lib/knowledge.jsx's mergeSections(). categoryId
// references one of the 4 fixed top-level ids ('estrategia', 'marketing',
// 'operaciones', 'compania'), never a Firestore doc id of its own.
export function subscribeKnowledgeSections(onData) {
  return subscribeToCollection(COLLECTIONS.knowledgeSections, [orderBy('createdAt', 'asc')], onData)
}

export function createKnowledgeSection(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.knowledgeSections), {
    ...data,
    createdBy: actorName,
    createdAt: serverTimestamp(),
  })
}

// ---- News: formal, team-authored announcements ----
// Deliberately not a scraped/external feed (CLAUDE.md's scoping note on
// this module is explicit: newsroom-style posts the team writes, not a
// news-API integration) and deliberately not Comunidad's informal-post
// concept — a headline + a Markdown body, reusing lib/knowledge.jsx's
// renderer rather than building a second one. `pinned` posts sort first
// (a manual editorial call, not derived) so a founder can keep an
// important announcement at the top past newer ones. Admin-gated writes,
// same isAdmin() check as Directorio/Conocimiento.
export function subscribeNews(onData) {
  return subscribeToCollection(COLLECTIONS.news, [orderBy('createdAt', 'desc')], onData)
}

export function createNewsPost(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.news), {
    ...data,
    createdBy: actorName,
    createdAt: serverTimestamp(),
    updatedBy: actorName,
    updatedAt: serverTimestamp(),
  })
}

export function updateNewsPost(postId, data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.news, postId), {
    ...data,
    updatedBy: actorName,
    updatedAt: serverTimestamp(),
  })
}

export function deleteNewsPost(postId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.news, postId))
}

// ---- Comunidad: informal team-pulse posts ----
// Lives in the same module/nav slot as News now (one "Anuncios"/"Comunidad"
// tab switcher — direct user request to merge them, since the only real
// difference was tone, not audience), but is a deliberately different
// collection and write model: anyone with app access can post and react
// here (no isAdmin gate) — that's the whole point of "informal," unlike
// News/Conocimiento's admin-only writes. `reactions` is a map of emoji to
// an array of uids (not just a count) so toggling is idempotent per user
// and the UI can show "you reacted" state.
export function subscribeCommunityPosts(onData) {
  return subscribeToCollection(COLLECTIONS.communityPosts, [orderBy('createdAt', 'desc')], onData)
}

export function createCommunityPost(text, actorUid, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.communityPosts), {
    text,
    authorUid: actorUid,
    authorName: actorName,
    reactions: {},
    createdAt: serverTimestamp(),
  })
}

// LinkedIn-style single-reaction-per-person: picking a new reaction clears
// whatever the user had before (a person can be "🎉" on a post, never
// "🎉" AND "❤️" at once). `previousEmoji` is read off the client's already-
// subscribed post data, so this never needs a read-then-write round trip.
// Clicking the same emoji already active un-reacts (removes it, adds
// nothing) — same as LinkedIn's toggle-off-by-clicking-Like-again.
export function setCommunityReaction(postId, emoji, uid, previousEmoji) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  const updates = {}
  if (previousEmoji && previousEmoji !== emoji) updates[`reactions.${previousEmoji}`] = arrayRemove(uid)
  updates[`reactions.${emoji}`] = emoji === previousEmoji ? arrayRemove(uid) : arrayUnion(uid)
  return updateDoc(doc(db, COLLECTIONS.communityPosts, postId), updates)
}

export function deleteCommunityPost(postId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.communityPosts, postId))
}

// ---- Chat (Comunicación): DMs, canales, grupos ----
// Real-time messaging reusing the exact same onSnapshot pattern as every
// other live list in this app — no chat SDK/library. Three kinds of
// conversation (see lib/chat.js and CLAUDE.md §34 for the architecture):
//   - DMs: `chatDms/{dmIdFor(a,b)}` — private between exactly two people.
//   - Canales: `chatChannels/{id}` with kind 'channel' — a permanent space
//     for an area/function. `visibility: 'public'` (everyone in ADOR,
//     implicitly a member) or 'private' (`memberUids`, invitation only).
//   - Grupos: `chatChannels/{id}` with kind 'group' — an ad-hoc private
//     conversation between a few people, not a permanent area. Can be
//     promoted to a channel (convertGroupToChannel) once it turns recurring.
// Channels and groups share one collection on purpose: same messages
// subcollection, same unread tracking, same composer — they differ only
// in how they're listed and who can see them.
export function subscribeChatChannels(onData) {
  return subscribeToCollection(COLLECTIONS.chatChannels, [orderBy('createdAt', 'asc')], onData)
}

export function createChatChannel({ name, description = '', kind = 'channel', visibility = 'public', memberUids = [] }, actorUid, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  const members = Array.from(new Set([actorUid, ...memberUids]))
  return addDoc(collection(db, COLLECTIONS.chatChannels), {
    name,
    description,
    kind,
    visibility: kind === 'group' ? 'private' : visibility,
    // Public channels don't track members — everyone in ADOR is in them
    // automatically. Stored anyway (as the creator) so flipping a channel
    // to private later never leaves it with zero members.
    memberUids: members,
    createdBy: actorName,
    createdByUid: actorUid,
    createdAt: serverTimestamp(),
  })
}

export function updateChatChannel(channelId, patch) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.chatChannels, channelId), patch)
}

export function addChannelMembers(channelId, uids) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.chatChannels, channelId), { memberUids: arrayUnion(...uids) })
}

export function removeChannelMember(channelId, uid) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.chatChannels, channelId), { memberUids: arrayRemove(uid) })
}

export function convertGroupToChannel(channelId, name, visibility) {
  return updateChatChannel(channelId, { kind: 'channel', name, visibility })
}

// A message is `{text, attachment?, call?}`:
//   attachment: {kind:'image', dataUrl, name} — a *conversation* file,
//     compressed into the message doc itself (no Storage). Official
//     documents are never uploaded here: they live in Google Drive and are
//     shared as a Drive link, which the UI renders as its own card.
//   call: {type:'audio'|'video', url} — a Google Meet invitation.
// Accepts a bare string too, for callers that only ever send text.
function messageFields(payload) {
  const p = typeof payload === 'string' ? { text: payload } : payload
  const fields = { text: p.text || '' }
  if (p.attachment) fields.attachment = p.attachment
  if (p.call) fields.call = p.call
  if (p.mentions?.length) {
    fields.mentions = p.mentions
    fields.mentionUids = p.mentions.map((m) => m.uid)
  }
  return fields
}

// One-line preview stored on the conversation doc itself (`lastMessage`),
// so Inbox and the bell can show "Leonardo: Ya terminé el análisis…"
// without opening every conversation's message history.
function previewOf(payload, authorUid, authorName) {
  const p = typeof payload === 'string' ? { text: payload } : payload
  let text = (p.text || '').slice(0, 140)
  if (!text && p.call) text = p.call.type === 'video' ? '📞 Videollamada' : '📞 Llamada'
  if (!text && p.attachment?.kind === 'image') text = '📷 Imagen'
  if (!text && p.attachment?.kind === 'voice') text = '🎤 Nota de voz'
  return { text, authorUid, authorName }
}

// Messages live at chatChannels/{id}/messages (channels + groups) or
// chatDms/{id}/messages (DMs). `convType` is 'conv' or 'dm' everywhere in
// the newer chat code so one set of functions serves both.
//
// A thread's replies live one level deeper, at .../messages/{parentId}/replies
// — a subcollection rather than a `threadId` field on messages, because
// filtering replies out of the main timeline would need `where` + `orderBy`
// on two fields, i.e. a composite index created by hand in the console.
function messagesCol(convType, convId, parentId) {
  const base = collection(db, convType === 'dm' ? COLLECTIONS.chatDms : COLLECTIONS.chatChannels, convId, 'messages')
  return parentId ? collection(base, parentId, 'replies') : base
}

// Only the most recent `count` messages are listened to — a long-running
// channel would otherwise stream its whole history (images included) every
// time it's opened. "Cargar anteriores" in the thread just raises `count`.
export function subscribeMessages(convType, convId, count, onData, parentId) {
  if (!db) return () => {}
  return onSnapshot(
    query(messagesCol(convType, convId, parentId), orderBy('createdAt', 'asc'), limitToLast(count)),
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error('Firestore subscription to chat messages failed:', error.message)
  )
}

// Same emoji → [uids] map shape as Comunidad's reactions, but multiple
// reactions per person are allowed here (Slack-style), so each emoji
// toggles independently.
export function toggleMessageReaction(convType, convId, messageId, emoji, uid, alreadyReacted, parentId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(messagesCol(convType, convId, parentId), messageId), { [`reactions.${emoji}`]: alreadyReacted ? arrayRemove(uid) : arrayUnion(uid) })
}

export function subscribeChannelMessages(channelId, onData) {
  if (!db) return () => {}
  const ref = collection(db, COLLECTIONS.chatChannels, channelId, 'messages')
  return onSnapshot(
    query(ref, orderBy('createdAt', 'asc')),
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error('Firestore subscription to channel messages failed:', error.message)
  )
}

// Also bumps the channel doc's own `lastMessageAt` (separate from the
// message's own `createdAt`) so the sidebar can show an unread indicator
// without subscribing to every channel's full message history just to
// check "is there anything newer than what I've read" — see
// markChatRead()/`chatLastRead` below.
export function sendChannelMessage(channelId, payload, uid, name) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.chatChannels, channelId, 'messages'), {
    ...messageFields(payload),
    authorUid: uid,
    authorName: name,
    createdAt: serverTimestamp(),
  }).then((ref) =>
    updateDoc(doc(db, COLLECTIONS.chatChannels, channelId), { lastMessageAt: serverTimestamp(), lastMessage: previewOf(payload, uid, name) }).then(() => ref)
  )
}

export function updateChannelMessage(channelId, messageId, text) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.chatChannels, channelId, 'messages', messageId), { text, editedAt: serverTimestamp() })
}

export function deleteChannelMessage(channelId, messageId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.chatChannels, channelId, 'messages', messageId))
}

// A DM's id is the two participants' uids, sorted and joined — deterministic
// on purpose, so opening a conversation with someone never needs a query to
// find "does a DM already exist between us," just a direct doc lookup/write.
export function dmIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join('_')
}

// One doc per DM pair, keyed by dmIdFor() — lets `subscribeMyDms` list only
// conversations you're actually part of (`array-contains`), instead of
// rendering every teammate as a fake "conversation" whether you've
// messaged them or not. Written (merge: true) lazily on first message,
// not eagerly when the DM screen is first opened.
export function subscribeMyDms(uid, onData) {
  return subscribeToCollection(COLLECTIONS.chatDms, [where('participantUids', 'array-contains', uid)], onData)
}

export function subscribeDmMessages(dmId, onData) {
  if (!db) return () => {}
  const ref = collection(db, COLLECTIONS.chatDms, dmId, 'messages')
  return onSnapshot(
    query(ref, orderBy('createdAt', 'asc')),
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error('Firestore subscription to DM messages failed:', error.message)
  )
}

// `updatedAt` here doubles as the DM's "lastMessageAt" signal for unread
// tracking — same idea as channels' own lastMessageAt, just already
// present on this doc from the original merge-on-first-message write.
export function sendDmMessage(dmId, participants, payload, uid, name) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return setDoc(
    doc(db, COLLECTIONS.chatDms, dmId),
    {
      participantUids: participants.map((p) => p.uid),
      participantNames: Object.fromEntries(participants.map((p) => [p.uid, p.name])),
      updatedAt: serverTimestamp(),
      lastMessage: previewOf(payload, uid, name),
    },
    { merge: true }
  ).then(() =>
    addDoc(collection(db, COLLECTIONS.chatDms, dmId, 'messages'), {
      ...messageFields(payload),
      authorUid: uid,
      authorName: name,
      createdAt: serverTimestamp(),
    })
  )
}

export function updateDmMessage(dmId, messageId, text) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.chatDms, dmId, 'messages', messageId), { text, editedAt: serverTimestamp() })
}

export function deleteDmMessage(dmId, messageId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return deleteDoc(doc(db, COLLECTIONS.chatDms, dmId, 'messages', messageId))
}

// Live copy of one message (a thread's parent), so the thread panel shows
// its current text, reactions and reply count.
export function subscribeMessage(convType, convId, messageId, onData) {
  if (!db) return () => {}
  return onSnapshot(
    doc(messagesCol(convType, convId), messageId),
    (snap) => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (error) => console.error('Firestore subscription to chat message failed:', error.message)
  )
}

// ---- Hilos (threads), Slack's model ----
// A reply goes into the parent's `replies` subcollection, and the parent
// gets a small summary (`replyCount`, `lastReplyAt`, `replyUids` = who's
// taking part) so the main timeline can show "3 respuestas · hace 5 min"
// with avatars without loading any replies.
export function sendThreadReply(convType, convId, parentId, payload, uid, name) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  const replyRef = doc(messagesCol(convType, convId, parentId))
  const batch = writeBatch(db)
  batch.set(replyRef, { ...messageFields(payload), authorUid: uid, authorName: name, createdAt: serverTimestamp() })
  batch.update(doc(messagesCol(convType, convId), parentId), { replyCount: increment(1), lastReplyAt: serverTimestamp(), replyUids: arrayUnion(uid) })
  return batch.commit().then(() => replyRef)
}

export function updateThreadReply(convType, convId, parentId, replyId, text) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(messagesCol(convType, convId, parentId), replyId), { text, editedAt: serverTimestamp() })
}

export function deleteThreadReply(convType, convId, parentId, replyId) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  const batch = writeBatch(db)
  batch.delete(doc(messagesCol(convType, convId, parentId), replyId))
  batch.update(doc(messagesCol(convType, convId), parentId), { replyCount: increment(-1) })
  return batch.commit()
}

// ---- Escribiendo… ----
// One tiny doc per conversation (or thread), `{[uid]: {name, at}}`. The
// composer writes at most once every few seconds while someone types and
// clears its own entry on send, so this costs almost nothing.
export function setTyping(typingKey, uid, name, typing) {
  if (!db) return Promise.resolve()
  return setDoc(doc(db, COLLECTIONS.chatTyping, typingKey), { [uid]: typing ? { name, at: serverTimestamp() } : deleteField() }, { merge: true })
}

export function subscribeTyping(typingKey, onData) {
  if (!db || !typingKey) return () => {}
  return onSnapshot(
    doc(db, COLLECTIONS.chatTyping, typingKey),
    (snap) => onData(snap.exists() ? snap.data() : {}),
    () => {}
  )
}

// ---- Presencia (conectado / ausente) ----
// Heartbeat model: each open ADOR OS tab writes `presence/{uid}` when it
// opens, once a minute while visible, and on hide/close. Someone counts as
// "en línea" if their last heartbeat is recent — see lib/chat.js
// presenceOf(). ~60 writes/hour per person, far inside the free tier.
export function writePresence(uid, state) {
  if (!db || !uid) return Promise.resolve()
  return setDoc(doc(db, COLLECTIONS.presence, uid), { state, lastActiveAt: serverTimestamp() }, { merge: true })
}

export function subscribePresence(onData) {
  if (!db) return () => {}
  return onSnapshot(
    collection(db, COLLECTIONS.presence),
    (snapshot) => onData(Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data()]))),
    () => {}
  )
}

// ---- Menciones, guardados, archivos ----
// All three are small top-level index collections instead of
// collection-group queries over every conversation's `messages`: a
// collection-group query needs its own index created by hand in the
// Firebase console, and scanning every message ever sent is exactly the
// "carga demasiado" the user asked to avoid. Each doc is a tiny pointer
// back to the real message.

// One doc per person mentioned. "Unread" is never stored: a mention is new
// when it's newer than users/{uid}.chatLastRead[conversationKey] — the same
// timestamp that already drives the sidebar's unread dots, so opening the
// conversation clears both at once with no extra writes.
export function createMentions(mentions, meta, fromUid, fromName) {
  if (!db || !mentions.length) return Promise.resolve()
  const batch = writeBatch(db)
  for (const m of mentions) {
    if (m.uid === fromUid) continue
    batch.set(doc(collection(db, COLLECTIONS.chatMentions)), { toUid: m.uid, fromUid, fromName, ...meta, createdAt: serverTimestamp() })
  }
  return batch.commit()
}

export function subscribeMyMentions(uid, onData) {
  if (!uid) return () => {}
  return subscribeToCollection(COLLECTIONS.chatMentions, [where('toUid', '==', uid)], onData)
}

// Saved message = a snapshot of its text at save time (so the list reads
// without loading the conversation) + a pointer back to it. Doc id is
// `${uid}_${messageId}` so saving is idempotent and unsaving is a direct
// delete, no query.
export function toggleSavedMessage(uid, message, meta, saved) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  const ref = doc(db, COLLECTIONS.chatSaved, `${uid}_${message.id}`)
  if (saved) return deleteDoc(ref)
  return setDoc(ref, {
    uid,
    messageId: message.id,
    text: message.text || '',
    authorName: message.authorName || '',
    messageCreatedAt: message.createdAt || null,
    ...meta,
    savedAt: serverTimestamp(),
  })
}

export function subscribeMySaved(uid, onData) {
  if (!uid) return () => {}
  return subscribeToCollection(COLLECTIONS.chatSaved, [where('uid', '==', uid)], onData)
}

// Every file shared in chat gets a pointer here (images, voice notes,
// Drive documents). Which ones you can see is decided client-side against
// the conversations you're currently a member of, so leaving a private
// channel also hides its files.
export function indexChatFile(entry) {
  if (!db) return Promise.resolve()
  return addDoc(collection(db, COLLECTIONS.chatFiles), { ...entry, createdAt: serverTimestamp() })
}

export function subscribeChatFiles(onData) {
  return subscribeToCollection(COLLECTIONS.chatFiles, [orderBy('createdAt', 'desc')], onData)
}

// Heavy payloads (full-size image, voice recording) live in their own doc
// and are only fetched when someone opens/plays them — the message itself
// carries just a small thumbnail/duration, so opening a thread stays light.
export function createChatBlob(dataUrl, kind) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.chatBlobs), { dataUrl, kind, createdAt: serverTimestamp() })
}

export async function getChatBlob(blobId) {
  if (!db) throw new Error('Firestore no configurado')
  const snap = await getDoc(doc(db, COLLECTIONS.chatBlobs, blobId))
  return snap.exists() ? snap.data().dataUrl : null
}

// When a message is deleted, its pointers go with it — otherwise Menciones,
// Guardados and Archivos would list a message that no longer exists.
export async function cleanupMessageIndexes(messageId) {
  if (!db) return
  const batch = writeBatch(db)
  for (const name of [COLLECTIONS.chatFiles, COLLECTIONS.chatMentions, COLLECTIONS.chatSaved]) {
    const snap = await getDocs(query(collection(db, name), where('messageId', '==', messageId)))
    snap.forEach((d) => batch.delete(d.ref))
  }
  return batch.commit()
}

// ---- Llamadas entrantes ----
// One `chatCalls/{id}` doc per started call, separate from the call card
// posted in the conversation: the card is the permanent record, this doc is
// the short-lived "ring" signal IncomingCallGate listens for, app-wide.
// `toUids` = everyone who should ring (never the caller). Each recipient's
// answer goes in `responses.{uid}` ('joined' | 'declined') so it stops
// ringing for them without affecting anyone else in a group call.
export function createChatCall({ type, url, toUids, conversationLabel, conversationKey }, fromUid, fromName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.chatCalls), {
    type,
    url,
    toUids,
    conversationLabel,
    conversationKey,
    fromUid,
    fromName,
    responses: {},
    createdAt: serverTimestamp(),
  })
}

// No orderBy on purpose: array-contains alone needs no composite index.
export function subscribeIncomingCalls(uid, onData) {
  if (!uid) return () => {}
  return subscribeToCollection(COLLECTIONS.chatCalls, [where('toUids', 'array-contains', uid)], onData)
}

export function respondToChatCall(callId, uid, response) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.chatCalls, callId), { [`responses.${uid}`]: response })
}

// Per-user mute, same one-map-field-on-the-profile shape as chatLastRead:
// a muted conversation still receives messages, it just never shows an
// unread dot/bold label in the sidebar.
export function setChatMuted(uid, conversationId, muted) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.users, uid), { [`chatMuted.${conversationId}`]: muted })
}

// Read tracking for the sidebar's unread dots — one map field on the
// user's own profile doc (`chatLastRead: {conversationId: timestamp}`)
// rather than a new collection, since it's tiny per-user state, same
// spirit as `users/{uid}.weeklyGoal`/`birthday`. Written via a dotted
// field path (updateDoc, not a merged setDoc) so marking one conversation
// read never touches any other conversation's stored timestamp.
export function markChatRead(uid, conversationId) {
  if (!db) return Promise.resolve()
  return updateDoc(doc(db, COLLECTIONS.users, uid), { [`chatLastRead.${conversationId}`]: serverTimestamp() })
}
