# ADOR OS — Session Handoff / Project Context

This file is auto-loaded by Claude Code at the start of every session in this directory. It exists so a fresh session can continue this project without replaying the conversation that produced it. Keep it current — update it at the end of any session that changes architecture, status, or plans.

## What this project is

ADOR is a 3-founder strategic intelligence firm. ADOR OS is their internal operating system — invite-only, built to orient/focus/execute, not a passive dashboard. The design bar throughout has been "does this feel like Apple designed it internally" — restrained glass surfaces, no component libraries, deliberate motion, elegant empty states.

The user (Ángel) is new to both Claude Code and web development. Explain the "why" as you go; he prefers a direct recommendation over a menu of open-ended options when asked "what should we do."

## Current status

See `PROJECT_STATE.md` for the up-to-date checklist of what's built vs. pending — that file is the living status snapshot and gets updated more often than this one. Short version: Phase 1 and Phase 2 (shell + Home) are done; Firestore isn't enabled yet, no module besides Inicio has real content, and there's no git repository yet.

## Architecture decisions worth knowing before touching this code

### 1. Portal-based floating UI is load-bearing — don't regress it

Sidebar tooltips, the profile hover-pill, the notification dropdown, and the profile dropdown all render via `createPortal(..., document.body)` with `position: fixed` and coordinates computed from the trigger's `getBoundingClientRect()`.

This isn't decoration — it fixes a **confirmed, reproduced bug**: the sidebar and top-bar pill-nav are `rounded-full` capsules sized by shrink-to-fit (`width: auto`). When a hover tooltip/dropdown was nested *inside* one of those capsules as a normal `position: absolute` child, Chromium let the tooltip's width leak into the capsule's own auto-width calculation — hovering a sidebar icon made the whole capsule balloon from 62px to 150px wide. Verified numerically via `getBoundingClientRect()` before/after; fixed by moving all four to portals.

**Rule for any new floating UI (new dropdown, new tooltip, new popover) added later: never nest it inside a shrink-wrapped flex/glass container. Portal it to `document.body` and position it via a measured rect, following the existing pattern in `TopBar.jsx` (`ProfileTrigger`) and `Sidebar.jsx` (`NavButton`).**

Related gotcha already fixed once: if the anchor rect is measured only on mount (not on window resize), resizing the browser window desyncs the portaled element's position. `ProfileTrigger` in `TopBar.jsx` has a `resize` listener for this — copy that pattern, don't cache a rect without it.

### 2. Shell navigation is deliberately split across two surfaces

- **Top bar** (`TopBar.jsx`): a centered pill-tab bar (3-column CSS grid: logo / tabs / icons) holding the 5 "primary" modules — Inicio, Workspace, Objetivos, Calendario, Clientes. No background/border of its own; it blends into the page (per explicit user feedback — an earlier version had its own glass background and the user said it looked like "a rectangle" separating from the page).
- **Sidebar** (`Sidebar.jsx`): a floating rounded capsule (not a full-height panel) holding the remaining modules — Conocimiento, Comunidad, Chat, News, Directorio — plus ADOR IA below a divider.

This split came from direct user reference images (a pill-tab nav bar + a separate floating icon capsule), not from the original written spec, which originally put all 10 modules in one full-height sidebar. If asked to add a new module, ask which surface it belongs on rather than assuming.

### 3. Design tokens live in `src/index.css`, reused everywhere

- `.ador-glass` — the standard card/surface recipe: `background: rgba(255,255,255,0.05)`, `border: 1px solid rgba(255,255,255,0.1)`, `backdrop-filter: blur(24px) saturate(160%)`, `box-shadow: 0 4px 24px rgba(0,0,0,0.3)`. Apply to every new card/dropdown/panel.
- `.ador-grain` — a 0.03-opacity SVG-noise `::after` overlay, paired with `.ador-glass` on almost everything.
- `.ador-skeleton` — a shimmer-sweep gradient (not a static dash) for values with no data yet. Added specifically because plain "—" placeholders made the Home screen feel dead; the shimmer reads as "the system is tracking this, just waiting on data."
- Keyframes: `ador-drift` (slow background gradient drift, Welcome screen), `ador-pulse` (opacity breathe, used for live-status dots and breathing icons), `ador-spin-dot` (6-dot loading ring), `ador-shimmer` (skeleton sweep).
- Color roles: bg `#0A0A0A`, text `#F5F5F5` / `#888888` / `#444444`, accent blue `#1E5FAD` (primary/brand), accent gold `#B8860B` (used sparingly — decisions/checkmarks only).

