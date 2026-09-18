# ADOR OS — Project State

Last updated: 2026-09-17 (Calendario live and confirmed working with a real account). This is the living status snapshot — update the checklists below whenever something ships or a blocker changes. For *why* things were built the way they were, see `CLAUDE.md`; that file changes rarely, this one changes often.

## Phase status

| Phase | Status |
|---|---|
| Phase 1 — Splash, Login, Welcome | ✅ Done |
| Phase 2 — Shell + Home | ✅ Done |
| Phase 3 — Clientes module | ✅ Done (2026-08-14, extended 2026-08-15) |
| Phase 3 — Finanzas module | ✅ Done (2026-08-14, extended 2026-08-15) |
| Phase 3 — Workspace module (Hoy + Lista + Kanban + Timeline) | ✅ Done (2026-08-14, extended 2026-08-15, 2026-09-16, 2026-09-17) |
| Phase 3 — Objetivos module | ✅ Done (2026-08-15) |
| Phase 3 — ADOR IA (chat over live data, rule-based local engine — Gemini built but deferred by user choice) | ✅ Done (2026-08-16) |
| Phase 3 — Calendario (read-only Google Calendar reflection) | ✅ Done, confirmed live with a real account (2026-09-17) |
| Phase 3 — remaining modules (Conocimiento, Comunidad, Chat, News, Directorio) | ⬜ Not started |
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
- [x] **Rail gained a third card, `DecisionesCard.jsx` (2026-09-17)** — Decisiones moved here from Workspace, where it used to be a fixed collapsible side rail. Same shared `decisions` collection, no data-model change; see CLAUDE.md §26
- [x] **Bug fixed same pass:** every write in this module (create, check-in, pencil-edit, ★ toggle, milestone checkbox, delete, experiment CRUD) was silently swallowing errors — no `catch`, so a Firestore-rules rejection looked exactly like a broken button. Fixed with the same `withTimeout` + toast pattern already used in Workspace (§10). This is how the missing-rules gap below was actually confirmed live, not just flagged in the abstract
- [x] **Confirmed 2026-08-15 (user shared the actual rules):** covered by the same blanket rule. The "Missing or insufficient permissions" toast seen earlier tonight was a false alarm — it came from testing via the dev-only `?preview=1` mock user, which has no real Firebase Auth session and fails `isAllowed()` on *every* collection by design, not a reflection of the real rules

**Clientes — extended 2026-08-15**
- [x] Sequential human-readable IDs (`ADR-0001`, `ADR-0002`, ...) assigned at creation via an atomic Firestore transaction on `settings/counters.clientSeq` — separate from the Firestore doc id, shown in List view, Kanban cards, and the Ficha header. Prefix is "ADR" (the firm), not "SPC", since the code must stay valid after SPC→SP conversion. Existing clients created before this change have no `code` and show "—"; ask before backfilling
- [x] "Perdido" (lost) is a flag on top of whatever `stage` the client froze at (`lost`, `lostReason`, `lostAt`), not an 8th pipeline stage — the 7 STAGES entries are a forward-only Kanban/next-arrow pipeline and lost isn't "the next step" from anywhere. Marked/restored from the Ficha panel (`ClientDetailPanel.jsx`'s `LostControl`), fixed reason list (`LOST_REASONS` in `clientStages.js`). Lost clients drop out of Kanban/List automatically; a "Perdidos (N)" toggle in `ClientesModule.jsx` shows them in a flat restorable list (`LostClientsView.jsx`)

