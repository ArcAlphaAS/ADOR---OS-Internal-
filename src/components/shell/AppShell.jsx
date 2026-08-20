import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ModulePlaceholder from './ModulePlaceholder'
import HomeScreen from '../home/HomeScreen'
import ClientesModule from '../clientes/ClientesModule'
import FinanzasModule from '../finanzas/FinanzasModule'
import WorkspaceModule from '../workspace/WorkspaceModule'
import ObjetivosModule from '../objetivos/ObjetivosModule'
import AdorIAModule from '../adoria/AdorIAModule'
import OnboardingTour from '../onboarding/OnboardingTour'
import { getUserProfile, markOnboardingSeen } from '../../lib/firestore'

const MODULE_LABELS = {
  inicio: 'Inicio',
  workspace: 'Workspace',
  objetivos: 'Objetivos',
  calendario: 'Calendario',
  clientes: 'Clientes',
  finanzas: 'Finanzas',
  conocimiento: 'Conocimiento',
  comunidad: 'Comunidad',
  chat: 'Chat',
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
          <AnimatePresence mode="wait">
            {activeModule === 'inicio' ? (
              <HomeScreen key="inicio" user={user} onNavigate={navigateTo} />
            ) : activeModule === 'workspace' ? (
              <WorkspaceModule
                key="workspace"
                user={user}
                focusTaskId={focus?.type === 'task' ? focus.id : null}
                onFocusHandled={() => setFocus(null)}
              />
            ) : activeModule === 'clientes' ? (
              <ClientesModule
                key="clientes"
                user={user}
                focusClientId={focus?.type === 'client' ? focus.id : null}
                onFocusHandled={() => setFocus(null)}
              />
            ) : activeModule === 'finanzas' ? (
              <FinanzasModule key="finanzas" user={user} />
            ) : activeModule === 'objetivos' ? (
              <ObjetivosModule key="objetivos" user={user} />
            ) : activeModule === 'ador-ia' ? (
              <AdorIAModule key="ador-ia" user={user} />
            ) : (
              <ModulePlaceholder key={activeModule} name={MODULE_LABELS[activeModule]} />
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>{showOnboarding && <OnboardingTour key="onboarding" onFinish={finishOnboarding} />}</AnimatePresence>
    </div>
  )
}