### 4. Firebase is guarded against missing config

`src/firebase.js` exports `isFirebaseConfigured` and only calls `initializeApp`/`getAuth` if `VITE_FIREBASE_API_KEY` is set. `useAuth.js` checks `auth` for null before every call. This was deliberate: the Firebase SDK throws synchronously on an invalid API key, which would otherwise white-screen the whole app if `.env` is ever missing. Preserve this pattern if Firestore gets wired in — `db` in `lib/firestore.js` already follows the same guard.

### 5. The `?preview=1` URL param is a dev-only test harness — not for shipping

`App.jsx` has a `PREVIEW_MOCK_USER` that bypasses Splash/Login/Welcome and injects a fake authenticated user (with a fabricated `displayName` and `lastSignInTime`) when the URL has `?preview=1`. This exists purely so Claude's own screenshot-based preview tooling could visually verify the authenticated shell without doing a real Google OAuth round-trip each time. It's harmless (real users won't stumble onto it), but don't rely on it as a real auth bypass, and consider removing it before any real deployment.

### 6. Welcome screen logic (`useWelcomeScreen.js`)

Shows on: first login of the day, or returning after 13:00 when the last login was before 13:00 same day. Tracked via `localStorage` keys `ador_last_login_at` and `ador_welcome_shown` (keyed by date + time-block so it never repeats within the same block). If this logic ever needs to change, the block boundaries (`morning` 6–13, `lunch` 13–15, `afternoon` 15–19, `evening` 19–6) are in that file.

### 7. Finance lives on Home now, Finanzas module later — deliberately not merged into Clientes

User asked (2026-08-14) where a financial overview for founders should live, and specifically floated combining it with Clientes. Decision: keep them separate *as modules/UI*. Clientes is a CRM/relationship model (client status, intervention progress); finance is a money-flow model (revenue, eventually expenses/runway) — different mental models that get harder to scan together as both grow.

However, they share one *data* source of truth on purpose (revised same day once Clientes actually got built — see §8): `FinanceBlock.jsx` on Home computes its monthly revenue, % change, and sparkline by reading `pago1`/`pago2` fields off every `clients/{id}` doc, not a separately-entered collection. An earlier version of this used a standalone hand-entered `revenue` collection — that was retired specifically to avoid a dual-source-of-truth problem (see §8's "why payments live on the client doc" for the reasoning). When a full Finanzas module gets built, it should read the same `pago1`/`pago2` fields for quarterly/annual rollups — never re-introduce a parallel manually-entered ledger.

### 8. Clientes module (2026-08-14) — SPC→SP pipeline CRM

Built from a detailed user-supplied spec (ADOR's internal vocabulary: SPC = Strategic Partner Candidate, SP = Strategic Partner once "Intervención Activa" starts; never "cliente"/"prospecto" in UI copy — see `lib/clientStages.js` for the full pipeline stage list). Lives at `src/components/clientes/`, wired into `AppShell.jsx` for the `clientes` nav item.

**Data model decision — payments live on the client doc, not a separate ledger.** Each `clients/{id}` doc holds its own `pago1`/`pago2` fields (`{ amount, status: 'Pendiente'|'Recibido', date: 'YYYY-MM-DD' }`, fixed 60/40 split — constants in `clientStages.js`). This was a deliberate choice over a separate `payments`/`invoices` collection: with only ~10s of clients ever, per-client payment state is simple enough to live inline, and it means the Pagos tab (Clientes) and the Home Finanzas block are reading the exact same fields — no sync step, no drift. If per-client payments ever need to support more than 2 fixed installments, *that's* the trigger to extract a real `payments` subcollection; don't do it preemptively.

**Data model decision — intervention progress lives on the client doc too.** `interventionWeek`/`interventionTotalWeeks` fields on the client, active once `stage === 'intervencion_activa'`. Originally (earlier the same day) there was a separate `interventions` collection referencing `clientId` — retired once it became clear "the intervention" and "the SP's current stage" are the same concept in ADOR's actual mental model, not two things to keep in sync.

**Payment dates are plain strings, not Firestore Timestamps.** `pago1.date`/`pago2.date` are `'YYYY-MM-DD'` strings (set via `<input type="date">`), not `serverTimestamp()` sentinels — these are calendar dates the team enters/edits by hand, not exact server-clock events. `useHomeData.js`'s revenue bucketing reads `payment.date.slice(0, 7)` for the month key accordingly. Don't "fix" this back to Timestamps without checking that call site.

**No Firebase Admin SDK, so no way to list every Auth user from the client** — "Asociado responsable" pickers need a directory. Solved with self-registration: `App.jsx` writes `users/{uid}` (displayName, email) via `saveUserProfile` on every real login (skipped for the `?preview=1` mock user — check `user.uid !== 'preview'` before any write that touches shared collections like `users`, or you'll pollute the real Firestore project with a fake "preview" directory entry, which happened once during testing and had to be manually cleaned up). `subscribeUsers()` in `lib/firestore.js` powers the dropdown.

**Kanban drag-and-drop is hand-built with Framer Motion, no DnD library.** Each `ClientCard` uses `drag` + `dragSnapToOrigin` + `onDragEnd`; `KanbanBoard.jsx` keeps a ref map of each column's DOM node and hit-tests the drop point (`info.point`) against `getBoundingClientRect()` on drop — same pattern already used for portaled dropdown positioning elsewhere in the shell. The SPC→SP conversion glow-pulse fires by diffing each client's stage against a `prevStagesRef` snapshot on every Firestore update, not from the drag handler directly — so it also fires correctly when a stage change happens from the List view's quick-action arrow, not just from a Kanban drag.

**Documentos tab is metadata-only — Firebase Storage isn't enabled.** File name/type/size get written to `clients/{id}/documents`, but no actual file bytes are stored anywhere yet (no Storage bucket configured, unlike Firestore/Auth which went through the same enable-in-console flow earlier this project). The download button is present but disabled with a tooltip explaining why. Enabling Storage (a console step, same pattern as Firestore setup) is the next infrastructure prerequisite before Documentos can be made real — walk the user through it the same way Firestore was set up (see git history / earlier CLAUDE.md revisions for that flow).

**Testing note for future sessions:** simulating real user interaction (hover, blur, drag) via raw `dispatchEvent` calls in this environment is unreliable — React's synthetic event system needs proper `relatedTarget`/focus state that bare `new MouseEvent(...)` often doesn't replicate, and a `.blur()` fired in the same synchronous tick as a preceding `input` event can race React's state update. When verifying forms/interactions here, prefer calling the exported `lib/firestore.js` functions directly via `import('/src/lib/firestore.js')` in the browser console to isolate "does the write work" from "did my simulated event fire" — this saved significant time chasing false-positive bugs during this build.

## "Psychology of software" polish already applied (Phase 2)

These came from an explicit design discussion — worth preserving as a pattern, not just one-off features:

- Esc key closes any open panel (notification center, profile dropdown) — global listener in `TopBar.jsx`.
- Greeting subtext rotates through a few phrases per time-of-day, seeded by day-of-year (stable within a day, varies day to day) — avoids the greeting feeling robotic on day 50. See `GreetingBlock.jsx`.
- Profile dropdown shows a real "Última conexión" line from Firebase's actual `user.metadata.lastSignInTime` — a genuine (not fabricated) trust signal, appropriate for an invite-only tool handling sensitive client data.
- Empty states use pulsing dots / breathing icons / shimmer rather than flat static text — see `InterventionsBlock.jsx` (pulsing live-dot next to the header), `ActivityBlock.jsx` (pulsing dot + "todo al día" reassurance copy), `MeetingDecisionBlock.jsx` (icons breathe slowly).

## Known issues / gotchas

- **Git + GitHub done (2026-08-13).** Local repo initialized, initial commit made, pushed to private GitHub repo `ArcAlphaAS/ADOR---OS-Internal-`, `main` tracks `origin/main`.
- **Firestore enabled and wired (2026-08-13/14).** `nam5` region. `useHomeData.js` subscribes Home to live `clients`/`interventions`/`tasks`/`decisions`/`meetings` data via the hooks in `lib/firestore.js`. Security rules require `request.auth != null` AND an `allowedEmails/{email}` document to exist for the signed-in user's email — access control is enforced at the data layer, not just the login screen. The 3 founder emails are the only entries in `allowedEmails` as of 2026-08-14.
- **Google OAuth removed (2026-08-14).** Self-serve Google sign-in auto-created a Firebase Auth account for any Google account — didn't fit the invite-only model. Login is now email/password only; accounts are created by the admin in Firebase Console → Authentication → Users, one at a time, with a temp password the teammate resets on first login.
- **Deployed to Vercel (2026-08-14).** Live at `ador-os-internal.vercel.app`, connected to the GitHub repo, auto-deploys on push to `main`. Firebase Hosting was considered but skipped as redundant — Firebase Auth/Firestore don't care what host serves the static build, and the user already manages other projects on Vercel. The `?preview=1` dev-only auth bypass in `App.jsx` is gated behind `import.meta.env.DEV` so it cannot activate in the production build.
- **"Mi Perfil" and "Configuración" wired (2026-08-14).** `ProfileModal.jsx` edits `displayName` via Firebase `updateProfile` (state merged locally into `useAuth`'s `user` since Firebase mutates `auth.currentUser` in place without triggering a re-render). `SettingsModal.jsx` offers "Cambiar contraseña" via the existing password-reset-email flow. Both are centered glass-card modals, portaled to `document.body`, opened via `TopBar`'s `activeModal` state and `ProfileMenu`'s `onSelect` callback.
- **Clientes module built (2026-08-14).** Full SPC→SP Kanban/List CRM — see §8 above for the data model decisions (payments and intervention progress live on the client doc, not separate collections). Home's metrics, Finanzas block, Intervenciones Activas, and the notification bell all now read live from real Clientes data instead of placeholder/manual collections.
- **Firebase Storage not enabled.** The Clientes → Ficha → Documentos tab only stores file metadata (no actual upload) until this gets set up, same console-enable flow as Firestore.
- **Dev server port varies.** Claude's own preview tooling often occupies 5173, so the user's own `npm run dev` sometimes lands on 5174/5180/etc. Not a bug.
- **Claude's own screenshot preview tool has an intermittent quirk** (unrelated to this codebase): after a custom `preview_resize` call combined with a full-page `window.location.href` navigation, screenshots sometimes render the page squished into a small corner even though `window.innerWidth` correctly reports the resized value. Workaround: stop and restart the preview server, or trust `getBoundingClientRect()`/computed-style measurements over the screenshot when this happens.

## Next recommended steps (in priority order, as discussed with the user)

1. **Enable Firebase Storage** so the Clientes → Documentos tab can do real file uploads instead of metadata-only records. Same console-enable pattern already walked through for Firestore.
2. **Build a dedicated Finanzas module** — reads the same `pago1`/`pago2` fields on `clients/{id}` that Home's Finanzas block and Clientes' Pagos tab already use (see §8), adding quarterly/annual rollups and eventually expenses/runway. Do not introduce a separate manually-entered revenue collection — that was tried and retired same-day specifically to avoid a dual-source-of-truth problem.
3. Build out the remaining placeholder modules (Workspace, Objetivos, Calendario, Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA) as they become priorities.

## Other context that only exists in conversation history (not in any file)

- The user also has a broader Claude memory system at `/Users/angelsamillan/.claude/projects/-Users-angelsamillan-Claude/memory/` with product-vision-level context (`project_ador_mvp_master_prompt.md`, `project_ador_living_enterprise_vision.md`, `project_ador_digital_twin_design.md`, `project_ador_chatbot_tone.md`) that predates and informed this build. Worth reading if a future session needs product rationale beyond what's in this repo.
- Node.js is a portable, non-system install at `~/.local/node` (added to `~/.zshrc` `PATH`) — this was a deliberate choice over Homebrew/system install to avoid touching the user's system; don't "fix" this by reinstalling Node system-wide without asking.
- The Firebase project (`ador-os`) was created and configured live, step-by-step, with the user driving the console themselves while being walked through it — they now know how to navigate Firebase console basics (Authentication, sign-in providers, adding a web app). Don't over-explain those basics again; do walk them through Firestore setup the same way when that becomes the next step, since it's a new area for them.
