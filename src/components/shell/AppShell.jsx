import { Suspense, lazy, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ModulePlaceholder from './ModulePlaceholder'
import HomeScreen from '../home/HomeScreen'
import OnboardingTour from '../onboarding/OnboardingTour'
import GlobalCapture from './GlobalCapture'
import AssignmentConfirmGate from './AssignmentConfirmGate'
import IncomingCallGate from './IncomingCallGate'
import { getUserProfile, markOnboardingSeen } from '../../lib/firestore'
import { usePresenceHeartbeat } from '../../hooks/usePresenceHeartbeat'

// Every module except Home is its own code-split chunk, downloaded the
// first time someone opens it instead of all at once on login — the app
// used to ship one ~1.4MB bundle before anything rendered. After the shell
// has loaded, the rest are prefetched in the background (see the idle
// effect below), so switching modules still feels instant.
const moduleLoaders = {
  clientes: () => import('../clientes/ClientesModule'),
  finanzas: () => import('../finanzas/FinanzasModule'),
  workspace: () => import('../workspace/WorkspaceModule'),
  objetivos: () => import('../objetivos/ObjetivosModule'),
  calendario: () => import('../calendario/CalendarioModule'),
  directorio: () => import('../directorio/DirectorioModule'),
  conocimiento: () => import('../conocimiento/ConocimientoModule'),
  news: () => import('../news/NewsModule'),
  chat: () => import('../chat/ChatModule'),
  'ador-ia': () => import('../adoria/AdorIAModule'),
}
const ClientesModule = lazy(moduleLoaders.clientes)
const FinanzasModule = lazy(moduleLoaders.finanzas)
const WorkspaceModule = lazy(moduleLoaders.workspace)
const ObjetivosModule = lazy(moduleLoaders.objetivos)
const CalendarioModule = lazy(moduleLoaders.calendario)
const DirectorioModule = lazy(moduleLoaders.directorio)
const ConocimientoModule = lazy(moduleLoaders.conocimiento)
const NewsModule = lazy(moduleLoaders.news)
const ChatModule = lazy(moduleLoaders.chat)
const AdorIAModule = lazy(moduleLoaders['ador-ia'])

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

const MODULE_LABELS = {
  inicio: 'Inicio',
  workspace: 'Workspace',
  objetivos: 'Objetivos',
  calendario: 'Calendario',
  clientes: 'Clientes',
  finanzas: 'Finanzas',
  conocimiento: 'Conocimiento',
  chat: 'Comunicación',
  news: 'News',
  directorio: 'Directorio',
  'ador-ia': 'ADOR IA',
}

export default function AppShell({ user, onSignOut, onUpdateDisplayName, onResetPassword }) {
  const [activeModule, setActiveModule] = useState('inicio')
  // Set alongside activeModule when a global-search result should also open
  // a specific client/task's detail panel once its module mounts — cleared
  // by the module itself after consuming it (see ClientesModule/WorkspaceModule).
  const [focus, setFocus] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  usePresenceHeartbeat(user?.uid)

  const navigateTo = (moduleId, focusTarget = null) => {
    setActiveModule(moduleId)
    setFocus(focusTarget)
  }

  // First-login gate lives on the profile doc (not localStorage) so it's
  // per-account, not per-device — see markOnboardingSeen in lib/firestore.js.
  // Skipped for the ?preview=1 mock user, same rule as every other write
  // that touches shared collections (CLAUDE.md §8).
  useEffect(() => {
    if (!user?.uid || user.uid === 'preview') return
    let cancelled = false
    getUserProfile(user.uid).then((profile) => {
      if (!cancelled && !profile?.onboardingSeenAt) setShowOnboarding(true)
    })
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  // Prefetch the other modules once the browser is idle after login.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500))
    const cancel = window.cancelIdleCallback || clearTimeout
    const handle = idle(() => Object.values(moduleLoaders).forEach((load) => load().catch(() => {})))
    return () => cancel(handle)
  }, [])

  const finishOnboarding = () => {
    setShowOnboarding(false)
    if (user?.uid && user.uid !== 'preview') markOnboardingSeen(user.uid)
  }

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-[#0A0A0A]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 50% 30%, rgba(30,95,173,0.06) 0%, transparent 60%)',
      }}
    >
      <TopBar
        user={user}
        onSignOut={onSignOut}
        onUpdateDisplayName={onUpdateDisplayName}
        onResetPassword={onResetPassword}
        activeModule={activeModule}
        onNavigate={navigateTo}
        onShowOnboarding={() => setShowOnboarding(true)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar activeModule={activeModule} onNavigate={navigateTo} />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Suspense fallback={null}>
          <AnimatePresence mode="wait">
            {activeModule === 'inicio' ? (
              <HomeScreen key="inicio" user={user} onNavigate={navigateTo} />
            ) : activeModule === 'workspace' ? (
              <WorkspaceModule
                key="workspace"
                user={user}
                focusTaskId={focus?.type === 'task' ? focus.id : null}
                onFocusHandled={() => setFocus(null)}
                onNavigate={navigateTo}
              />
            ) : activeModule === 'clientes' ? (
              <ClientesModule
                key="clientes"
                user={user}
                focusClientId={focus?.type === 'client' ? focus.id : null}
                onFocusHandled={() => setFocus(null)}
              />
            ) : activeModule === 'finanzas' ? (
              <FinanzasModule key="finanzas" user={user} onNavigate={navigateTo} />
            ) : activeModule === 'objetivos' ? (
              <ObjetivosModule key="objetivos" user={user} />
            ) : activeModule === 'calendario' ? (
              <CalendarioModule key="calendario" user={user} />
            ) : activeModule === 'directorio' ? (
              <DirectorioModule key="directorio" user={user} />
            ) : activeModule === 'conocimiento' ? (
              <ConocimientoModule
                key="conocimiento"
                user={user}
                focusDocId={focus?.type === 'knowledge' ? focus.id : null}
                onFocusHandled={() => setFocus(null)}
              />
            ) : activeModule === 'news' ? (
              <NewsModule key="news" user={user} />
            ) : activeModule === 'chat' ? (
              <ChatModule key="chat" user={user} focus={focus?.type === 'chat' ? focus : null} onFocusHandled={() => setFocus(null)} />
            ) : activeModule === 'ador-ia' ? (
              <AdorIAModule key="ador-ia" user={user} />
            ) : (
              <ModulePlaceholder key={activeModule} name={MODULE_LABELS[activeModule]} />
            )}
          </AnimatePresence>
          </Suspense>
        </main>
      </div>

      <AnimatePresence>{showOnboarding && <OnboardingTour key="onboarding" onFinish={finishOnboarding} />}</AnimatePresence>

      {/* Hidden on Chat — that module already has its own real-time capture
          point (the message composer), so a second floating "+" doing
          something unrelated (a quick note, not a chat action) sits right
          where a Slack-like "new message" button would be expected and
          caused exactly that confusion in testing (see ChatModule.jsx). */}
      {activeModule !== 'chat' && <GlobalCapture user={user} actorName={actorNameFor(user)} />}
      <AssignmentConfirmGate user={user} actorName={actorNameFor(user)} />
      <IncomingCallGate user={user} />
    </div>
  )
}
