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

## "Psychology of software" polish already applied (Phase 2)

These came from an explicit design discussion — worth preserving as a pattern, not just one-off features:

- Esc key closes any open panel (notification center, profile dropdown) — global listener in `TopBar.jsx`.
- Greeting subtext rotates through a few phrases per time-of-day, seeded by day-of-year (stable within a day, varies day to day) — avoids the greeting feeling robotic on day 50. See `GreetingBlock.jsx`.
- Profile dropdown shows a real "Última conexión" line from Firebase's actual `user.metadata.lastSignInTime` — a genuine (not fabricated) trust signal, appropriate for an invite-only tool handling sensitive client data.
- Empty states use pulsing dots / breathing icons / shimmer rather than flat static text — see `InterventionsBlock.jsx` (pulsing live-dot next to the header), `ActivityBlock.jsx` (pulsing dot + "todo al día" reassurance copy), `MeetingDecisionBlock.jsx` (icons breathe slowly).

## Known issues / gotchas

- **No git repository yet.** User explicitly deferred this to "Phase 2" and Phase 2 is now done — this is overdue. See memory file `project_ador_os_git_setup.md` in the user's Claude memory directory for the agreed plan (local git init + private GitHub repo, one browser auth step).
- **Firestore is not enabled** in the Firebase console. `lib/firestore.js` defines the full collection schema (`users`, `clients`, `interventions`, `tasks`, `decisions`, `meetings`, `notifications`) and subscribe hooks, but none of it has been tested against a real database, and nothing in the UI calls it yet.
- **ProfileMenu's "Mi Perfil" and "Configuración" items don't do anything** — only "Cerrar Sesión" is wired (to real Firebase `signOut`).
- **Dev server port varies.** Claude's own preview tooling often occupies 5173, so the user's own `npm run dev` sometimes lands on 5174/5180/etc. Not a bug.
- **Claude's own screenshot preview tool has an intermittent quirk** (unrelated to this codebase): after a custom `preview_resize` call combined with a full-page `window.location.href` navigation, screenshots sometimes render the page squished into a small corner even though `window.innerWidth` correctly reports the resized value. Workaround: stop and restart the preview server, or trust `getBoundingClientRect()`/computed-style measurements over the screenshot when this happens.

## Next recommended steps (in priority order, as discussed with the user)

1. **Enable Firestore + wire real data.** This is the highest-impact next step — most of Home's visual polish (shimmer skeletons, pulse dots) is currently reacting to the *absence* of data; seeing it react to real data is the next real milestone.
2. **Set up git + a private GitHub repo.** Was deferred twice already; do it before more work piles up unbacked-up.
3. **Build out one real module end-to-end** — user's stated preference is **Clientes** (core to the CRM concept), rather than spreading effort thin across all 10 placeholder modules at once.
4. **Deploy to Firebase Hosting** (same project, free tier) so the other two founders can access it without the user's laptop running a dev server.
5. Minor: wire "Mi Perfil" / "Configuración" in `ProfileMenu.jsx` to something real once there's a profile/settings surface to link to.

## Other context that only exists in conversation history (not in any file)

- The user also has a broader Claude memory system at `/Users/angelsamillan/.claude/projects/-Users-angelsamillan-Claude/memory/` with product-vision-level context (`project_ador_mvp_master_prompt.md`, `project_ador_living_enterprise_vision.md`, `project_ador_digital_twin_design.md`, `project_ador_chatbot_tone.md`) that predates and informed this build. Worth reading if a future session needs product rationale beyond what's in this repo.
- Node.js is a portable, non-system install at `~/.local/node` (added to `~/.zshrc` `PATH`) — this was a deliberate choice over Homebrew/system install to avoid touching the user's system; don't "fix" this by reinstalling Node system-wide without asking.
- The Firebase project (`ador-os`) was created and configured live, step-by-step, with the user driving the console themselves while being walked through it — they now know how to navigate Firebase console basics (Authentication, sign-in providers, adding a web app). Don't over-explain those basics again; do walk them through Firestore setup the same way when that becomes the next step, since it's a new area for them.
