# ADOR OS — Project State

Last updated: 2026-08-13. This is the living status snapshot — update the checklists below whenever something ships or a blocker changes. For *why* things were built the way they were, see `CLAUDE.md`; that file changes rarely, this one changes often.

## Phase status

| Phase | Status |
|---|---|
| Phase 1 — Splash, Login, Welcome | ✅ Done |
| Phase 2 — Shell + Home | ✅ Done |
| Phase 3 — real data + remaining modules | ⬜ Not started |

## What's actually built

**Phase 1**
- [x] Splash — click/keypress-to-continue, 6-dot loading ring, matches reference
- [x] Login — email/password + Google OAuth, glass card, graduated liquid-glass buttons, back-navigation via real browser history
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
- [ ] Firestore not enabled in Firebase console (schema + hooks exist in `lib/firestore.js`, untested, unused)
- [ ] No module besides Inicio has real content (Workspace, Objetivos, Calendario, Clientes, Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA all show placeholder)
- [ ] "Mi Perfil" / "Configuración" menu items do nothing
- [ ] No deployment — only runs locally via `npm run dev`

## Infrastructure status

| Piece | Status |
|---|---|
| Node.js | Portable install at `~/.local/node`, on `PATH` via `~/.zshrc` |
| Firebase project (`ador-os`) | Created |
| Firebase Authentication | Enabled — Email/Password + Google |
| Firebase Firestore | **Not enabled** |
| Firebase Hosting | Not set up |
| `.env` (Firebase config) | Present locally, gitignored |
| Git repository | ✅ Initialized, initial commit made 2026-08-13 |
| GitHub | ✅ Private repo `ArcAlphaAS/ADOR---OS-Internal-`, `main` pushed and tracked |

## Open blockers

None hard-blocking — everything above is "not started," not "stuck." Next thing worth doing: **enabling Firestore** (Home screen can't show real data until it does).

## Next steps

See "Next recommended steps" in `CLAUDE.md` for the full reasoning. Short version, in order: Firestore + real data → build out the Clientes module → deploy to Firebase Hosting.
