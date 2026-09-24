// Who sees what in ADOR OS. Two roles:
//   Administrador — the partners: everything, including Administración.
//   Miembro       — anyone who joins later: the modules the admins allow
//                   (settings/access.memberModules), by default everything
//                   except Finanzas. Never Administración.
// The role is users/{uid}.isAdmin (lib/permissions.js isAdmin(): a missing
// field still means admin, so the 3 founders need no setup — people invited
// from Administración always get it set explicitly).
//
// This hides modules in the app; the Firestore rules in firestore.rules
// enforce the sensitive part (finance data, admin-only settings, private
// conversations) on the database itself.
export const MODULES = [
  { id: 'inicio', label: 'Inicio', always: true },
  { id: 'workspace', label: 'Workspace' },
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'finanzas', label: 'Finanzas', sensitive: true },
  { id: 'calendario', label: 'Calendario' },
  { id: 'conocimiento', label: 'Conocimiento' },
  { id: 'chat', label: 'Comunicación' },
  { id: 'news', label: 'News y Comunidad' },
  { id: 'directorio', label: 'Directorio' },
  { id: 'ador-ia', label: 'ADOR IA' },
]

export const DEFAULT_MEMBER_MODULES = MODULES.filter((m) => !m.sensitive).map((m) => m.id)

export function canSeeModule(moduleId, { isAdmin, memberModules }) {
  if (isAdmin) return true
  if (moduleId === 'admin') return false
  if (MODULES.find((m) => m.id === moduleId)?.always) return true
  return (memberModules || DEFAULT_MEMBER_MODULES).includes(moduleId)
}
