import { useEffect, useState } from 'react'
import { subscribeUsers, subscribeDirectoryPeople } from '../../lib/firestore'
import { ChatPeopleContext } from '../chat/PersonAvatar'

// Gives the faces on Inicio (PersonAvatar) their directory: account photos and
// Directorio photos, same source as Comunicación and Comunidad.
export default function HomePeople({ children }) {
  const [users, setUsers] = useState([])
  const [directory, setDirectory] = useState([])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeDirectoryPeople(setDirectory), [])
  return <ChatPeopleContext.Provider value={{ users, directory, presence: {} }}>{children}</ChatPeopleContext.Provider>
}
