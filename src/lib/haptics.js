// A tiny physical tick on phones that support it (Android Chrome / PWAs;
// iOS Safari doesn't expose vibration to web pages, so it's silently a no-op).
export function haptic(kind = 'tap') {
  try {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    navigator.vibrate(kind === 'success' ? [10, 40, 16] : 8)
  } catch {
    /* ignore */
  }
}
