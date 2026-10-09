import { useEffect, useState } from 'react'
import { subscribeAllTasks, subscribeClients, subscribeObjetivos, subscribeUsers } from '../lib/firestore'
import { buildAttention } from '../lib/attention'

// Same live collections the modules use; recomputed on each change.
export function useAttention(finance, uid) {
  const [clients, setClients] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeObjetivos(setObjetivos), [])
  useEffect(() => subscribeAllTasks(setTasks), [])
  useEffect(() => subscribeUsers(setUsers), [])

  return buildAttention({ finance, clients, objetivos, tasks, users, uid })
}
