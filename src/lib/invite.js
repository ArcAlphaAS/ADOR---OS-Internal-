// Invite someone to ADOR OS from Administración — no Firebase console, no
// server. Uses a second, throwaway Firebase Auth instance so creating the
// new account doesn't sign the admin out of their own session.
//   1. allowedEmails/{email} with the role → what actually lets them in
//   2. their Auth account (email + a random password nobody ever sees)
//   3. users/{uid} with name and role, so they appear everywhere at once
//   4. Firebase's "reset password" email → they choose their own password
// If the email already had an account, steps 2–3 are skipped; the role is
// applied on their first login from allowedEmails.role (App.jsx).
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth'
import { firebaseConfig } from '../firebase'
import { allowEmail, saveUserProfile } from './firestore'

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('') + 'A!9'
}

function inviteAuth() {
  const app = getApps().find((a) => a.name === 'ador-invite') || initializeApp(firebaseConfig, 'ador-invite')
  return getAuth(app)
}

export async function inviteMember({ email, name, role, invitedBy }) {
  const clean = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Ese correo no parece válido.')
  await allowEmail(clean, { role, name: name.trim(), invitedBy })
  const auth2 = inviteAuth()
  let existed = false
  try {
    const cred = await createUserWithEmailAndPassword(auth2, clean, randomPassword())
    if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {})
    await saveUserProfile(cred.user.uid, { displayName: name.trim() || null, email: clean, isAdmin: role === 'admin' })
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') existed = true
    else throw new Error(error.code === 'auth/operation-not-allowed' ? 'El inicio de sesión con correo y contraseña está desactivado en Firebase.' : error.message)
  }
  await sendPasswordResetEmail(auth2, clean)
  await signOut(auth2).catch(() => {})
  return { existed }
}

// "Reenviar correo" for someone who lost the first email.
export function resendAccessEmail(email) {
  return sendPasswordResetEmail(inviteAuth(), email.trim().toLowerCase())
}
