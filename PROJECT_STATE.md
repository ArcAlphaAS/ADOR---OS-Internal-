# ADOR OS — Project State

Last updated: 2026-08-15 (night). This is the living status snapshot — update the checklists below whenever something ships or a blocker changes. For *why* things were built the way they were, see `CLAUDE.md`; that file changes rarely, this one changes often.

## Phase status

| Phase | Status |
|---|---|
| Phase 1 — Splash, Login, Welcome | ✅ Done |
| Phase 2 — Shell + Home | ✅ Done |
| Phase 3 — Clientes module | ✅ Done (2026-08-14, extended 2026-08-15) |
| Phase 3 — Finanzas module | ✅ Done (2026-08-14, extended 2026-08-15) |
| Phase 3 — Workspace module (Lista + Kanban + Timeline) | ✅ Done (2026-08-14, extended 2026-08-15) |
| Phase 3 — Objetivos module | ✅ Done (2026-08-15) |
| Phase 3 — ADOR IA (chat over live data, rule-based local engine — Gemini built but deferred by user choice) | ✅ Done (2026-08-16) |
| Phase 3 — remaining modules (Calendario, Conocimiento, Comunidad, Chat, News, Directorio) | ⬜ Not started |
| "Conoce ADOR OS" — first-login walkthrough | ✅ Done (2026-08-16) |

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
- [x] **Confirmed 2026-08-15:** rules cover this and every other collection — the project uses a blanket `match /{document=**} { allow read, write: if isAllowed(); }` rule (see Infrastructure status below), not a per-collection allowlist, so nothing new ever needed an explicit rules addition

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
- [x] **Confirmed 2026-08-15:** covered by the same blanket rule, see Finanzas note above — no per-collection action was ever needed

