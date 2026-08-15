# ADOR OS — Project State

Last updated: 2026-08-14 (night). This is the living status snapshot — update the checklists below whenever something ships or a blocker changes. For *why* things were built the way they were, see `CLAUDE.md`; that file changes rarely, this one changes often.

## Phase status

| Phase | Status |
|---|---|
| Phase 1 — Splash, Login, Welcome | ✅ Done |
| Phase 2 — Shell + Home | ✅ Done |
| Phase 3 — Clientes module | ✅ Done (2026-08-14) |
| Phase 3 — Finanzas module | ✅ Done (2026-08-14) |
| Phase 3 — Workspace module (Lista + Kanban + Timeline) | ✅ Done (2026-08-14) |
| Phase 3 — remaining modules (Objetivos, Calendario, Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA) | ⬜ Not started |

## What's actually built

**Phase 1**
- [x] Splash — click/keypress-to-continue, 6-dot loading ring, matches reference
- [x] Login — email/password only (Google OAuth removed 2026-08-14 — self-serve sign-in didn't fit invite-only model), glass card, graduated liquid-glass buttons, back-navigation via real browser history
- [x] Welcome — time-of-day greeting, shows once/day or on post-13:00 return, localStorage-driven

**Phase 2 — Shell**
- [x] Top bar — centered pill-tab nav (Inicio, Workspace, Objetivos, Clientes, Finanzas), no background of its own
- [x] Sidebar — floating capsule (Calendario, Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA) — Calendario moved here from the top bar 2026-08-14
- [x] Search icon → expands to input (non-functional placeholder, real UI)
- [x] Notification bell → dropdown, now with real live notifications: SPCs sin contacto +7 días (Clientes) and overdue/due-today tasks assigned to the signed-in user (Workspace)
- [x] Profile avatar → hover reveals name/role (smooth push-reflow animation, no overlap), click opens compact dropdown (Mi Perfil / Configuración / Cerrar Sesión — all three wired)
- [x] Mi Perfil modal — edit and save display name (Firebase `updateProfile`)
- [x] Configuración modal — change password via reset email
- [x] Module placeholders for everything except Inicio ("En construcción")

**Phase 2 — Home (only module with real content)**
- [x] Greeting block — 56px gradient text, rotating subtext, live clock-independent date
- [x] Metrics row (3 cards) — shimmer skeletons, no real values
- [x] Interventions card — pulsing live-dot, shimmer empty state
- [x] Meeting + Decision cards — breathing icons, empty-state copy
- [x] Finance block — latest monthly revenue, % change vs. prior month, hand-drawn SVG sparkline (last 6 months), shimmer empty state. **Derives from real client payment records** (`clients/{id}.pago1`/`pago2`), not a manually-entered collection — see below
- [x] Activity list — pulsing dot, "todo al día" empty state
- [x] Quick Links — Google Drive only
- [x] Metrics + notifications now use ADOR vocabulary and real Clientes data ("SPC en Pipeline", "SP Activos"; bell shows real "sin contacto +7 días" items)

**Phase 3 — Clientes module (2026-08-14)**
- [x] Full SPC→SP pipeline CRM — 7 stages (Generación → Contacto → Calificación → Lectura → Propuesta Comercial → Cierre → Intervención Activa), ADOR vocabulary throughout (never "cliente"/"prospecto")
- [x] Kanban view — drag-and-drop between stage columns (Framer Motion, hit-tested against column rects), glow-pulse animation + gray→blue accent change on SPC→SP conversion
- [x] List view — sortable, filterable (stage/type/asociado/pago), searchable, inline-editable "next step", hover quick-actions
- [x] View toggle persists per user in `users/{uid}.clientesView`
- [x] Ficha detail panel (480px slide-in) — General (editable fields, contact, auto-save notes), Pagos (60/40 split, auto-unlock Pago 2, auto "Intervención Pagada" badge), Documentos (drag-drop, **metadata only — see Infrastructure status**), Historial (auto-logged events + manual "Registrar interacción")
- [x] "+ Nuevo SPC" 3-step modal (Organización → Contacto → Pipeline)
- [x] Living-system connections verified end-to-end: SPC→SP conversion updates Home's "SP Activos" + Intervenciones Activas; payments marked Recibido update Home's Resumen Financiero; stale SPCs (+7 días sin avance) surface in the notification bell
- [x] Self-registering `users/{uid}` directory (App.jsx, on login) — populates "Asociado responsable" pickers without a Firebase Admin SDK backend

**Phase 3 — Finanzas module (2026-08-14)**
- [x] Asymmetric dashboard layout (68% left / 32% right, per direct user reference)
- [x] Hero numbers (Ingresos del mes, Gastos del mes, Utilidad Neta) — no cards, typography only, count-up animation, delta pill vs. previous month
- [x] Hand-drawn SVG area+line chart, last 6 months, Ingresos/Gastos/Ambos toggle, hover tooltip, active-month highlight band. Built hand-drawn (no Recharts/Chart.js) to match the project's existing "no charting library" convention (see `FinanceBlock.jsx`'s Sparkline) instead of the literal prompt suggestion — consistent with "no UI component libraries" project-wide
- [x] Últimos Ingresos / Últimos Gastos — merges real SP payments (`clients/{id}.pago1`/`pago2` marked Recibido) with manual entries; "Ver todos" expands the list in place rather than linking to a page that doesn't exist yet
- [x] Meta del Trimestre — editable target (pencil icon, inline input), animated progress bar, stored in `settings/finanzas`
- [x] Gastos por Categoría — current-month breakdown across 6 fixed categories (Salarios, Operaciones, Herramientas, Marketing, Desplazamientos, Otros)
- [x] Registrar — "+ Ingreso Manual" and "+ Gasto" modals, both wired to Firestore (`incomes`, `expenses` collections)
- [x] Gasto's "Comprobante" field is metadata-only (name/type/size), same pattern and same reason as Clientes → Documentos — Firebase Storage isn't enabled yet
- [x] Living-system connection verified: reads the same `clients/{id}.pago1`/`pago2` fields Clientes and Home already use — no parallel manually-entered revenue ledger introduced
- [ ] **Action needed:** verify in Firebase Console that the existing Firestore security rules (auth + `allowedEmails` check) cover the new `expenses`, `incomes`, and `settings` collections — they were added to `lib/firestore.js` but this repo has no local `firestore.rules` file to edit (rules are managed live in console, per existing project setup)

