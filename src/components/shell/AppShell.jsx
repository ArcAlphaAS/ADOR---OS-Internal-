import { Suspense, lazy, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ModulePlaceholder from './ModulePlaceholder'
import HomeScreen from '../home/HomeScreen'
import OnboardingTour from '../onboarding/OnboardingTour'
import GlobalCapture from './GlobalCapture'
import AssignmentConfirmGate from './AssignmentConfirmGate'
import IncomingCallGate, { OutgoingCallBanner } from './IncomingCallGate'
import ReminderGate from './ReminderGate'
import ChatMessageToaster from './ChatMessageToaster'
import { useChatUnreadCount } from '../../hooks/useChatNotifications'
import { getUserProfile, markOnboardingSeen } from '../../lib/firestore'
import { usePresenceHeartbeat } from '../../hooks/usePresenceHeartbeat'
import { useChatRetention } from '../../hooks/useChatRetention'
import { useScheduledSender } from '../../hooks/useScheduledSender'
import { finishDriveConnect } from '../../lib/googleDrive'
import { installErrorLogging, setErrorContext } from '../../lib/errorLog'
import ModuleErrorBoundary from './ModuleErrorBoundary'
import BottomNav from './BottomNav'
import { useAccess } from '../../hooks/useAccess'
import { backfillChannelVisibility } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'

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
  admin: () => import('../admin/AdminModule'),
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
const AdminModule = lazy(moduleLoaders.admin)

// Shown when someone opens a module their role doesn't include (lib/access.js).
function NoAccess({ onHome }) {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="ador-glass ador-grain max-w-[400px] rounded-2xl p-7 text-center">
        <p className="text-[15px] font-semibold text-[#F5F5F5]">Esta sección no está disponible para tu rol</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#888888]">Si la necesitas, pídesela a un administrador de ADOR.</p>
        <button type="button" onClick={onHome} className="ador-btn-primary mt-5 rounded-xl px-4 py-2 text-[13px] font-medium">Ir a Inicio</button>
      </div>
    </div>
  )
}

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
  // Coming back from Google's consent screen: reopen the module that
  // started the connection (OAuth `state`), so its hook finishes it.
  const [activeModule, setActiveModule] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.get('code')) return 'inicio'
    const state = params.get('state') || ''
    // Drive connections carry the module that started them: "drive:clientes".
    if (state.startsWith('drive:')) return state.slice(6) || 'inicio'
    return state === 'chat' ? 'chat' : state === 'calendario' ? 'calendario' : 'inicio'
  })
  // Set alongside activeModule when a global-search result should also open
  // a specific client/task's detail panel once its module mounts — cleared
  // by the module itself after consuming it (see ClientesModule/WorkspaceModule).
  const [focus, setFocus] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  usePresenceHeartbeat(user?.uid)
  // Role and which modules this person can open (lib/access.js).
  const access = useAccess(user?.uid)
  // The daily cleanup lists every conversation's old files/calls, which
  // only admins may do under the stricter Firestore rules.
  useChatRetention(access.isAdmin ? user?.uid : null)
  // One-time fix-up for channels created before `visibility` existed —
  // needed by the split channel query (lib/firestore.js).
  useEffect(() => {
    if (!access.isAdmin || !user?.uid || user.uid === 'preview') return
    backfillChannelVisibility().catch(() => {})
  }, [access.isAdmin, user?.uid])
  // Sends due "Enviar más tarde" messages from wherever ADOR OS is open.
  const scheduledMessages = useScheduledSender(user?.uid)
  const showToast = useToast()
  // Registro de errores (lib/errorLog.js): report unexpected failures to
  // Administración → Errores, with who and which screen.
  useEffect(() => {
    installErrorLogging()
    setErrorContext({ uid: user?.uid || null, name: user?.displayName || user?.email || null })
  }, [user?.uid])
  useEffect(() => setErrorContext({ module: activeModule }), [activeModule])
  // Back from Google's consent screen for Drive: finish it here, whichever
  // module is open (lib/googleDrive.js).
  useEffect(() => {
    if (!user?.uid) return
    finishDriveConnect(user.uid).then((r) => {
      if (!r.handled) return
      showToast(r.ok ? 'Google Drive conectado — ya puedes adjuntar archivos y exportar.' : r.error)
    })
  }, [user?.uid])
  const chatUnread = useChatUnreadCount(user?.uid)

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
        access={access}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar activeModule={activeModule} onNavigate={navigateTo} badges={{ chat: chatUnread }} canSee={access.canSee} />

        {/* pb on small screens leaves room for the bottom tab bar. */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
          <ModuleErrorBoundary resetKey={activeModule}>
          <Suspense fallback={null}>
          <AnimatePresence mode="wait">
            {!access.canSee(activeModule) ? (
              <NoAccess key="no-access" onHome={() => navigateTo('inicio')} />
            ) : activeModule === 'admin' ? (
              <AdminModule key="admin" user={user} />
            ) : activeModule === 'inicio' ? (
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
              <DirectorioModule key="directorio" user={user} focus={focus?.type === 'person' ? focus : null} onFocusHandled={() => setFocus(null)} />
            ) : activeModule === 'conocimiento' ? (
              <ConocimientoModule
                key="conocimiento"
                user={user}
                focusDocId={focus?.type === 'knowledge' ? focus.id : null}
                onFocusHandled={() => setFocus(null)}
              />
            ) : activeModule === 'news' ? (
              <NewsModule key="news" user={user} focus={focus?.type === 'news' || focus?.type === 'community' ? focus : null} onFocusHandled={() => setFocus(null)} />
            ) : activeModule === 'chat' ? (
              <ChatModule key="chat" user={user} scheduledMessages={scheduledMessages} focus={focus?.type === 'chat' ? focus : null} onFocusHandled={() => setFocus(null)} onNavigate={navigateTo} />
            ) : activeModule === 'ador-ia' ? (
              <AdorIAModule key="ador-ia" user={user} />
            ) : (
              <ModulePlaceholder key={activeModule} name={MODULE_LABELS[activeModule]} />
            )}
          </AnimatePresence>
          </Suspense>
          </ModuleErrorBoundary>
        </main>
      </div>

      <BottomNav activeModule={activeModule} onNavigate={navigateTo} canSee={access.canSee} badges={{ chat: chatUnread }} />

      <AnimatePresence>{showOnboarding && <OnboardingTour key="onboarding" onFinish={finishOnboarding} />}</AnimatePresence>

      {/* Hidden on Chat — that module already has its own real-time capture
          point (the message composer), so a second floating "+" doing
          something unrelated (a quick note, not a chat action) sits right
          where a Slack-like "new message" button would be expected and
          caused exactly that confusion in testing (see ChatModule.jsx). */}
      {activeModule !== 'chat' && <GlobalCapture user={user} actorName={actorNameFor(user)} />}
      <AssignmentConfirmGate user={user} actorName={actorNameFor(user)} />
      <IncomingCallGate user={user} />
      <OutgoingCallBanner user={user} />
      <ReminderGate user={user} onNavigate={navigateTo} />
      <ChatMessageToaster user={user} activeModule={activeModule} onNavigate={navigateTo} />
    </div>
  )
}
