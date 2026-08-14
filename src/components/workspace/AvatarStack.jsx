import Avatar from '../shell/Avatar'

// Up to 3 overlapping initials-avatars for a task's assigned Asociados.
// Doesn't resolve live profile photos (unlike TopBar's Avatar usage) — a
// task list rendering a dozen rows shouldn't fan out a photo lookup per
// avatar; initials are enough at 24px.
export default function AvatarStack({ userIds = [], userById, size = 24 }) {
  const visible = userIds.slice(0, 3)
  if (visible.length === 0) return <span className="text-[11px] text-[#444444]">Sin asignar</span>

  return (
    <div className="flex flex-shrink-0" style={{ marginLeft: 4 }}>
      {visible.map((uid, i) => {
        const user = userById[uid]
        return (
          <div key={uid} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}>
            <Avatar displayName={user?.displayName} email={user?.email} size={size} />
          </div>
        )
      })}
    </div>
  )
}
