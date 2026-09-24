import { useEffect, useState } from 'react'
import { subscribeUserProfile, subscribeAccessSettings } from '../lib/firestore'
import { isAdmin } from '../lib/permissions'
import { canSeeModule } from '../lib/access'

// The signed-in person's role and which modules they can open (lib/access.js).
export function useAccess(uid) {
  const [profile, setProfile] = useState(null)
  const [settings, setSettings] = useState({})
  useEffect(() => (uid && uid !== 'preview' ? subscribeUserProfile(uid, setProfile) : undefined), [uid])
  useEffect(() => subscribeAccessSettings(setSettings), [])
  const admin = isAdmin(profile)
  return {
    isAdmin: admin,
    memberModules: settings.memberModules || null,
    canSee: (moduleId) => canSeeModule(moduleId, { isAdmin: admin, memberModules: settings.memberModules }),
  }
}
