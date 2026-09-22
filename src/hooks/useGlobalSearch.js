import { useEffect, useState } from 'react'
import { subscribeClients, subscribeAllTasks, subscribeDecisions, subscribeKnowledgeDocs } from '../lib/firestore'
import { clientType } from '../lib/clientStages'

const MAX_RESULTS_PER_GROUP = 5

// Reuses the same live subscriptions other modules already hold — no
// separate search index. Fine at a 3-founder scale; searches locally over
// whatever's already synced instead of a server-side text query (Firestore
// doesn't support substring search without a third-party index anyway).
export function useGlobalSearch(query) {
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [decisions, setDecisions] = useState([])
  const [knowledgeDocs, setKnowledgeDocs] = useState([])

  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeAllTasks(setTasks), [])
  useEffect(() => subscribeDecisions(setDecisions), [])
  useEffect(() => subscribeKnowledgeDocs(setKnowledgeDocs), [])

  const q = query.trim().toLowerCase()
  if (!q) return { clients: [], tasks: [], decisions: [], knowledge: [], hasResults: false }

  const matchedClients = clients
    .filter((c) => c.name?.toLowerCase().includes(q) || c.contactName?.toLowerCase().includes(q))
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map((c) => ({ id: c.id, title: c.name, subtitle: clientType(c.stage), code: c.code }))

  const matchedTasks = tasks
    .filter((t) => t.title?.toLowerCase().includes(q))
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map((t) => ({ id: t.id, title: t.title, subtitle: 'Tarea' }))

  const matchedDecisions = decisions
    .filter((d) => d.title?.toLowerCase().includes(q))
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map((d) => ({ id: d.id, title: d.title, subtitle: 'Decisión' }))

  const matchedKnowledge = knowledgeDocs
    .filter((d) => d.title?.toLowerCase().includes(q) || d.content?.toLowerCase().includes(q))
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map((d) => ({ id: d.id, title: d.title, subtitle: 'Conocimiento' }))

  return {
    clients: matchedClients,
    tasks: matchedTasks,
    decisions: matchedDecisions,
    knowledge: matchedKnowledge,
    hasResults: matchedClients.length + matchedTasks.length + matchedDecisions.length + matchedKnowledge.length > 0,
  }
}
