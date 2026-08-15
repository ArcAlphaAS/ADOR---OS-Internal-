# ADOR OS

The internal operating system for ADOR, a 3-founder strategic intelligence firm. Built to orient, focus, and execute — not to passively display information.

Invite-only. Dark, glass-surfaced, quiet by design ("something Apple would ship internally," not a generic SaaS dashboard).

## Status

Phases 1–2 (Splash/Login/Welcome, shell + Home) and four Phase 3 modules — Clientes (SPC→SP pipeline CRM), Finanzas (financial dashboard), Workspace (Lista/Kanban/Timeline task board), and Objetivos (quarterly goals board) — are done and live. Calendario (deferred — using Google Calendar for now), Conocimiento, Comunidad, Chat, News, Directorio, and ADOR IA are still placeholders. See `PROJECT_STATE.md` for the current build checklist, and `CLAUDE.md` for architecture notes, decisions, and the next-steps handoff.

## Stack

React 19 + Vite + Tailwind CSS v4 + Framer Motion + Firebase (Auth + Firestore, both live). No UI component libraries — every control is hand-built.

## Running it

Node.js is not installed system-wide on this machine — a portable copy lives at `~/.local/node`, already on `PATH` via `~/.zshrc` (open a **new** terminal window to pick it up).

```bash
cd /Users/angelsamillan/Claude/ador-os
npm run dev
```

Open the printed `localhost` URL. Vite will pick a free port (usually 5173, sometimes higher if something else is already using it).

### Firebase config

Real project credentials live in `.env` (gitignored). Copy `.env.example` if you ever need to recreate it — the values are already filled in for the live `ador-os` Firebase project (Authentication: Email/Password only; Firestore: enabled, `nam5` region; Storage: **not yet enabled**, needed for real file uploads in Clientes → Documentos and Finanzas → Comprobante).

Firestore rules use a blanket `match /{document=**} { allow read, write: if isAllowed(); }` rule (confirmed 2026-08-15), so every collection — new or future — is covered automatically; no per-collection rule edits are needed. If a real write ever fails with `permission-denied`, check whether you're on the dev-only `?preview=1` mock session (no real auth, fails by design) or whether the signed-in email is missing from `allowedEmails`.

## Project structure

```
src/
  App.jsx                 Top-level state machine: Splash → Login → Welcome → AppShell
  firebase.js              Firebase init, guarded so missing config degrades to "logged out" instead of crashing
  index.css                Design tokens: .ador-glass, .ador-grain, .ador-modal-surface, .ador-btn-primary, .ador-skeleton, keyframes
  components/
    SplashScreen.jsx, LoginScreen.jsx, WelcomeScreen.jsx, Logo.jsx, LoadingRing.jsx   Phase 1 screens
    icons.jsx               Hand-drawn line icon set (no icon library)
    shell/                  TopBar, Sidebar, AppShell, ModulePlaceholder, NotificationCenter, ProfileMenu, ProfileModal, SettingsModal
    home/                   HomeScreen + its blocks (Greeting, Metrics, Finance, Interventions, MeetingDecision, Activity, QuickLinks)
    clientes/                Clientes module — ClientesModule, KanbanBoard/Column/Card, ListView, ClientDetailPanel + tabs/, NewClientModal
    finanzas/                Finanzas module — FinanzasModule (68/32 layout), MetricCards, FinanceChart (hand-drawn SVG bar chart), MovimientosTable, QuarterlyGoalCard, CategoryBreakdownCard, NextPaymentCard, AddIncomeModal, AddExpenseModal
    workspace/               Workspace module — WorkspaceModule (sidebar/main/Decisiones 3-column shell), ListaView (grid-based table + inline "+ Agregar tarea" draft row), KanbanView, TimelineView (5 zoom levels), TaskRow, TaskCells (shared PillCell/EstimationCell/DescriptionCell/AssigneeCell), CellPopover (portaled floating menu), TaskDetailPanel (incl. Historial), DecisionesPanel (collapsible), WorkspaceSidebar (incl. "Mis tareas" + "Carga del equipo" workload panel), AvatarStack, NewProyectoModal, RegisterDecisionModal
    objetivos/               Objetivos module — ObjetivosModule (cabecera/panel/rail lateral shell), NorthStarHero, ObjetivoCard (kpi progress bar / milestone checkbox), NewObjetivoModal, CheckinModal, IniciativasPanel (Focus Board — linked Workspace tasks), ExperimentosPanel (validation log)
  hooks/
    useAuth.js               Firebase auth wrapper
    useHomeData.js            Home's live-data hook — derives metrics/finance/interventions from clients
    useFinanceData.js         Finanzas' live-data hook — derives hero numbers/chart/breakdowns/runway projection from clients + expenses + incomes + settings
    useWorkspaceData.js       Workspace's live-data hook — derives Intervenciones from clients (never stored) + Proyectos Internos + tasks, grouped
    useObjetivosData.js       Objetivos' live-data hook — resolves each goal's currentValue from clients/tasks/useFinanceData (never hand-entered except `metric: 'custom'`) and each objetivo's openLinkedTasks (Workspace tasks tagged via objetivoId)
    useGlobalSearch.js        Top bar search — filters the same live clients/tasks/decisions subscriptions other modules already hold
    useTodaysBirthdays.js     Team-wide "who's celebrating today" — reads users/{uid}.birthday
    useCountUp.js             0→value count-up animation used by Finanzas hero numbers
    useClientNotifications.js Bell notifications ("sin contacto +7 días") — lives outside useHomeData since TopBar needs it everywhere
    useTaskNotifications.js   Bell notifications for overdue/due-today tasks assigned to the signed-in user — same "lives outside any one module" reasoning
    useWelcomeScreen.js       localStorage-driven "show Welcome once per day/block" logic
  lib/
    firestore.js             Collection schema + CRUD + subscribe hooks
    clientStages.js           SPC/SP pipeline stage constants, currency/date formatting, ADOR vocabulary helpers, LOST_REASONS
    finance.js                Expense categories, quarter-key helpers, ADOR vocabulary for Finanzas
    workspace.js              Task priorities/statuses/grid template, ADOR's 7-layer methodology, workstream id helpers, describeTaskChange() (history log copy), withTimeout() (write-hang safeguard), computeWorkload()
    objetivos.js              Objetivo metric definitions (live vs. custom), type vocabulary, confidence + experiment status palettes
    user.js                  Shared user-name helpers
```

## Design system quick reference

- Background `#0A0A0A`, text `#F5F5F5` / `#888888` / `#444444`, accent blue `#1E5FAD`, accent gold `#B8860B` (sparingly).
- Glass surfaces: `.ador-glass` (`background: rgba(255,255,255,0.05)`, `border: 1px solid rgba(255,255,255,0.1)`, `backdrop-filter: blur(24px) saturate(160%)`, drop shadow) + `.ador-grain` (0.03-opacity SVG noise overlay) on every card/surface.
- Pending-data states use `.ador-skeleton` (shimmer sweep) instead of static dashes — reads as "waiting for data," not "broken."
- Full rationale and the trickier decisions (why floating UI uses portals, why the shell nav is split the way it is) are in `CLAUDE.md`.
