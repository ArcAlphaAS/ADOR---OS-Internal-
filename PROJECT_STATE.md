# ADOR OS — Project State

Last updated: 2026-08-14 (later same day). This is the living status snapshot — update the checklists below whenever something ships or a blocker changes. For *why* things were built the way they were, see `CLAUDE.md`; that file changes rarely, this one changes often.

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
- [x] Profile avatar → hover reveals name/role (smooth push-reflow animation, no overlap), click opens compact dropdown (Mi Perfil / Configuración / Cerrar Sesión — all three wired)
- [x] Mi Perfil modal — edit and save display name (Firebase `updateProfile`)
- [x] Configuración modal — change password via reset email
- [x] Module placeholders for everything except Inicio ("En construcción")

**Phase 2 — Home (only module with real content)**
- [x] Greeting block — 56px gradient text, rotating subtext, live clock-independent date
- [x] Metrics row (3 cards) — shimmer skeletons, no real values
- [x] Interventions card — pulsing live-dot, shimmer empty state
- [x] Meeting + Decision cards — breathing icons, empty-state copy
- [x] Finance block — latest monthly revenue, % change vs. prior month, hand-drawn SVG sparkline (last 6 months), shimmer empty state. Reads from new `revenue` Firestore collection — no input UI yet, records are added manually via Firestore console until a full Finanzas module exists
- [x] Activity list — pulsing dot, "todo al día" empty state
- [x] Quick Links — Google Drive only

**Not built yet**
- [ ] No module besides Inicio has real content (Workspace, Objetivos, Calendario, Clientes, Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA all show placeholder)

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

See "Next recommended steps" in `CLAUDE.md` for the full reasoning. Short version: build out the Clientes module end-to-end, then a dedicated Finanzas module (deliberately kept separate from Clientes — see CLAUDE.md for why) with real data-entry UI instead of manual Firestore console edits.