**Phase 3 — Objetivos module (2026-08-15) — new**
- [x] Flat goals board for the current quarter (no per-quarter history browsing yet — same "one target at a time" precedent as Finanzas' Meta del Trimestre). Two objetivo types: `kpi` (numeric, progress bar) and `milestone` (checkbox, no number)
- [x] KPI metrics are **live-derived**, never hand-entered, same rule as every other cross-module number in this app: `revenue_quarter` (reuses `useFinanceData`'s `recaudadoTrimestre`), `sp_activos`/`spc_pipeline` (from `clients`), `tasks_completadas` (tasks with `status==='completado'` created this quarter). A `custom` metric type is the escape hatch for goals with no matching collection (e.g. "Contratar un cuarto asociado") — its `currentValue` is the only manually-edited number anywhere in this module, pencil-edit inline like Finanzas' target
- [x] New collection `objetivos/{id}` — see `lib/objetivos.js` for metric definitions, `hooks/useObjetivosData.js` for the live-value resolution, `components/objetivos/`
- [x] **Redesigned same day** from a detailed OKR-style spec, adapted to ADOR's 3-founder scale — see CLAUDE.md §12 for the full reasoning on what was kept vs. changed vs. skipped. Added: ★ North Star Metric (any kpi objetivo can be promoted, shown as a hero card via `setNorthStar()`), quarter countdown, free-text "Foco" grouping (`FOCO_SUGGESTIONS`, not a fixed department taxonomy), single `ownerId` per objetivo (avatar), a 3-field weekly confidence check-in (`submitCheckin()` — verde/amarillo/rojo + bloqueo + progreso, latest-state-only, no history yet), and `tasks/{id}.objetivoId` linking Workspace tasks to the objetivo they're moving (editable from Task Detail Panel, live count shown on the card)
- [x] **Layout restructured same day (third pass) after user feedback** — see CLAUDE.md §14. North Star hero is now its own always-visible header section (real empty state instead of disappearing when unset), and the board is now a 3-part shell: cabecera → panel de Objetivos (main) → 320px rail lateral with `IniciativasPanel.jsx` (Focus Board — real linked Workspace tasks, read-only) and `ExperimentosPanel.jsx` (the previously-deferred experiment/validation log — new `experimentos` collection, hypothesis/result/status, optionally linked to an objetivo)
- [x] **Bug fixed same pass:** every write in this module (create, check-in, pencil-edit, ★ toggle, milestone checkbox, delete, experiment CRUD) was silently swallowing errors — no `catch`, so a Firestore-rules rejection looked exactly like a broken button. Fixed with the same `withTimeout` + toast pattern already used in Workspace (§10). This is how the missing-rules gap below was actually confirmed live, not just flagged in the abstract
- [x] **Confirmed 2026-08-15 (user shared the actual rules):** covered by the same blanket rule. The "Missing or insufficient permissions" toast seen earlier tonight was a false alarm — it came from testing via the dev-only `?preview=1` mock user, which has no real Firebase Auth session and fails `isAllowed()` on *every* collection by design, not a reflection of the real rules

**Clientes — extended 2026-08-15**
- [x] Sequential human-readable IDs (`ADR-0001`, `ADR-0002`, ...) assigned at creation via an atomic Firestore transaction on `settings/counters.clientSeq` — separate from the Firestore doc id, shown in List view, Kanban cards, and the Ficha header. Prefix is "ADR" (the firm), not "SPC", since the code must stay valid after SPC→SP conversion. Existing clients created before this change have no `code` and show "—"; ask before backfilling
- [x] "Perdido" (lost) is a flag on top of whatever `stage` the client froze at (`lost`, `lostReason`, `lostAt`), not an 8th pipeline stage — the 7 STAGES entries are a forward-only Kanban/next-arrow pipeline and lost isn't "the next step" from anywhere. Marked/restored from the Ficha panel (`ClientDetailPanel.jsx`'s `LostControl`), fixed reason list (`LOST_REASONS` in `clientStages.js`). Lost clients drop out of Kanban/List automatically; a "Perdidos (N)" toggle in `ClientesModule.jsx` shows them in a flat restorable list (`LostClientsView.jsx`)

**Workspace — extended 2026-08-15**
- [x] Decisiones panel is now collapsible (56px icon rail ↔ 280px full panel), so it no longer permanently eats width from the main task table. Preference persists per user (`users/{uid}.decisionesCollapsed`), same pattern as `workspaceView`
- [x] "Carga del equipo" workload panel in the sidebar — per-associate count of open (non-completado) tasks, highlighting anyone with 5+ tasks due this week in red. `computeWorkload()` in `lib/workspace.js`. First cross-teammate visibility Workspace has had; "Mis tareas" only ever showed your own load

**Finanzas — extended 2026-08-15**
- [x] "Proyección de Caja" (`RunwayCard.jsx`) — the one forward-looking card on an otherwise all-actuals dashboard. `cashBalance` is manually entered (no bank integration exists) via the same pencil-edit-inline pattern as Meta del Trimestre, stored at `settings/finanzas.cashBalance`. Projects 30/60-day cash by combining that balance with the average burn rate of the last 3 *completed* months and any dated pending SP payments — never invents a parallel forecast source

**Home — Resumen Semanal added 2026-08-15**
- [x] A Monday–Sunday synthesis card on Home (`WeeklySummaryCard.jsx`) with a one-line TL;DR, opening a full slide-in panel (`WeeklySummaryPanel.jsx`) on click — Finanzas/Objetivos/Workspace/Clientes sections plus a birthdays-this-week callout. All numbers are live-derived from existing subscriptions (Finanzas' movements, Workspace's tasks/workload, Objetivos' confidence state, Clientes' pipeline) — nothing hand-entered
- [x] Deliberately does real synthesis, not a number dump — `lib/weeklySummary.js`'s `buildWeeklyNarrative()` names specific clients/objetivos/people instead of just counts, and compares the North Star's progress % against how much of the quarter has elapsed (`quarterElapsedPct()`) to say "ahead of/behind pace," not just a bare percentage. The TL;DR picks the 1–2 most urgent signals (blocked objetivos first, then risk/warning signals) rather than always showing the same fact
- [x] New `tasks/{id}.completedAt` field (set/cleared by `toggleTaskComplete`/`applyTaskUpdate` in `lib/firestore.js`) — needed so "tasks completed this week" has a real timestamp instead of guessing from `createdAt`. Tasks completed before this change won't retroactively count, which is expected, not a bug

**Top bar — extended 2026-08-15**
- [x] Global search is real now (`useGlobalSearch.js`, `SearchResults.jsx`) — searches clients/tasks/decisions across their live subscriptions (no server-side text index; fine at 3-founder scale) and clicking a result navigates to the right module *and* opens that record's detail panel via a new `focus` state lifted to `AppShell.jsx` (`focusClientId`/`focusTaskId` props consumed by `ClientesModule`/`WorkspaceModule`, cleared via `onFocusHandled`)
- [x] Team-wide birthday banner + notification (`BirthdayBanner.jsx` on Home, `useTodaysBirthdays.js`) — reads the `users/{uid}.birthday` field `ProfileModal.jsx` already captured but never used until now

**Home — Resumen Semanal (2026-08-15) — new**
- [x] `WeeklySummaryCard.jsx` on Home — a synthesized Monday-Sunday digest, not just numbers restated. `lib/weeklySummary.js`'s `buildWeeklyNarrative()` turns raw aggregates into named callouts ("Bloqueados: {objetivo real}", not "1 objetivo bloqueado") and a prioritized TL;DR (blocked Objetivos first, then at-risk signals — stale client, overloaded teammate, revenue drop ≥20%). Click opens `WeeklySummaryPanel.jsx`, a full slide-in breakdown by Finanzas/Objetivos/Workspace/Clientes, plus birthdays that week
- [x] The one piece of real quantitative reasoning: compares the North Star objetivo's progress % against how much of the quarter has actually elapsed (`quarterElapsedPct()`) and says "al ritmo esperado" or "por debajo" — the only place in the app that answers "are we on track" instead of just showing a raw number
- [x] New field `tasks/{id}.completedAt` (set by `toggleTaskComplete`/`applyTaskUpdate` in `lib/firestore.js`, cleared on reopen) — needed for "tasks completed this week"; tasks completed before this shipped won't retroactively count in past weeks, which is expected

**ADOR IA (2026-08-15/16) — first backend code in this project, currently running on a local engine instead**
- [x] `api/ador-ia.js` (Vercel serverless function, the **only** server-side code in the repo) proxies to Gemini's free tier (`gemini-2.5-flash`) and is fully built and working — but it's **not what's live**. The API key is deliberately **not** a `VITE_` env var (a `VITE_` var compiles straight into the shipped client JS, readable by anyone in devtools); `GEMINI_API_KEY` would live only in Vercel's server-side env vars.
- [x] **What's actually live (2026-08-16):** a zero-cost, zero-API local rule-based engine — `answerLocally()` in `lib/adorIA.js`, called directly from `AdorIAModule.jsx`, no network call at all. User has a real free Gemini key already created in Google AI Studio but chose **not** to add it to Vercel, explicitly to avoid any perceived risk of a surprise charge — even after confirming the Free tier has no billing account attached and structurally cannot charge without one. This is a standing preference, not a one-time no; don't re-pitch connecting Gemini unless the user brings it up first.
- [x] The local engine is a small deterministic synthesizer (same family as `lib/weeklySummary.js`'s narrative builder), not simple keyword matching: `computeSignals()` cross-references objetivos bloqueados, North Star pace vs. quarter-elapsed, team overload, overdue tasks, stale clients, and cash runway into a ranked list, which powers two cross-module questions ("¿cómo estamos?", "¿qué debería priorizar?") that reason across all modules instead of answering one topic in isolation. Each signal also carries a `reason` string for "¿por qué?" follow-ups.
- [x] **Conversational memory, in-session only:** `answerLocally()` returns `{ text, topic }`; `AdorIAModule.jsx` threads `topic` through a ref so a short/pronoun-only follow-up ("¿por qué?", "y eso", "detalla") resolves against the previous turn's topic (`isFollowUp()` in `lib/adorIA.js`) instead of hitting the generic fallback. Still resets on page reload — no Firestore persistence.
- [x] **Message cap:** `messages` state is capped at 50 (`MAX_MESSAGES` in `AdorIAModule.jsx`) so a very long session can't grow memory/render unbounded; once the cap is first hit, a one-time subtle line appears above the thread ("Mostrando los últimos 50 mensajes...") so it never reads as a bug.
- [ ] **If the user ever wants real generative answers:** `api/ador-ia.js` and `ADOR_IA_SYSTEM_PROMPT` are untouched and ready — just add `GEMINI_API_KEY` in Vercel and swap `AdorIAModule.jsx`'s `send()` back to calling `/api/ador-ia` (git history from 2026-08-15 has the exact previous wiring). Not needed unless the user changes their mind on the billing concern above.
- [ ] **Known limitation, accepted for v1 (applies if/when Gemini path is reactivated):** `api/ador-ia.js` has no Firebase Auth verification of its own — it trusts the endpoint URL isn't public knowledge, same tradeoff as the rest of this invite-only tool.

**"Conoce ADOR OS" (2026-08-16) — first-login walkthrough, not called a "tutorial" per user's explicit request**
- [x] `OnboardingTour.jsx` (`src/components/onboarding/`) — full-screen slide carousel, one slide per module (Inicio/Workspace/Objetivos/Clientes/Finanzas/ADOR IA), modeled on Apple's post-setup "Hello" screens rather than spotlight coach marks anchored to live UI (avoids the fragility CLAUDE.md §1 already flags for anchored floating elements)
- [x] Shows automatically once per account on first login — gated by `users/{uid}.onboardingSeenAt` (Firestore, not localStorage, so it's per-account not per-device), written via `markOnboardingSeen()` in `lib/firestore.js` when the tour closes (Omitir or finishing the last slide, both count)
- [x] Re-openable any time from **Configuración → "Conoce ADOR OS"** — `AppShell.jsx` owns a local `showOnboarding` boolean that both the first-login effect and the Settings button can set to `true`
- [x] Skipped entirely for the `?preview=1` mock user (no Firestore write attempted), same rule as every other write touching shared collections
- [x] **Real bug found and fixed during testing:** the slide crossfade originally used `AnimatePresence mode="wait"`, which silently froze after ~2 transitions — the `index` state kept advancing (dots and the Comenzar/Siguiente button label were correct) but the mounted slide content stayed stuck on an old slide. Replaced with a plain key-remount `motion.div` (no `AnimatePresence`) — loses the exit fade-out, keeps the enter fade-in, and has no equivalent failure mode. If a future slide-based UI in this app reaches for `AnimatePresence mode="wait"` for rapid sequential transitions, test clicking through fast before trusting it.
- [x] Added `WalletIcon` to `icons.jsx` — Finanzas had no dedicated icon anywhere in the app until this

**Bug fixed broadly, 2026-08-15: Chromium drops `backdrop-filter` blur when the same element also has a `transform`.** Discovered on `NotificationCenter.jsx` (Framer Motion's `animate={{y,scale}}` leaves an inline `transform` even at rest, which is enough to trigger it — not just mid-animation) and turned out to be present in **13 files**: every portaled dropdown/popover/modal/slide-in-panel that combined a `.ador-glass`/`.ador-modal-surface` class with a Framer Motion transform on the *same* element. Fixed everywhere by splitting the transform-animated wrapper from the backdrop-filter surface into two nested elements — see the comment on `NotificationCenter.jsx` for the full explanation. Also reverted an overcorrection: dropdowns/menus (`ProfileMenu`, `NotificationCenter`, Sidebar tooltip, `CellPopover`) must stay on `.ador-glass` (translucent, ~5% tint) — `.ador-modal-surface` (~88% opaque) was tried first and made them read as solid black instead of frosted glass; modals/slide-in panels correctly keep `.ador-modal-surface`, that distinction was already correct before this bug hunt.

**Not built yet**
- [ ] Calendario, Conocimiento, Comunidad, Chat, News, Directorio all still show placeholder
- [ ] Documentos tab (Ficha panel) and Finanzas' Comprobante field only store file **metadata** (name, type, size) — actual file upload needs Firebase Storage enabled, which hasn't happened yet. Download button is present but disabled with an explanatory tooltip

**Scoped but not started (2026-08-14 evening conversation) — direction agreed, nothing built yet:**
- **Chat** — basic real-time messaging (channels + DMs) is realistic and cheap to build reusing existing Firestore-subscription patterns; full Slack/Teams parity (threads, reactions, search, calls) is explicitly out of scope. User confirmed: later, not now.
- **Comunidad** — internal-only (just the 3 founders/asociados, not SPs). Leaning toward a lightweight "team pulse" (short wins/announcement posts + simple reactions) rather than a literal LinkedIn-style feed, since a feed format needs an audience size this team doesn't have. Must stay clearly distinct from Home's "Actividad Reciente" (automatic/system) and Workspace's "Decisiones" (formal/strategic) — Comunidad is the human/informal one. User confirmed: later, not now.
- **Noticias** — official/formal company announcements (newsroom style: "ADOR cierra partnership con X"), authored by the team, not scraped from external sources — explicitly *not* an external news-API integration. Distinct from Comunidad by tone (formal headline vs. casual post), not by audience. User confirmed: later, not now.

## Infrastructure status

| Piece | Status |
|---|---|
| Node.js | Portable install at `~/.local/node`, on `PATH` via `~/.zshrc` |
| Firebase project (`ador-os`) | Created |
| Firebase Authentication | Enabled — **Email/Password only**. Google OAuth was enabled then removed 2026-08-14 (self-serve sign-in let any Google account in; invite-only model needs admin-provisioned accounts instead) |
| Firebase Firestore | ✅ Enabled 2026-08-13, `nam5` (US) region. Rules require `request.auth != null` AND the user's email to have a document in `allowedEmails/{email}` — access control enforced at the data layer, not just the login screen. Applied via a blanket `match /{document=**} { allow read, write: if isAllowed(); }` rule, so **every** collection is automatically covered, present and future — no per-collection rule edits are ever needed (confirmed 2026-08-15 by reviewing the actual rules in console). All 3 founder emails added as of 2026-08-14 |
| Deployment | ✅ Vercel — `ador-os-internal.vercel.app`, auto-deploys on push to `main`. Firebase Hosting not used (redundant with Vercel) |
| `.env` (Firebase config) | Present locally, gitignored. Same values set as Environment Variables in Vercel project settings |
| Git repository | ✅ Initialized, initial commit made 2026-08-13 |
| GitHub | ✅ Private repo `ArcAlphaAS/ADOR---OS-Internal-`, `main` pushed and tracked, connected to Vercel for CI deploys |

## Open blockers

None. Auth + access control + deployment are all done and live.

## Next steps

See "Next recommended steps" in `CLAUDE.md` for the full reasoning. Short version: Firestore rules were confirmed 2026-08-15 to already cover every collection via a blanket rule — that item is closed, no action needed. ADOR IA is done and live on its local rule-based engine (see above) — no Vercel step needed unless the user later decides to connect the already-built Gemini path. Next: enable Firebase Storage for real Documentos/Comprobante uploads. Calendario is intentionally deferred — Google Calendar covers it for now (2026-08-14 decision). Chat/Comunidad/Noticias all have agreed direction (see "Scoped but not started" above) but the user explicitly wants them later, not now — don't start building any of them without being asked.
