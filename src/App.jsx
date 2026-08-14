import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import SplashScreen from './components/SplashScreen'
import LoginScreen from './components/LoginScreen'
import WelcomeScreen from './components/WelcomeScreen'
import AppShell from './components/shell/AppShell'
import { useAuth } from './hooks/useAuth'
import { useWelcomeScreen } from './hooks/useWelcomeScreen'
import { firstName } from './lib/user'
import { saveUserProfile } from './lib/firestore'

const PREVIEW_MOCK_USER = import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')
  ? {
      uid: 'preview',
      displayName: 'Ángel Samillán García',
      email: 'angel@ador.com',
      photoURL: null,
      metadata: { lastSignInTime: new Date(Date.now() - 3 * 3600 * 1000).toString() },
    }
  : null

function App() {
  const [splashDone, setSplashDone] = useState(Boolean(PREVIEW_MOCK_USER))
  const [loginError, setLoginError] = useState('')
  const [loginNotice, setLoginNotice] = useState('')
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  const { user, loading, signInWithEmail, resetPassword, signOut, updateDisplayName } = useAuth()
  const welcome = useWelcomeScreen(user ? user.uid : null)

  useEffect(() => {
    setWelcomeDismissed(false)
    setLoginError('')
    setLoginNotice('')
  }, [user?.uid])

  // Self-registers a lightweight users/{uid} directory entry on login — the
  // only way to populate "Asociado responsable" pickers without a Firebase
  // Admin SDK backend to list every Auth user. See lib/firestore.js.
  useEffect(() => {
    if (!user || user.uid === 'preview') return
    saveUserProfile(user.uid, { displayName: user.displayName || null, email: user.email })
  }, [user?.uid, user?.displayName])

  // Splash and Login aren't separate routes, just state — without a history
  // entry the browser's Back button leaves the app entirely instead of
  // returning to Splash. Give Login its own entry so Back behaves as expected.
  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ screen: 'splash' }, '')
    }
    const handlePopState = (event) => {
      const screen = event.state?.screen
      if (screen === 'splash') setSplashDone(false)
      else if (screen === 'login') setSplashDone(true)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSplashFinish = () => {
    window.history.pushState({ screen: 'login' }, '')
    setSplashDone(true)
  }

  const handleSubmit = async ({ email, password }) => {
    setLoginError('')
    try {
      await signInWithEmail(email, password)
    } catch {
      setLoginError('No pudimos verificar tus credenciales.')
    }
  }

  const handleForgotPassword = async (email) => {
    setLoginError('')
    setLoginNotice('')
    if (!email) {
      setLoginError('Ingresa tu correo para restablecer la contraseña.')
      return
    }
    try {
      await resetPassword(email)
      setLoginNotice('Te enviamos un correo para restablecer tu contraseña.')
    } catch {
      setLoginError('No pudimos enviar el correo de recuperación.')
    }
  }

  let content = null

  if (!splashDone) {
    content = <SplashScreen key="splash" onFinish={handleSplashFinish} />
  } else if (loading) {
    content = null
  } else if (!user) {
    content = (
      <LoginScreen
        key="login"
        onSubmit={handleSubmit}
        onForgotPassword={handleForgotPassword}
        error={loginError}
        notice={loginNotice}
      />
    )
  } else if (!welcome.checked) {
    content = null
  } else if (welcome.show && !welcomeDismissed) {
    content = (
      <WelcomeScreen
        key="welcome"
        name={firstName(user)}
        isReturning={welcome.isReturning}
        onDismiss={() => setWelcomeDismissed(true)}
      />
    )
  } else {
    content = (
      <AppShell
        key="home"
        user={user}
        onSignOut={signOut}
        onUpdateDisplayName={updateDisplayName}
        onResetPassword={resetPassword}
      />
    )
  }

  if (PREVIEW_MOCK_USER) {
    content = (
      <AppShell
        key="home"
        user={PREVIEW_MOCK_USER}
        onSignOut={() => {}}
        onUpdateDisplayName={() => Promise.resolve()}
        onResetPassword={() => Promise.resolve()}
      />
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A0A0A]">
      <AnimatePresence mode="wait">{content}</AnimatePresence>
    </div>
  )
}

export default App
