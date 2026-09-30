import Avatar from '../shell/Avatar'

// Up to 3 overlapping avatars for a task's assigned Asociados, with each
// person's profile photo (already on the users docs the caller holds, so no
// per-avatar lookup) and initials as the fallback.
//
// `pendingIds` (optional) marks whoever hasn't accepted/rejected the
// assignment yet (see AssignmentConfirmGate.jsx) — a small amber ring +
// clock dot, so a teammate scanning the board can tell "assigned but not
// confirmed" from "assigned and on it" without opening the task.
export default function AvatarStack({ userIds = [], userById, pendingIds = [], size = 24 }) {
  // Someone who no longer has access isn't in userById (subscribeUsers only
  // lists people still allowed in) — don't draw a ghost avatar for them.
  // While users are still loading (empty map) show everyone as before.
  const loaded = Object.keys(userById || {}).length > 0
  const active = loaded ? userIds.filter((uid) => userById[uid]) : userIds
  const visible = active.slice(0, 3)
  if (visible.length === 0) {
    return (
      <span
        className="text-[11px] text-[#444444]"
        title={userIds.length > 0 ? 'Estaba asignada a alguien que ya no tiene acceso a ADOR OS' : undefined}
      >
        Sin asignar
      </span>
    )
  }

  return (
    <div className="flex flex-shrink-0" style={{ marginLeft: 4 }}>
      {visible.map((uid, i) => {
        const user = userById[uid]
        const pending = pendingIds.includes(uid)
        return (
          <div
            key={uid}
            className="relative"
            style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
            title={pending ? 'Pendiente de confirmar' : undefined}
          >
            <div style={pending ? { borderRadius: '9999px', boxShadow: '0 0 0 2px #B8860B' } : undefined}>
              <Avatar photoURL={user?.photoDataUrl} displayName={user?.displayName} email={user?.email} size={size} />
            </div>
            {pending && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#000000]"
                style={{ background: '#B8860B' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
