import { useEffect, useState } from 'react'
import { subscribeUserProfile } from '../lib/firestore'

// Profile photos are stored as a compressed data URL in Firestore
// (users/{uid}.photoDataUrl) rather than Firebase Storage — see lib/image.js
// for why. Falls back to Firebase Auth's photoURL (unused today, but kept in
// case Storage or Google sign-in photos ever come back).
export function useUserPhoto(uid, fallbackPhotoURL) {
  const [photoDataUrl, setPhotoDataUrl] = useState(null)

  useEffect(() => {
    if (!uid || uid === 'preview') return
    return subscribeUserProfile(uid, (profile) => setPhotoDataUrl(profile?.photoDataUrl || null))
  }, [uid])

  return photoDataUrl || fallbackPhotoURL || null
}
