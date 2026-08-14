import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore'
import { app, isFirebaseConfigured } from '../firebase'

// Central data model. Every entity references related entities by ID —
// this is the substrate the rest of ADOR OS builds on.
//
//   /users/{userId}                 profile, role, preferences
//   /clients/{clientId}             CRM records
//   /interventions/{interventionId} references clientId
//   /tasks/{taskId}                 references interventionId, assignedTo (userId)
//   /decisions/{decisionId}         references interventionId
//   /meetings/{meetingId}           references clientId
//   /notifications/{notificationId} references userId
export const COLLECTIONS = {
  users: 'users',
  clients: 'clients',
  interventions: 'interventions',
  tasks: 'tasks',
  decisions: 'decisions',
  meetings: 'meetings',
  notifications: 'notifications',
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
  return subscribeToCollection(COLLECTIONS.clients, [], onData)
}

export function subscribeInterventions(onData) {
  return subscribeToCollection(COLLECTIONS.interventions, [], onData)
}

export function subscribeTasksForUser(userId, onData) {
  return subscribeToCollection(COLLECTIONS.tasks, [where('assignedTo', '==', userId)], onData)
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
// displayName/photoURL) — e.g. birthday. Stored at users/{uid}, merged so
// partial updates never clobber other fields.
export async function getUserProfile(userId) {
  if (!db || !userId) return null
  const snap = await getDoc(doc(db, COLLECTIONS.users, userId))
  return snap.exists() ? snap.data() : null
}

export function saveUserProfile(userId, data) {
  if (!db || !userId) return Promise.resolve()
  return setDoc(doc(db, COLLECTIONS.users, userId), data, { merge: true })
}