**Workspace — redesigned around a "Hoy" landing view, Notas folded in (2026-09-16)**
- [x] Workspace now opens on **Hoy** (`HoyView.jsx`) instead of "Todo" — shows a quick-capture input, any unreviewed notes, then Vencidas + Para hoy for the signed-in user, across all workstreams, with a calm empty state. Researched Linear vs. Sunsama/Akiflow's design philosophies first; picked Sunsama's "daily-planning-first" model as the better fit for a 3-founder team (see CLAUDE.md §19 for the full reasoning)
- [x] **Notas folded into Hoy the same day** — a separate "Notas" tab felt redundant once both were "your personal space." `NotasView.jsx` deleted; `GlobalCapture.jsx`'s floating "+" kept as the from-anywhere capture point, now pointing its toast copy at "Workspace → Hoy"
- [x] View switcher (`WorkspaceModule.jsx`) now shows icon **and** text label per tab (Hoy/Lista/Kanban/Timeline) instead of icon-only circles; Hoy carries a red count badge when another tab is active
- [x] Sidebar simplified — the old "Hoy" filter toggle was removed (promoted to its own tab); "Personal" stays as the team-view filter, now under its own "Mi trabajo" header for symmetry with "Equipo". Sidebar hides entirely on Hoy (already a fully personal screen)
- [x] Dead "+ Nueva Intervención" disabled button removed, replaced with an explanatory line shown only when there are zero Intervenciones

**Workspace — assignment confirmation + "Mis Pendientes" (2026-09-16, same-day follow-up)**
- [x] Assigning a task to someone other than yourself now requires their confirmation — `tasks/{id}.pendingConfirmations` (subset of `assignedTo`), populated by `createTask`/`applyTaskUpdate` in `lib/firestore.js`. A pending task doesn't count as "yours" anywhere (Hoy, Personal filter, the bell, Home's Tareas Hoy, the workload panel) until accepted
- [x] `AssignmentConfirmGate.jsx` — new, mounted once in `AppShell.jsx` — shows a blocking popup (no close button, no backdrop-dismiss) naming who assigned the task and a "habla con {nombre}" hint, with Aceptar/Rechazar. See CLAUDE.md §20 for the full mechanism and why "comunícate" is just a text hint (Chat is still a placeholder module)
- [x] Pending assignments get a small amber ring on the avatar (`AvatarStack.jsx`) and a "pendiente" tag in the assignee picker, visible to the whole team on Lista/Kanban
- [x] **Mis Pendientes** — a third section in `HoyView.jsx` (alongside Vencidas/Para hoy): everything open and assigned to you with no date or a future date, with an always-visible inline "+ Agregar pendiente" row so there's always a way to add something, even from an empty board
- [x] Restored the "+ Crear tarea" note→task conversion that was accidentally dropped when Notas got folded into Hoy (§19) — real regression, not intentional