**Phase 3 — Workspace module (2026-08-14, built across several follow-up passes same day/night)**
- [x] Two kinds of work: Intervenciones (one per active SP, derived live from `clients` — never stored, see CLAUDE.md §10) and Proyectos Internos (new `proyectosInternos` collection, created manually by any Asociado)
- [x] Lista view — grouped by workstream in real `.ador-glass` cards (type badge, progress bar), each group a CSS Grid table (`TASK_ROW_GRID`, not an HTML `<table>` — see CLAUDE.md §10 for why) with columns **Tarea / Descripción / Asignado / Prioridad / Estimación / Estado**, all independently inline-editable via small popovers (`CellPopover.jsx`, `TaskCells.jsx`). Column headers always render, even with zero tasks. 7-layer indicator row for Intervenciones (computed from `interventionWeek`/`interventionTotalWeeks`, no new field)
- [x] "+ Agregar tarea" is a full draft row — Descripción/Asignado/Prioridad/Estimación can all be set *before* the task is created, reusing the exact same cell components as real rows (local draft state until Enter-on-title saves everything at once)
- [x] Empty Workspace (zero Intervenciones + zero Proyectos) shows a synthetic "General" group instead of a blank message — first task added through it auto-provisions a real `proyectosInternos` doc
- [x] Kanban view — 4 status columns (Por Hacer / En Progreso / Completado / Bloqueado), hand-built Framer Motion drag-and-drop reusing Clientes' rect hit-test pattern
- [x] Timeline view — pixel-mapped date axis, "Hoy" line, rounded date-bounded bars, diamond milestones for due-date-only tasks. **5 zoom levels** (Día/Semana/Mes/Trimestre/Año), each controlling pixel scale, default window, and tick granularity; auto-scrolls to center "Hoy" on range change. Tasks carry an optional `startDate` (set via the Estimación cell or Task Detail Panel) to give them real duration
- [x] "Mis tareas" — sidebar toggle filtering all three views to tasks assigned to the signed-in user, independent of the workstream selector, with a live open-task count badge
- [x] Task Detail Panel — slide-in 440px, editable title/descripción/status/priority/start+due date/multi-assignee, delete with a second confirming click (no native browser `confirm()`), read-only **Historial** section at the bottom
- [x] Per-task activity history — `tasks/{id}/history` subcollection (same shape as Clientes'), auto-logged (no manual entry) from every edit surface via `applyTaskUpdate()` — Lista's cells, the Task Detail Panel, and Kanban drag-and-drop all funnel through it
- [x] Overdue/due-today tasks assigned to the signed-in user now surface in the top bar bell (`useTaskNotifications.js`), alongside the existing "SPC sin contacto" alerts
- [x] Decisiones panel — fixed right rail, last 3 decisions, "+ Registrar Decisión" (new `createDecision()` — decisions collection existed for reads only before this). Shows up in Home's "Última Decisión" automatically, same collection
- [x] Tasks schema: `workstreamId`, `description`, `assignedTo` (array), `priority`, `startDate`/`dueDate`, and a 4-state `status` (`por_hacer`/`en_progreso`/`completado`/`bloqueado`) — `TasksTodayBlock.jsx`/`useHomeData.js` updated to match the 4-state vocabulary
- [x] Every write (create/update) now shows a toast on failure and times out after 8s instead of hanging silently forever — found and fixed after a report of "+ Agregar tarea no funciona" that turned out to be a write with no valid auth token never resolving
- [x] **Bug fixed while building Timeline:** `.ador-grain`'s `position: relative` was unlayered CSS silently beating Tailwind's layered `.fixed` utility, breaking every panel combining the two (Task Detail Panel, and pre-existing `ClientDetailPanel` in Clientes) — panels rendered off-screen instead of sliding in. Fixed in `index.css` via `@layer components`; see CLAUDE.md §10. Worth a quick manual check next time Clientes → Ficha is touched
- [ ] **Action needed:** same Firestore-rules check as Finanzas (§9) — `proyectosInternos` and the `history` subcollection under `tasks` need to be covered by the console rules before real writes succeed for real (non-preview) accounts

**Not built yet**
- [ ] No module besides Inicio, Clientes, Finanzas, and Workspace has real content (Objetivos, Calendario, Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA all show placeholder)
- [ ] Documentos tab (Ficha panel) and Finanzas' Comprobante field only store file **metadata** (name, type, size) — actual file upload needs Firebase Storage enabled, which hasn't happened yet. Download button is present but disabled with an explanatory tooltip

**Scoped but not started (2026-08-14 evening conversation) — direction agreed, nothing built yet:**
- **Chat** — basic real-time messaging (channels + DMs) is realistic and cheap to build reusing existing Firestore-subscription patterns; full Slack/Teams parity (threads, reactions, search, calls) is explicitly out of scope. User confirmed: later, not now.
- **Comunidad** — internal-only (just the 3 founders/asociados, not SPs). Leaning toward a lightweight "team pulse" (short wins/announcement posts + simple reactions) rather than a literal LinkedIn-style feed, since a feed format needs an audience size this team doesn't have. Must stay clearly distinct from Home's "Actividad Reciente" (automatic/system) and Workspace's "Decisiones" (formal/strategic) — Comunidad is the human/informal one. User confirmed: later, not now.
- **Noticias** — official/formal company announcements (newsroom style: "ADOR cierra partnership con X"), authored by the team, not scraped from external sources — explicitly *not* an external news-API integration. Distinct from Comunidad by tone (formal headline vs. casual post), not by audience. User confirmed: later, not now.
- **ADOR IA** — direction still being worked out. Agreed starting point: a "pregúntale a tus datos" interface (chat-styled UI, keyword-matched answers computed from real Finanzas/Clientes/Workspace data — zero API cost) as the guaranteed-free baseline. User then asked for real Alfred-from-Batman-style conversational personality, which keyword-matching can't deliver convincingly — recommended pairing it with a genuinely free-tier LLM (e.g. Gemini API's free tier) for real conversational wit without a bill, vs. a scripted-fallback hybrid if zero external API is a hard requirement. **Not yet decided which of these two paths to take** — pick this up next session before starting to build.

