import { useEffect, useRef, useState } from 'react'
import { subscribeAllTasks, subscribeClients, subscribeObjetivos, subscribeUsers } from '../lib/firestore'
import { buildAttention } from '../lib/attention'

// Same live collections the modules use; recomputed on each change.
export function useAttention(finance, uid) {
  const [clients, setClients] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  // `loaded` flips once each collection has answered at least once, so the
  // card never claims "todo en orden" while it is still waiting for data.
  const [loaded, setLoaded] = useState(false)
  const seen = useRef(new Set())
  const mark = (key, set) => (value) => {
    set(value)
    if (!seen.current.has(key)) {
      seen.current.add(key)
      if (seen.current.size === 4) setLoaded(true)
    }
  }

  // If a collection never answers (offline, no permission), stop pretending to load.
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 6000); return () => clearTimeout(t) }, [])
  useEffect(() => subscribeClients(mark('c', setClients)), [])
  useEffect(() => subscribeObjetivos(mark('o', setObjetivos)), [])
  useEffect(() => subscribeAllTasks(mark('t', setTasks)), [])
  useEffect(() => subscribeUsers(mark('u', setUsers)), [])

  return { items: buildAttention({ finance, clients, objetivos, tasks, users, uid }), loaded }
}
