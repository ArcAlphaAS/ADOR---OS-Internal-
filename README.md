# ADOR OS

The internal operating system for ADOR, a 3-founder strategic intelligence firm. Built to orient, focus, and execute — not to passively display information.

Invite-only. Dark, glass-surfaced, quiet by design ("something Apple would ship internally," not a generic SaaS dashboard).

## Status

Phases 1 and 2 are done (Splash/Login/Welcome, and the shell + Home screen). See `PROJECT_STATE.md` for the current build checklist, and `CLAUDE.md` for architecture notes, decisions, and the next-steps handoff.

## Stack

React 19 + Vite + Tailwind CSS v4 + Framer Motion + Firebase (Auth now, Firestore planned). No UI component libraries — every control is hand-built.

## Running it

Node.js is not installed system-wide on this machine — a portable copy lives at `~/.local/node`, already on `PATH` via `~/.zshrc` (open a **new** terminal window to pick it up).

```bash
cd /Users/angelsamillan/Claude/ador-os
npm run dev
```

Open the printed `localhost` URL. Vite will pick a free port (usually 5173, sometimes higher if something else is already using it).

### Firebase config

Real project credentials live in `.env` (gitignored). Copy `.env.example` if you ever need to recreate it — the values are already filled in for the live `ador-os` Firebase project (Authentication → Email/Password + Google are enabled; Firestore is **not** yet enabled).

## Project structure

```
src/
  App.jsx                 Top-level state machine: Splash → Login → Welcome → AppShell
  firebase.js              Firebase init, guarded so missing config degrades to "logged out" instead of crashing
  index.css                Design tokens: .ador-glass, .ador-grain, .ador-skeleton, keyframes
  components/
    SplashScreen.jsx, LoginScreen.jsx, WelcomeScreen.jsx, Logo.jsx, LoadingRing.jsx   Phase 1 screens
    icons.jsx               Hand-drawn line icon set (no icon library)
    shell/                  TopBar, Sidebar, AppShell, ModulePlaceholder, NotificationCenter, ProfileMenu
    home/                   HomeScreen + its 6 blocks (Greeting, Metrics, Interventions, MeetingDecision, Activity, QuickLinks)
  hooks/
    useAuth.js               Firebase auth wrapper
    useWelcomeScreen.js       localStorage-driven "show Welcome once per day/block" logic
  lib/
    firestore.js             Collection schema + subscribe hooks (defined, not yet wired to UI)
    user.js                  Shared user-name helpers
```

## Design system quick reference

- Background `#0A0A0A`, text `#F5F5F5` / `#888888` / `#444444`, accent blue `#1E5FAD`, accent gold `#B8860B` (sparingly).
- Glass surfaces: `.ador-glass` (`background: rgba(255,255,255,0.05)`, `border: 1px solid rgba(255,255,255,0.1)`, `backdrop-filter: blur(24px) saturate(160%)`, drop shadow) + `.ador-grain` (0.03-opacity SVG noise overlay) on every card/surface.
- Pending-data states use `.ador-skeleton` (shimmer sweep) instead of static dashes — reads as "waiting for data," not "broken."
- Full rationale and the trickier decisions (why floating UI uses portals, why the shell nav is split the way it is) are in `CLAUDE.md`.
