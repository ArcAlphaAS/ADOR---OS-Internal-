# ADOR OS — Project State

Last updated: 2026-08-14. This is the living status snapshot — update the checklists below whenever something ships or a blocker changes. For *why* things were built the way they were, see `CLAUDE.md`; that file changes rarely, this one changes often.

## Phase status

| Phase | Status |
|---|---|
| Phase 1 — Splash, Login, Welcome | ✅ Done |
| Phase 2 — Shell + Home | ✅ Done |
| Phase 3 — real data + remaining modules | ⬜ Not started |

## What's actually built

**Phase 1**
- [x] Splash — click/keypress-to-continue, 6-dot loading ring, matches reference
- [x] Login — email/password only (Google OAuth removed 2026-08-14 — self-serve sign-in didn't fit invite-only model), glass card, graduated liquid-glass buttons, back-navigation via real browser history
- [x] Welcome — time-of-day greeting, shows once/day or on post-13:00 return, localStorage-driven

**Phase 2 — Shell**
- [x] Top bar — centered pill-tab nav (Inicio, Workspace, Objetivos, Calendario, Clientes), no background of its own
- [x] Sidebar — floating capsule (Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA)
- [x] Search icon → expands to input (non-functional placeholder, real UI)
- [x] Notification bell → dropdown (empty-state only, no real notifications)
- [x] Profile avatar → hover reveals name/role, click opens compact dropdown (Mi Perfil / Configuración / Cerrar Sesión — only Cerrar Sesión is wired)
- [x] Module placeholders for everything except Inicio ("En construcción")

**Phase 2 — Home (only module with real content)**
- [x] Greeting block — 56px gradient text, rotating subtext, live clock-independent date
- [x] Metrics row (3 cards) — shimmer skeletons, no real values
- [x] Interventions card — pulsing live-dot, shimmer empty state
- [x] Meeting + Decision cards — breathing icons, empty-state copy
- [x] Activity list — pulsing dot, "todo al día" empty state
- [x] Quick Links — Google Drive only

**Not built yet**
- [ ] No module besides Inicio has real content (Workspace, Objetivos, Calendario, Clientes, Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA all show placeholder)
- [ ] "Mi Perfil" / "Configuración" menu items do nothing
- [ ] No `allowedEmails` Firestore-based access whitelist yet — currently anyone with a Firebase Auth account created by the admin can sign in and read/write all data; a per-email allowlist enforced in security rules is the next hardening step

## Infrastructure status

| Piece | Status |
|---|---|
| Node.js | Portable install at `~/.local/node`, on `PATH` via `~/.zshrc` |
| Firebase project (`ador-os`) | Created |
| Firebase Authentication | Enabled — **Email/Password only**. Google OAuth was enabled then removed 2026-08-14 (self-serve sign-in let any Google account in; invite-only model needs admin-provisioned accounts instead) |
| Firebase Firestore | ✅ Enabled 2026-08-13, `nam5` (US) region, production-mode rules: `allow read, write: if request.auth != null` |
| Deployment | ✅ Vercel — `ador-os-internal.vercel.app`, auto-deploys on push to `main`. Firebase Hosting not used (redundant with Vercel) |
| `.env` (Firebase config) | Present locally, gitignored. Same values set as Environment Variables in Vercel project settings |
| Git repository | ✅ Initialized, initial commit made 2026-08-13 |
| GitHub | ✅ Private repo `ArcAlphaAS/ADOR---OS-Internal-`, `main` pushed and tracked, connected to Vercel for CI deploys |

## Open blockers

None hard-blocking. Worth doing soon: harden access control with a Firestore `allowedEmails` whitelist (see "Not built yet" above) so account creation stays fully admin-controlled at the data layer, not just at the login screen.

## Next steps

See "Next recommended steps" in `CLAUDE.md` for the full reasoning. Short version, in order: `allowedEmails` access whitelist → build out the Clientes module → provision teammate accounts via Firebase Console.
