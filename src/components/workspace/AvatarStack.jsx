import Avatar from '../shell/Avatar'

// Up to 3 overlapping initials-avatars for a task's assigned Asociados.
// Doesn't resolve live profile photos (unlike TopBar's Avatar usage) — a
// task list rendering a dozen rows shouldn't fan out a photo lookup per
// avatar; initials are enough at 24px.
//
// `pendingIds` (optional) marks whoever hasn't accepted/rejected the
// assignment yet (see AssignmentConfirmGate.jsx) — a small amber ring +
// clock dot, so a teammate scanning the board can tell "assigned but not
// confirmed" from "assigned and on it" without opening the task.
export default function AvatarStack({ userIds = [], userById, pendingIds = [], size = 24 }) {
  const visible = userIds.slice(0, 3)
  if (visible.length === 0) return <span className="text-[11px] text-[#444444]">Sin asignar</span>

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
              <Avatar displayName={user?.displayName} email={user?.email} size={size} />
            </div>
            {pending && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0A0A0A]"
                style={{ background: '#B8860B' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
