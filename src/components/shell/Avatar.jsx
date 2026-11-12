import { avatarGradient } from '../../lib/avatarColor'
// Shared avatar renderer — used by TopBar, ProfileMenu, and ProfileModal.
// `photoURL` is resolved by the caller (see useUserPhoto.js), since it may
// come from Firestore (uploaded photo) or Firebase Auth, depending on context.
export default function Avatar({ photoURL, displayName, email, size = 32 }) {
  if (photoURL) {
    return (
      <img decoding="async"
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  const initial = (displayName || email || '?').charAt(0).toUpperCase()
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: avatarGradient(email || displayName) }}
    >
      {initial}
    </div>
  )
}
