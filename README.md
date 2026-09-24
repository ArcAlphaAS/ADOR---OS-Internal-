# ADOR OS

The internal operating system for ADOR, a 3-founder strategic intelligence firm. Built to orient, focus, and execute — not to passively display information.

Invite-only. Dark, glass-surfaced, quiet by design ("something Apple would ship internally," not a generic SaaS dashboard).

**Live:** https://ador-os.adorfirm.workers.dev — installable on phone and iPad (Safari → Compartir → *Añadir a pantalla de inicio*; Chrome → *Instalar app*).

## Status

Every module is built and live: Inicio, Workspace (Hoy / Lista / Kanban / Timeline), Objetivos, Clientes (SPC→SP CRM), Finanzas, Calendario (Google Calendar), Conocimiento, News + Comunidad, Comunicación (DMs, groups, channels, threads, Google Meet calls), Directorio, ADOR IA (local rule-based engine), and Administración (invite people, roles, member access, error log, data). Files and backups live in Google Drive. Global search covers everything, including chat messages.

Still open: activate the stricter Firestore rules (`firestore.rules`, drafted) before inviting the first non-admin member; push notifications with the app closed.

- `PROJECT_STATE.md` — the living checklist of what's built and what's next.
- `CLAUDE.md` — architecture notes, the reasoning behind each decision, and the session handoff.

## Stack

- **Front end:** React 19 + Vite + Tailwind CSS v4 + Framer Motion. No UI component, chart or icon libraries — every control is hand-built.
- **Data & auth:** Firebase Authentication (email/password, invite-only) + Cloud Firestore (`nam5`). Free Spark plan.
- **Google:** one per-person connection (OAuth) for Calendar (read-only), Meet (create call rooms) and Drive (`drive.file` — only files the person picks or ADOR OS creates).
- **Hosting:** Cloudflare Workers (static assets + a small API), free plan, deployed from GitHub on every push to `main`.

Everything runs on free tiers; no billing account is attached anywhere.

## Running it locally

Node.js is not installed system-wide on this machine — a portable copy lives at `~/.local/node`, already on `PATH` via `~/.zshrc` (open a **new** terminal window to pick it up).

```bash
cd /Users/angelsamillan/Claude/ador-os
npm run dev
```

Open the printed `localhost` URL (usually 5173). This runs the app only; the `/api/*` functions (connect Google, Meet rooms) run with Cloudflare's own dev server:

```bash
npx wrangler dev
```

`?preview=1` in the URL is a dev-only mock login for screenshots — it has no real Firebase session, so real reads/writes fail by design.

### Configuration

Real values live in `.env` (gitignored; `.env.example` has the names). On Cloudflare they're set in the Worker's settings (ador-os → Settings):

| Where | Variables |
|---|---|
| **Build variables** (baked into the app by Vite — not secret) | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY` |
| **Runtime variables and secrets** (read by the `/api` functions) | `GOOGLE_CLIENT_SECRET` (secret), `VITE_GOOGLE_CLIENT_ID` |

Never give a secret a `VITE_` prefix — Vite would compile it into the shipped JavaScript.

### Deploying

Push to `main`. Cloudflare Workers Builds runs `npm run build` then `npx wrangler deploy` (config in `wrangler.jsonc`) and publishes in 1–2 minutes. Progress and logs: Cloudflare dashboard → Workers & Pages → ador-os → Deployments.

### Access

Only emails with a document in Firestore `allowedEmails/{email}` can read or write anything. People are invited from **Administración → Personas** (creates the account and sends a "choose your password" email); roles are Administrador (everything) and Miembro (modules chosen in Administración → Accesos).

The Firestore rules live today are the original blanket rule (any allowed account can do everything). The stricter role-aware rules are in `firestore.rules` — **test them before pasting into Firebase → Firestore → Rules** (see `CLAUDE.md` §37).

## Project structure

```
server/                     The only server-side code (runs on Cloudflare)
  handlers.js               Host-independent handlers: Google OAuth exchange/refresh, Meet room creation, dormant Gemini proxy
  worker.js                 Cloudflare Worker entry — routes /api/* to the handlers, serves the built app otherwise
  cloudflare.js, vercel.js  Adapters (Vercel is paused; api/ + vercel.js go away when it's deleted)
wrangler.jsonc              Cloudflare Workers config
firestore.rules             Role-aware Firestore rules — drafted, not live yet
public/                     Icons (favicon, apple-touch, 192/512), manifest.webmanifest, logos, onboarding images
src/
  App.jsx                   Splash → Login → Welcome → AppShell; registers users/{uid} on login
  firebase.js               Firebase init, guarded so a missing config degrades instead of crashing
  index.css                 Design tokens: .ador-glass, .ador-grain, .ador-modal-surface, .ador-skeleton, keyframes
  components/
    shell/                  AppShell (routing, lazy modules), TopBar, Sidebar, BottomNav (phones/iPad portrait),
                            SearchResults, NotificationCenter, ProfileMenu/Modal, SettingsModal, call/reminder/assignment gates,
                            ChatMessageToaster, ModuleErrorBoundary
    home/                   Inicio and its cards (greeting, weekly summary, finance, next meeting, tasks…)
    workspace/              Hoy, Lista, Kanban, Timeline, Personal overview, task detail panel
    objetivos/              Goals board, North Star, check-ins, experiments, Decisiones
    clientes/               SPC→SP pipeline CRM, list, client detail panel (Documentos from Drive)
    finanzas/               Financial dashboard, projections, goals, movements, income/expense modals
    calendario/             Google Calendar views (day/week/month/agenda)
    conocimiento/           Markdown knowledge base
    news/                   Anuncios + Comunidad
    chat/                   Comunicación (conversations, threads, composer, polls, calls, search, side panels)
    directorio/             People, org chart, teams, roles
    adoria/                 ADOR IA chat
    admin/                  Administración (people & invites, member access, error log, Drive folder & backups)
    onboarding/             "Conoce ADOR OS" walkthrough
  hooks/                    Live-data hooks per module (useFinanceData, useWorkspaceData, useChatData…), useAccess (role),
                            useGlobalSearch, useGoogleCalendar/useGoogleMeet/useDrivePicker, useScheduledSender, usePresenceHeartbeat
  lib/
    firestore.js            Every collection's reads/writes/subscriptions
    access.js, permissions.js, invite.js      Roles, member modules, invitations
    googleCalendar.js, googleDrive.js         Google OAuth, Calendar, Meet, Drive picker, backup upload
    backup.js, errorLog.js                    "Exportar todo" and the error log
    chat*.js                                   Chat rules, derived indexes, drafts, sending, retention
    finance.js, clientStages.js, workspace.js, objetivos.js, weeklySummary.js, adorIA.js, knowledge.jsx, …   Per-module logic
```

## Design system quick reference

- Background `#0A0A0A`, text `#F5F5F5` / `#888888` / `#444444`, accent blue `#1E5FAD`, accent gold `#B8860B` (sparingly; Comunicación uses graphite and gold).
- Glass surfaces: `.ador-glass` + `.ador-grain` on every card; `.ador-modal-surface` for modals and side panels.
- Floating UI (dropdowns, tooltips, popovers) is portaled to `document.body` and positioned from the trigger's rect — never nested in a shrink-wrapped container.
- Never put a transform animation and a backdrop blur on the same element (Chromium drops the blur) — split them into two nested elements.
- Pending data uses `.ador-skeleton` (shimmer), not static dashes.
- Below 1024px the app uses a bottom tab bar instead of the side capsule and top tabs.
- Full rationale for these and every other decision is in `CLAUDE.md`.