**Workspace — Personal's empty state + one-tap reschedule (2026-09-16, same-day follow-up)**
- [x] "Personal" with zero tasks now shows the same rich table (`ListaView`'s `GENERAL_WORKSTREAM` fallback, relabeled via a new `emptyLabel` prop) that "Todo" already had, instead of a bare centered sentence — same "+ Agregar tarea" affordance either way. See CLAUDE.md §21
- [x] Overdue tasks in Hoy's Vencidas section get a one-click "→ Hoy" reschedule pill, plus a "Mover todas a hoy" bulk button in the section header once there's more than one — same `applyTaskUpdate` write path as everywhere else, just a shortcut around the date popover

**Workspace — design review + sidebar polish + iOS-productivity motion pass (2026-09-16, same day)**
- [x] Design review found and fixed two real layout bugs (badge word-wrap in Lista's group headers, an unframed collapsed Decisiones rail) and retracted one screenshot-artifact false positive. See CLAUDE.md §22
- [x] Sidebar polish: unified active-state color language between Personal and team nav items, framed the Intervenciones-empty note, thinner tinted workload bars. See CLAUDE.md §22
- [x] iOS-productivity pass: the view switcher (Hoy/Lista/Kanban/Timeline) is now a real sliding segmented control (Motion `layoutId`), Reminders-style circular icon badges on Hoy's sections and the sidebar's Personal/Todo rows, and a spring "pop" on the task checkbox when completing something. See CLAUDE.md §23

**Workspace — "Salud" pill + scrubber-dot progress bar on Lista headers (2026-09-17)**
- [x] `workstreamHealth()` in `lib/workspace.js` — a live, real-data "En tiempo"/"Atrasado" pill on each `WorkstreamGroup` header, adapted from a project-pipeline reference the user shared. Progress text simplified to "X de Y completadas"; the thin progress bar gained a scrubber dot at the fill edge. Removed a real bug found along the way: the "En curso" badge under an expanded Intervención was a hardcoded string, never reflecting real status. See CLAUDE.md §24
- [x] Sidebar's "Todo" nav item renamed three times, landed on **"Grupo"** (the user's own suggestion) — pairs cleanly with "Personal" above it. "Todo" read too easily as "to-do"; "Panorama" and "Trabajo" (the two tries in between) didn't clearly read as "the team's work" either. See CLAUDE.md §25
- [x] Page title next to Lista/Kanban/Timeline renamed from "Personal"/"Workspace" to **"Proyectos Individuales"**/**"Proyectos Colaborativos"** — "Workspace" repeated the whole section's own name as if it were a specific scope. Sidebar's short "Personal"/"Grupo" labels unchanged. See CLAUDE.md §25

**Workspace — Hoy redesigned from a reference image (2026-09-17)**
- [x] New header (`HoyHeader`) — title, full date, a day-of-year-seeded rotating quote, and a live stats line ("N tareas · M completadas · Todo al día / N atrasadas")
- [x] New "Enfoque actual" highlight card (`pickFocusTask()` in `lib/workspace.js`) — surfaces the single most urgent open task; "Iniciar enfoque" opens its Task Detail Panel. No timer/pomodoro logic — confirmed out of scope before building. See CLAUDE.md §26
- [x] Rows switched to a compact checklist style (`CompactTaskRow`) — checkbox, title, workstream tag, priority flag or completion time — instead of Lista's full inline-editable grid; editing beyond checking off now happens in the Task Detail Panel. Sections (Vencidas/Para hoy/Mis Pendientes, kept as-is per §19-21) gained a collapse chevron
- [x] New **"Completado"** section — today's completed tasks, via new `isCompletedToday()` helper
- [x] New right rail (`HoyRightRail.jsx`): navigable mini-calendar (visual only, no real events), a completed/total progress donut, "Objetivo de la semana" (reframes the existing North Star Objetivo with the same pace-vs-quarter-elapsed comparison Resumen Semanal uses), and a functional Quick Actions list (Nueva tarea / Nueva nota / Ver calendario — no keyboard shortcuts, dropped per feedback)
- [x] Deliberately **not** built: per-task duration-in-minutes field, keyboard shortcuts, and a sidebar/top-bar restructure to match the reference's own nav chrome — all explicitly scoped out before starting. See CLAUDE.md §26 for the full reasoning
- [x] **Same-day follow-up (4 changes):** mini calendar narrowed to a single week row (matches the reference); Decisiones moved out of Workspace entirely into a new `DecisionesCard.jsx` in Objetivos' lateral rail (old collapsible `DecisionesPanel.jsx` deleted, `RegisterDecisionModal.jsx` moved to `components/objetivos/`); "Objetivo de la semana" rebuilt as a genuinely personal weekly-intention card (`users/{uid}.weeklyGoal`, editable, progress live-derived from your own tasks this week) — no longer a relabeled North Star, per direct correction that these are two different concepts; "Enfoque actual" now always renders with a calm empty state instead of disappearing when nothing's urgent. See CLAUDE.md §26
- [x] **Second same-day follow-up:** priority ("urgencia") is now editable directly on every open row in Vencidas/Para hoy/Mis Pendientes via the same `PillCell` popover Lista uses — previously view-only text. "Completado" still shows a completion time in that slot instead.

**Workspace — extended 2026-08-15**
- [ ] ~~Decisiones panel is now collapsible (56px icon rail ↔ 280px full panel), so it no longer permanently eats width from the main task table. Preference persists per user (`users/{uid}.decisionesCollapsed`), same pattern as `workspaceView`~~ — superseded 2026-09-17: Decisiones moved out of Workspace entirely into Objetivos' lateral rail as a plain card (`DecisionesCard.jsx`); the collapsible side-rail version and its `decisionesCollapsed` preference no longer exist. Left here for history only.
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
- [x] **Real screenshots, not icons alone (2026-08-19 follow-up).** User asked how to make the walkthrough more useful for founders who've never used the tool — real captures of each module (`public/onboarding/*.jpg`, ~40KB each, taken via a one-off Playwright script against the `?preview=1` mock account, then resized to 960px wide and JPEG-compressed with macOS `sips`) now show above each slide's title/description in a small browser-chrome frame. Deliberately captured the app's real **empty** state, not staged sample data — that's what a founder's actual first session looks like, so the image doubles as "here's where you'll create your first objetivo/SPC/etc." rather than showing a screen they won't recognize. Re-capture these if a module's layout changes meaningfully later.

**Bug fixed broadly, 2026-08-15: Chromium drops `backdrop-filter` blur when the same element also has a `transform`.** Discovered on `NotificationCenter.jsx` (Framer Motion's `animate={{y,scale}}` leaves an inline `transform` even at rest, which is enough to trigger it — not just mid-animation) and turned out to be present in **13 files**: every portaled dropdown/popover/modal/slide-in-panel that combined a `.ador-glass`/`.ador-modal-surface` class with a Framer Motion transform on the *same* element. Fixed everywhere by splitting the transform-animated wrapper from the backdrop-filter surface into two nested elements — see the comment on `NotificationCenter.jsx` for the full explanation. Also reverted an overcorrection: dropdowns/menus (`ProfileMenu`, `NotificationCenter`, Sidebar tooltip, `CellPopover`) must stay on `.ador-glass` (translucent, ~5% tint) — `.ador-modal-surface` (~88% opaque) was tried first and made them read as solid black instead of frosted glass; modals/slide-in panels correctly keep `.ador-modal-surface`, that distinction was already correct before this bug hunt.

**Workspace → Notas tab (2026-09-16) — quick-capture notebook**
- [x] User asked for a digital replacement for jotting things down on paper that "understands and categorizes" instead of requiring manual filing — same live-AI-suggestion ambition raised for ADOR IA (§16/§17 in CLAUDE.md), and the user again confirmed (twice, in this same conversation) they're not comfortable connecting Gemini even with the billing mechanism explained. Built as the honest zero-cost equivalent instead of blocking on that decision.
- [x] `GlobalCapture.jsx` — a floating "+" button mounted once in `AppShell.jsx` (not per-module), always reachable regardless of which screen is open. Saves immediately via `createNote()`; `lib/notes.js`'s `suggestCategory()` (keyword rules — tarea/gasto/ingreso/objetivo/cliente/nota, same family as ADOR IA's local engine, §17) never blocks the save, it's just a hint attached after the fact.
- [x] **Initially built as its own "Conocimiento" module, then moved into Workspace as a 4th view (`NotasView.jsx`, alongside Lista/Kanban/Timeline) the same day** — the user clarified Conocimiento should stay reserved for a real future document/knowledge-base module ("mejor que Notion"), and these are personal/daily jottings that belong next to the team's task views instead. `ConocimientoModule.jsx` was deleted; the `conocimiento` sidebar item is back to the plain placeholder.
- [x] **Superseded later the same day:** `NotasView.jsx` as a separate tab was folded into the new `HoyView.jsx` landing screen once "Hoy" shipped — see the redesign entry above. `GlobalCapture.jsx` and `lib/notes.js` are unchanged; only the standalone tab is gone.
- [x] Lists notes split into Sin revisar/Revisadas, each with its suggested category as a colored chip and a manual "Revisada" (archive) action.
- [ ] **Deliberately scoped down:** "+ Crear tarea" is the only conversion actually wired end-to-end (reuses Workspace's find-or-create "General" Proyecto Interno pattern from `ListaView.jsx`, via new `findOrCreateGeneralProyecto()` in `lib/firestore.js`). Gasto/Objetivo/Cliente suggestions are informational only — no conversion modal yet. Build these as their own follow-up when there's a concrete need, not preemptively (this project's standing rule).
- [x] New Firestore collection `notes` — already covered by the existing blanket security rule (§15 note in CLAUDE.md), no console change needed.

**Workspace sidebar redesign + Decisiones reframe (2026-09-16, same day) — the "Hoy" toggle described below was superseded hours later, see CLAUDE.md §19**
- [ ] ~~`WorkspaceSidebar.jsx` restructured into three sections: **Hoy** (due today, mine — `todayOnly` filter), **Personal**, **Equipo**~~ — superseded the same day: "Hoy" was promoted out of the sidebar entirely into its own top-level tab/landing view (`HoyView.jsx`), and the sidebar itself went through three more names for its team-scope item since (Todo → Panorama → Trabajo → **Grupo**, §25). Left here for history only — current sidebar structure is documented at the top of the Workspace entries above.
- [x] `DecisionesPanel.jsx` renamed to "Decisiones de Dirección" with an explicit "Registro compartido — visible para todo el equipo" subtitle, and now shows the latest 6 instead of 3. It was already a shared Firestore collection (not siloed per user) — the fix was framing/copy, not the data model. **This part shipped and is still current.**
- [ ] **Not done, flagged as a possible follow-up:** Decisiones is still a side-panel with only the latest few, not a full searchable log/history view. Revisit if the team wants to browse past decisions, not just see the newest ones.

**Calendario — read-only Google Calendar reflection (2026-09-17) — new, pending Cloud setup**
- [x] Per-founder connection (OAuth), personal only — no combined team view, since Google Calendar itself already merges invited events into each person's own calendar. Read-only scope, not read/write — chosen deliberately: full calendar access is a Google "restricted" scope that's a real pain to get out of 7-day Testing-mode token expiry (heavier verification process); read-only is "sensitive," with a much lighter path to a persistent connection later. See CLAUDE.md §27 for the full reasoning
- [x] Two new Vercel serverless functions, `api/google-calendar/exchange.js` and `api/google-calendar/refresh.js` — the only two steps that need the OAuth client secret. Listing events happens directly from the browser against Google's API, no proxy needed
- [x] `useGoogleCalendar.js` hook + `CalendarioModule.jsx` — connect/disconnect, agenda list grouped by day for the next 14 days, an honest "tu conexión venció, reconecta" state for the expected 7-day Testing-mode expiry (not treated as a generic error)
- [x] New field `users/{uid}.googleCalendar = {refreshToken, connectedEmail, connectedAt}` — covered by the existing blanket Firestore rule, no console change needed. Access tokens are never persisted, kept in memory only
- [x] **Google Cloud Console setup done and confirmed live (2026-09-17)** — Calendar API enabled, `calendar.readonly` scope added, OAuth Client ID created, `VITE_GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` set in `.env` + Vercel. Tested end-to-end with a real founder account — connects, shows real upcoming events. The project's OAuth consent screen was already "In production" (leftover from the removed Google Sign-In provider), so the 7-day Testing-mode reconnect concern doesn't apply here — see CLAUDE.md §27 for details and one real bug hit along the way (a dropped character in the pasted Client Secret)
- [ ] Design pass deferred on purpose — this is a functional first pass (plain agenda list), a more elaborate visual treatment is a deliberate follow-up, not done here

**Not built yet**
- [ ] Comunidad, Chat, News, Directorio all still show placeholder
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

See "Next recommended steps" in `CLAUDE.md` for the full reasoning. Short version: Firestore rules were confirmed 2026-08-15 to already cover every collection via a blanket rule — that item is closed, no action needed. ADOR IA is done and live on its local rule-based engine (see above) — no Vercel step needed unless the user later decides to connect the already-built Gemini path. Calendario is done and confirmed working live as of 2026-09-17 — also closed. **Next up: enable Firebase Storage** for real Documentos/Comprobante uploads. Chat/Comunidad/Noticias all have agreed direction (see "Scoped but not started" above) but the user explicitly wants them later, not now — don't start building any of them without being asked.
