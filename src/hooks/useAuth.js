import { useCallback, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'

const NOT_CONFIGURED = new Error('Firebase no está configurado. Agrega tus credenciales en .env')

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
  }, [])

  const signInWithEmail = useCallback((email, password) => {
    if (!auth) return Promise.reject(NOT_CONFIGURED)
    return signInWithEmailAndPassword(auth, email, password)
  }, [])

  const resetPassword = useCallback((email) => {
    if (!auth) return Promise.reject(NOT_CONFIGURED)
    return sendPasswordResetEmail(auth, email)
  }, [])

  const signOut = useCallback(() => {
    if (!auth) return Promise.reject(NOT_CONFIGURED)
    return firebaseSignOut(auth)
  }, [])

  // Firebase mutates auth.currentUser in place on updateProfile, but React
  // won't re-render from that alone — merge the change into local state too.
  const updateDisplayName = useCallback(async (displayName) => {
    if (!auth?.currentUser) return Promise.reject(NOT_CONFIGURED)
    await updateProfile(auth.currentUser, { displayName })
    setUser((prev) => (prev ? { ...prev, displayName } : prev))
  }, [])

  return { user, loading, signInWithEmail, resetPassword, signOut, updateDisplayName }
}
