# ADOR OS — Project State

Last updated: 2026-08-14 (evening). This is the living status snapshot — update the checklists below whenever something ships or a blocker changes. For *why* things were built the way they were, see `CLAUDE.md`; that file changes rarely, this one changes often.

## Phase status

| Phase | Status |
|---|---|
| Phase 1 — Splash, Login, Welcome | ✅ Done |
| Phase 2 — Shell + Home | ✅ Done |
| Phase 3 — Clientes module | ✅ Done (2026-08-14) |
| Phase 3 — remaining modules (Workspace, Objetivos, Calendario, Finanzas, Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA) | ⬜ Not started |

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

**Not built yet**
- [ ] No module besides Inicio and Clientes has real content (Workspace, Objetivos, Calendario, Finanzas, Conocimiento, Comunidad, Chat, News, Directorio, ADOR IA all show placeholder)
- [ ] Documentos tab (Ficha panel) only stores file **metadata** (name, type, size) — actual file upload needs Firebase Storage enabled, which hasn't happened yet. Download button is present but disabled with an explanatory tooltip

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

See "Next recommended steps" in `CLAUDE.md` for the full reasoning. Short version: enable Firebase Storage for real Documentos uploads, then build a dedicated Finanzas module (quarterly/annual rollups, expenses — reading from the same `clients/{id}.pago1`/`pago2` records Clientes already writes, not a separate ledger).
