import { useEffect, useState } from 'react'
import {
  subscribeChatChannels,
  subscribeUsers,
  subscribeMyDms,
  subscribeUserProfile,
  subscribeDirectoryPeople,
  subscribeMyMentions,
  subscribeMySaved,
  subscribePresence,
  subscribeMyReminders,
} from '../lib/firestore'

// Every live listener Comunicación needs regardless of which conversation
// is open — channels/groups, DMs, people, your profile (read markers, mute,
// status), Directorio identities, your mentions/replies, saved messages,
// presence and reminders. Per-conversation listeners (messages, typing,
// one call) stay with the components that show them.
export function useChatData(uid) {
  const [allChannels, setAllChannels] = useState([])
  const [users, setUsers] = useState([])
  const [myDms, setMyDms] = useState([])
  const [profile, setProfile] = useState(null)
  const [directory, setDirectory] = useState([])
  const [mentions, setMentions] = useState([])
  const [saved, setSaved] = useState([])
  const [presence, setPresence] = useState({})
  const [reminders, setReminders] = useState([])

  useEffect(() => subscribeChatChannels(uid, setAllChannels), [uid])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeDirectoryPeople(setDirectory), [])
  useEffect(() => subscribePresence(setPresence), [])
  useEffect(() => subscribeMyDms(uid, setMyDms), [uid])
  useEffect(() => subscribeUserProfile(uid, setProfile), [uid])
  useEffect(() => subscribeMyMentions(uid, setMentions), [uid])
  useEffect(() => subscribeMySaved(uid, setSaved), [uid])
  useEffect(() => subscribeMyReminders(uid, setReminders), [uid])

  return { allChannels, users, myDms, profile, directory, mentions, saved, presence, reminders }
}
