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
} from 'firebase/firestore'
import { app, isFirebaseConfigured } from '../firebase'

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

// Workspace's shared board — every task across the 3 founders, not just the
// signed-in user's own (that's what subscribeTasksForUser is for, used by
// Home's "Tareas Hoy").
export function subscribeAllTasks(onData) {
  return subscribeToCollection(COLLECTIONS.tasks, [], onData)
}

export function createTask(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.tasks), {
    ...data,
    status: 'por_hacer',
    createdBy: actorName,
    createdAt: serverTimestamp(),
  })
}

export function updateTask(taskId, data) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return updateDoc(doc(db, COLLECTIONS.tasks, taskId), data)
}

export function toggleTaskComplete(task) {
  return updateTask(task.id, { status: task.status === 'completado' ? 'por_hacer' : 'completado' })
}

export function deleteTask(taskId) {
  if (!db) return Promise.resolve()
  return deleteDoc(doc(db, COLLECTIONS.tasks, taskId))
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

export function createClient(data, actorName) {
  if (!db) return Promise.reject(new Error('Firestore no configurado'))
  return addDoc(collection(db, COLLECTIONS.clients), {
    ...data,
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
