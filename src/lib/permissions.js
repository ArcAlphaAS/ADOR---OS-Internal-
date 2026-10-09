// Shared admin check, reused across any module that needs to gate
// create/edit/delete to administrators (first introduced for Directorio —
// see CLAUDE.md §30 — now also used by Conocimiento). Fails open on a
// missing `isAdmin` field (undefined, not `false`) so the 3 founders —
// whose profiles predate this field — are admins with no manual Firestore
// bootstrap step. Only an explicit `isAdmin: false`, set by hand in the
// console the same way `allowedEmails` already is, opts someone out.
export function isAdmin(profile) {
  return profile?.isAdmin !== false
}

// Who may organize encuentros (Comunidad posts of type "evento"): every
// administrator, plus any member an admin switched on in Administración →
// Personas (users/{uid}.communityOrganizer). Everyone can still post the other
// kinds (updates, ideas, questions…) and RSVP to events.
export function canOrganizeEvents(profile) {
  return isAdmin(profile) || profile?.communityOrganizer === true
}
