import { Activity, Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ModulePlaceholder from './ModulePlaceholder'
import HomeScreen from '../home/HomeScreen'
import OnboardingTour from '../onboarding/OnboardingTour'
import ProfileSetupPrompt from './ProfileSetupPrompt'
import GlobalCapture from './GlobalCapture'
import AssignmentConfirmGate from './AssignmentConfirmGate'
import IncomingCallGate, { OutgoingCallBanner } from './IncomingCallGate'
import ReminderGate from './ReminderGate'
import ChatMessageToaster from './ChatMessageToaster'
import { useChatUnreadCount } from '../../hooks/useChatNotifications'
import { useNewsAttention, useNewsPublisher } from '../../hooks/useNews'
import { getUserProfile, markOnboardingSeen } from '../../lib/firestore'
import { usePresenceHeartbeat } from '../../hooks/usePresenceHeartbeat'
import { useChatRetention } from '../../hooks/useChatRetention'
import { useFinanceRecurring } from '../../hooks/useFinanceRecurring'
import { useClientBilling } from '../../hooks/useClientBilling'
import { useScheduledSender } from '../../hooks/useScheduledSender'
import { finishDriveConnect } from '../../lib/googleDrive'
import { installErrorLogging, setErrorContext } from '../../lib/errorLog'
import ModuleErrorBoundary from './ModuleErrorBoundary'
import ModuleSkeleton from './ModuleSkeleton'
import BottomNav from './BottomNav'
import { useAccess } from '../../hooks/useAccess'
import { backfillChannelVisibility } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'
import { parseOpenLink, refreshPushSubscription } from '../../lib/push'
import UpdateBanner from './UpdateBanner'
import OfflineBanner from './OfflineBanner'
import { useSeasonRuntime } from '../../hooks/useSeasons'
import { useAchievements } from '../../hooks/useAchievements'
import AchievementMoment from './AchievementMoment'

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
  // Opened from a tapped notification (/?open=chat&…, lib/push.js): start
  // on that conversation.
  const [openLink] = useState(() => parseOpenLink(window.location.search))
  const [activeModule, setActiveModule] = useState(() => {
    if (openLink) return openLink[0]
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
  const [focus, setFocus] = useState(() => openLink?.[1] || null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)
  usePresenceHeartbeat(user?.uid)
  // Role and which modules this person can open (lib/access.js).
  const access = useAccess(user?.uid)
  useSeasonRuntime()
  useAchievements(user)
  // The daily cleanup lists every conversation's old files/calls, which
  // only admins may do under the stricter Firestore rules.
  useChatRetention(access.isAdmin ? user?.uid : null)
  useFinanceRecurring(access.canSee('finanzas'), user?.uid)
  useClientBilling(access.canSee('clientes'), user?.uid)
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
  // News: unread announcements badge, and (admins) publishing scheduled ones.
  const newsAttention = useNewsAttention(user?.uid)
  useNewsPublisher(user?.uid, access.isAdmin, user?.displayName || user?.email?.split('@')[0])
  // The unread count on the app's icon (home screen / Dock), like WhatsApp.
  // Installed app only; the service worker bumps it when a push arrives
  // with the app closed, and this puts back the exact number on open.
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return
    const set = chatUnread > 0 ? navigator.setAppBadge(chatUnread) : navigator.clearAppBadge()
    set?.catch?.(() => {})
    navigator.serviceWorker?.controller?.postMessage({ type: 'ador-badge', count: chatUnread })
  }, [chatUnread])

  // Notificaciones push: keep this device's push address filed under whoever
  // is signed in, drop the ?open=… link once consumed, and follow a
  // notification tapped while ADOR OS was already open (the service worker
  // posts the link to this window instead of opening another one).
  useEffect(() => {
    refreshPushSubscription(user?.uid).catch(() => {})
  }, [user?.uid])
  useEffect(() => {
    if (openLink) {
      const url = new URL(window.location.href)
      for (const k of ['open', 'ct', 'cid', 'p', 'm', 't', 'nid', 'tab', 'task']) url.searchParams.delete(k)
      window.history.replaceState(null, '', url.pathname + url.search)
    }
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event) => {
      if (event.data?.type !== 'ador-open') return
      const link = parseOpenLink(new URL(event.data.url).search)
      if (link) {
        setActiveModule(link[0])
        setFocus(link[1])
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  // Modules are kept alive: the first visit mounts one, later visits just
  // reveal it (React <Activity>: hidden modules are display:none, their
  // effects/subscriptions are paused and their state, scroll and tab are
  // kept). Switching is therefore instant and never rebuilds a page — the
  // way a native app switches sections. See CLAUDE.md §57.
  const mainRef = useRef(null)
  // The top bar's pill and logo tuck away while scrolling down and return on
  // scrolling up (the profile/search/bell cluster always stays).
  const [navHidden, setNavHidden] = useState(false)
  const lastTop = useRef(0)
  const onMainScroll = (e) => {
    const top = e.currentTarget.scrollTop
    const delta = top - lastTop.current
    if (top < 60) setNavHidden(false)
    else if (delta > 6) setNavHidden(true)
    else if (delta < -6) setNavHidden(false)
    lastTop.current = top
  }
  const scrollPos = useRef({})
  const loaded = useRef(new Set())
  const [kept, setKept] = useState(() => [activeModule])

  const navigateTo = (moduleId, focusTarget = null) => {
    if (mainRef.current) scrollPos.current[activeModule] = mainRef.current.scrollTop
    const apply = () => {
      setActiveModule(moduleId)
      setFocus(focusTarget)
    }
    const load = moduleLoaders[moduleId]
    // A module visited for the first time whose code isn't downloaded yet:
    // fetch it first, so the screen never flashes a skeleton mid-switch.
    if (load && !loaded.current.has(moduleId)) {
      load().then(() => { loaded.current.add(moduleId); apply() }).catch(apply)
    } else {
      apply()
    }
  }

  const mountedIds = kept.includes(activeModule) ? kept : [...kept, activeModule]
  useEffect(() => {
    if (!kept.includes(activeModule)) setKept(mountedIds)
  }, [activeModule]) // eslint-disable-line react-hooks/exhaustive-deps

  // Each module keeps its own scroll position inside the shared <main>.
  useLayoutEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = scrollPos.current[activeModule] || 0
    lastTop.current = mainRef.current?.scrollTop || 0
    setNavHidden(false)
  }, [activeModule])

  // First-login gate lives on the profile doc (not localStorage) so it's
  // per-account, not per-device — see markOnboardingSeen in lib/firestore.js.
  // Skipped for the ?preview=1 mock user, same rule as every other write
  // that touches shared collections (CLAUDE.md §8).
  useEffect(() => {
    if (!user?.uid || user.uid === 'preview') return
    let cancelled = false
    getUserProfile(user.uid).then((profile) => {
      if (cancelled) return
      if (!profile?.onboardingSeenAt) setShowOnboarding(true)
      // Sin foto y sin haberlo visto antes: invitación a completar el perfil.
      if (!profile?.photoDataUrl && !profile?.profileSetupAt) setNeedsProfileSetup(true)
    })
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  // Prefetch the other modules once the browser is idle after login.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500))
    const cancel = window.cancelIdleCallback || clearTimeout
    const handle = idle(() => Object.entries(moduleLoaders).forEach(([id, load]) => load().then(() => loaded.current.add(id)).catch(() => {})))
    return () => cancel(handle)
  }, [])

  // After the app settles, pre-render the four main modules in the
  // background (hidden; React does it at low priority and runs no effects,
  // so nothing subscribes or fetches until you actually open one). Their
  // first visit is then a reveal, not a build.
  useEffect(() => {
    if (window.matchMedia?.('(max-width: 767px)').matches || navigator.connection?.saveData) return undefined
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200))
    const cancel = window.cancelIdleCallback || clearTimeout
    let handle
    let cancelled = false
    const list = ['workspace', 'objetivos', 'clientes', 'finanzas']
    const step = () => {
      if (cancelled) return
      const id = list.shift()
      if (!id) return
      if (access.canSee(id)) setKept((prev) => (prev.includes(id) ? prev : [...prev, id]))
      handle = idle(step, { timeout: 5000 })
    }
    const start = setTimeout(() => { handle = idle(step, { timeout: 5000 }) }, 3000)
    return () => {
      cancelled = true
      clearTimeout(start)
      if (handle) cancel(handle)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const finishOnboarding = () => {
    setShowOnboarding(false)
    if (user?.uid && user.uid !== 'preview') markOnboardingSeen(user.uid)
  }

  const renderModule = (id) => {
    if (!access.canSee(id)) return <NoAccess onHome={() => navigateTo('inicio')} />
    switch (id) {
      case 'admin':
        return <AdminModule user={user} />
      case 'inicio':
        return <HomeScreen user={user} onNavigate={navigateTo} />
      case 'workspace':
        return (
          <WorkspaceModule
            user={user}
            focusTaskId={focus?.type === 'task' ? focus.id : null}
            onFocusHandled={() => setFocus(null)}
            onNavigate={navigateTo}
          />
        )
      case 'clientes':
        return (
          <ClientesModule
            user={user}
            focusClientId={focus?.type === 'client' ? focus.id : null}
            onFocusHandled={() => setFocus(null)}
          />
        )
      case 'finanzas':
        return <FinanzasModule user={user} onNavigate={navigateTo} />
      case 'objetivos':
        return <ObjetivosModule user={user} onNavigate={navigateTo} />
      case 'calendario':
        return <CalendarioModule user={user} />
      case 'directorio':
        return <DirectorioModule user={user} focus={focus?.type === 'person' ? focus : null} onFocusHandled={() => setFocus(null)} />
      case 'conocimiento':
        return (
          <ConocimientoModule
            user={user}
            focusDocId={focus?.type === 'knowledge' ? focus.id : null}
            onFocusHandled={() => setFocus(null)}
          />
        )
      case 'news':
        return <NewsModule user={user} focus={focus?.type === 'news' || focus?.type === 'community' ? focus : null} onFocusHandled={() => setFocus(null)} />
      case 'chat':
        return <ChatModule user={user} scheduledMessages={scheduledMessages} focus={focus?.type === 'chat' ? focus : null} onFocusHandled={() => setFocus(null)} onNavigate={navigateTo} />
      case 'ador-ia':
        return <AdorIAModule user={user} />
      default:
        return <ModulePlaceholder name={MODULE_LABELS[id]} />
    }
  }

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#000000]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 50% 30%, rgba(244,238,226,0.06) 0%, transparent 60%)',
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
        navHidden={navHidden}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar activeModule={activeModule} onNavigate={navigateTo} badges={{ chat: chatUnread, news: newsAttention.count }} canSee={access.canSee} />

        {/* pb on small screens leaves room for the bottom tab bar. */}
        <main ref={mainRef} onScroll={onMainScroll} className="min-w-0 flex-1 overflow-y-auto pt-16 overflow-x-hidden [scrollbar-gutter:stable] pb-[calc(92px+env(safe-area-inset-bottom))] lg:pb-0">
          {mountedIds.map((id) => {
            const visible = id === activeModule
            return (
              <Activity key={id} mode={visible ? 'visible' : 'hidden'}>
                <div className="ador-module-in h-full">
                  <ModuleErrorBoundary resetKey={visible}>
                    <Suspense fallback={<ModuleSkeleton />}>{renderModule(id)}</Suspense>
                  </ModuleErrorBoundary>
                </div>
              </Activity>
            )
          })}
        </main>
      </div>

      <UpdateBanner />
      <OfflineBanner />
      <AchievementMoment />
      <BottomNav activeModule={activeModule} onNavigate={navigateTo} canSee={access.canSee} badges={{ chat: chatUnread, news: newsAttention.count }} />

      <AnimatePresence>{showOnboarding && <OnboardingTour key="onboarding" onFinish={finishOnboarding} />}</AnimatePresence>
      {needsProfileSetup && !showOnboarding && <ProfileSetupPrompt user={user} onUpdateDisplayName={onUpdateDisplayName} onDone={() => setNeedsProfileSetup(false)} />}

      {/* Hidden on Chat — that module already has its own real-time capture
          point (the message composer), so a second floating "+" doing
          something unrelated (a quick note, not a chat action) sits right
          where a Slack-like "new message" button would be expected and
          caused exactly that confusion in testing (see ChatModule.jsx). */}
      {activeModule !== 'chat' && <GlobalCapture user={user} actorName={actorNameFor(user)} />}
      <AssignmentConfirmGate user={user} actorName={actorNameFor(user)} onNavigate={navigateTo} />
      <IncomingCallGate user={user} />
      <OutgoingCallBanner user={user} />
      <ReminderGate user={user} onNavigate={navigateTo} />
      <ChatMessageToaster user={user} activeModule={activeModule} onNavigate={navigateTo} />
    </div>
  )
}
