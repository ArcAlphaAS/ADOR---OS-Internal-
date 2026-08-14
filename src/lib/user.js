export function firstName(user) {
  if (user?.displayName) return user.displayName.split(' ')[0]
  if (user?.email) return user.email.split('@')[0]
  return ''
}