## Infrastructure status

| Piece | Status |
|---|---|
| Node.js | Portable install at `~/.local/node`, on `PATH` via `~/.zshrc` |
| Firebase project (`ador-os`) | Created |
| Firebase Authentication | Enabled — **Email/Password only**. Google OAuth was enabled then removed 2026-08-14 (self-serve sign-in let any Google account in; invite-only model needs admin-provisioned accounts instead) |
| Firebase Firestore | ✅ Enabled 2026-08-13, `nam5` (US) region. Rules require `request.auth != null` AND the user's email to have a document in `allowedEmails/{email}` — access control enforced at the data layer, not just the login screen. All 3 founder emails added as of 2026-08-14 |
| Deployment | ✅ Vercel — `ador-os-internal.vercel.app`, auto-deploys on push to `main`. Firebase Hosting not used (redundant with Vercel) |
| `.env` (Firebase config) | Present locally, gitignored. Same values set as Environment Variables in Vercel project settings |
| Git repository | ✅ Initialized, initial commit made 2026-08-13 |
| GitHub | ✅ Private repo `ArcAlphaAS/ADOR---OS-Internal-`, `main` pushed and tracked, connected to Vercel for CI deploys |

## Open blockers

None. Auth + access control + deployment are all done and live.

## Next steps

See "Next recommended steps" in `CLAUDE.md` for the full reasoning. Short version: verify Firestore rules cover the new Finanzas + Workspace collections (`expenses`, `incomes`, `settings`, `proyectosInternos`, and `tasks/{id}/history`), then enable Firebase Storage for real Documentos/Comprobante uploads. Calendario is intentionally deferred — Google Calendar covers it for now (2026-08-14 decision). Chat/Comunidad/Noticias/ADOR IA all have agreed direction (see "Scoped but not started" above) but the user explicitly wants them later, not now — don't start building any of them without being asked. If ADOR IA does get picked up next, resolve the free-tier-LLM-vs-scripted-hybrid decision with the user first.
