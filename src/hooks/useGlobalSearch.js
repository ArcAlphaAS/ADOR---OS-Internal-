import { useEffect, useState } from 'react'
import {
  subscribeClients,
  subscribeAllTasks,
  subscribeDecisions,
  subscribeKnowledgeDocs,
  subscribeDirectoryPeople,
  subscribeNews,
  subscribeCommunityPosts,
  subscribeObjetivos,
  subscribeProyectosInternos,
  subscribeChatChannels,
  subscribeMyDms,
  subscribeUsers,
} from '../lib/firestore'
import { clientType } from '../lib/clientStages'
import { isMember } from '../lib/chat'
import { makeLabelFor } from '../lib/chatIndexes'
import { useMessageSearch, normalize } from './useMessageSearch'

const MAX_PER_GROUP = 5
// Chat messages are read on demand (lib: useMessageSearch — one-off reads,
// cached 15 min), so they only kick in from this many characters.
const MIN_MESSAGE_QUERY = 3

// The top-bar search across ALL of ADOR OS. Everything except chat
// messages comes from the same live subscriptions the modules already hold
// (no search index — Firestore has no full-text search, and at 3 people
// filtering on the device is instant). Matching is accent- and case-
// insensitive, and every word typed must appear ("propuesta qanlla").
//
// Each result carries `target` = [moduleId, focus] for AppShell.navigateTo,
// so choosing it opens that exact record, not just the module.
export function useGlobalSearch(query, uid) {
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [decisions, setDecisions] = useState([])
  const [knowledgeDocs, setKnowledgeDocs] = useState([])
  const [people, setPeople] = useState([])
  const [news, setNews] = useState([])
  const [community, setCommunity] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [channels, setChannels] = useState([])
  const [dms, setDms] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeAllTasks(setTasks), [])
  useEffect(() => subscribeDecisions(setDecisions), [])
  useEffect(() => subscribeKnowledgeDocs(setKnowledgeDocs), [])
  useEffect(() => subscribeDirectoryPeople(setPeople), [])
  useEffect(() => subscribeNews(setNews), [])
  useEffect(() => subscribeCommunityPosts(setCommunity), [])
  useEffect(() => subscribeObjetivos(setObjetivos), [])
  useEffect(() => subscribeProyectosInternos(setProyectos), [])
  useEffect(() => subscribeChatChannels(setChannels), [])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => (uid && uid !== 'preview' ? subscribeMyDms(uid, setDms) : undefined), [uid])

  const words = normalize(query).split(/\s+/).filter(Boolean)
  const matches = (...fields) => {
    const hay = normalize(fields.filter(Boolean).join(' '))
    return words.every((w) => hay.includes(w))
  }

  // Conversations this person can actually see (private channels/groups
  // they're not in never appear) — same rule as Comunicación.
  const labelFor = makeLabelFor({ uid, users, allChannels: channels })
  const conversations = [
    ...channels.filter((c) => isMember(c, uid)).map((c) => ({ convType: 'conv', convId: c.id, label: labelFor('conv', c.id) })),
    ...dms.map((d) => ({ convType: 'dm', convId: d.id, participantUids: d.participantUids, label: labelFor('dm', d.id, d.participantUids) })),
  ]
  const messageQuery = query.trim().length >= MIN_MESSAGE_QUERY ? query : ''
  const messageSearch = useMessageSearch(conversations, messageQuery)

  if (!words.length) return { groups: [], hasResults: false, loadingMessages: false }

  const pick = (list, test, map) => list.filter(test).slice(0, MAX_PER_GROUP).map(map)

  const groups = [
    {
      key: 'clients',
      label: 'Clientes',
      items: pick(clients, (c) => matches(c.name, c.contactName, c.industria, c.code), (c) => ({ id: c.id, title: c.name, meta: c.code || clientType(c.stage), target: ['clientes', { type: 'client', id: c.id }] })),
    },
    {
      key: 'tasks',
      label: 'Tareas',
      items: pick(tasks, (t) => matches(t.title, t.description), (t) => ({ id: t.id, title: t.title, meta: t.status === 'completado' ? 'Completada' : 'Tarea', target: ['workspace', { type: 'task', id: t.id }] })),
    },
    {
      key: 'messages',
      label: 'Mensajes',
      items: messageSearch.results.slice(0, MAX_PER_GROUP).map(({ message, conv }) => ({
        id: `${conv.convId}:${message.id}`,
        title: message.text || message.attachment?.name || 'Mensaje',
        meta: `${(message.authorName || '').split(' ')[0]} · ${conv.convType === 'dm' ? conv.label : conv.label}`,
        target: ['chat', { type: 'chat', convType: conv.convType, convId: conv.convId, participantUids: conv.participantUids, messageId: message.id, deep: true }],
      })),
    },
    {
      key: 'people',
      label: 'Personas',
      items: pick(people, (p) => matches(p.name, p.role, p.area, p.email), (p) => ({ id: p.id, title: p.name, meta: [p.role, p.area].filter(Boolean).join(' · ') || 'Directorio', target: ['directorio', { type: 'person', id: p.id }] })),
    },
    {
      key: 'knowledge',
      label: 'Conocimiento',
      items: pick(knowledgeDocs, (d) => matches(d.title, d.content), (d) => ({ id: d.id, title: d.title, meta: 'Documento', target: ['conocimiento', { type: 'knowledge', id: d.id }] })),
    },
    {
      key: 'objetivos',
      label: 'Objetivos',
      items: pick(objetivos, (o) => matches(o.title, o.foco), (o) => ({ id: o.id, title: o.title, meta: o.quarter || 'Objetivo', target: ['objetivos', null] })),
    },
    {
      key: 'decisions',
      label: 'Decisiones',
      items: pick(decisions, (d) => matches(d.title, d.description), (d) => ({ id: d.id, title: d.title, meta: 'Decisión', target: ['objetivos', null] })),
    },
    {
      key: 'proyectos',
      label: 'Proyectos',
      items: pick(proyectos, (p) => matches(p.name, p.description), (p) => ({ id: p.id, title: p.name, meta: 'Proyecto interno', target: ['workspace', null] })),
    },
    {
      key: 'news',
      label: 'Anuncios',
      items: pick(news, (n) => matches(n.title, n.subtitle, n.body), (n) => ({ id: n.id, title: n.title, meta: 'Anuncio', target: ['news', { type: 'news', id: n.id }] })),
    },
    {
      key: 'community',
      label: 'Comunidad',
      items: pick(community, (c) => matches(c.text, c.authorName), (c) => ({ id: c.id, title: c.text, meta: (c.authorName || '').split(' ')[0], target: ['news', { type: 'community', id: c.id }] })),
    },
  ].filter((g) => g.items.length)

  return {
    groups,
    hasResults: groups.length > 0,
    loadingMessages: Boolean(messageQuery) && messageSearch.loading,
  }
}
