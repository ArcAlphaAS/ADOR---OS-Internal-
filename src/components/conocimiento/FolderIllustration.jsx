// Layered SVG "glossy folder" illustration — recreates the shape/mood of a
// reference image the user shared (a macOS Big Sur-style folder with a
// frosted-glass front panel and paper pages peeking out) without using the
// literal raster asset, which was pure black/white and would've clashed
// with the rest of the app if dropped in as-is. Redrawn as gradient-filled
// SVG paths so it renders crisply at any size and reuses ADOR's own dark
// palette — this is illustration, not a UI control, so it gets its own
// richer treatment instead of the flat single-color icon language the
// rest of icons.jsx uses (see FolderIcon there for that plainer version,
// still used in the sidebar tree where icons are 12px and this level of
// detail wouldn't read).
//
// `id` must be unique per rendered instance — SVG gradient/filter ids are
// global to the document, so two folders on screen at once would otherwise
// silently share (and fight over) the same <linearGradient>.
export default function FolderIllustration({ id, size = 72 }) {
  const gBack = `folder-back-${id}`
  const gFlap = `folder-flap-${id}`
  const gPage = `folder-page-${id}`
  const gShine = `folder-shine-${id}`

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gBack} x1="10" y1="10" x2="90" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3A3A3E" />
          <stop offset="0.5" stopColor="#18181B" />
          <stop offset="1" stopColor="#0A0A0B" />
        </linearGradient>
        <linearGradient id={gPage} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAFAFA" />
          <stop offset="1" stopColor="#DADADD" />
        </linearGradient>
        <linearGradient id={gFlap} x1="10" y1="30" x2="88" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="0.45" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>
        <linearGradient id={gShine} x1="14" y1="34" x2="40" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Peeking pages, rotated behind the folder body */}
      <g transform="rotate(-6 50 46)">
        <rect x="30" y="14" width="34" height="44" rx="4" fill={`url(#${gPage})`} opacity="0.55" />
      </g>
      <g transform="rotate(4 50 46)">
        <rect x="32" y="12" width="34" height="44" rx="4" fill={`url(#${gPage})`} opacity="0.8" />
        <rect x="38" y="20" width="20" height="2.4" rx="1.2" fill="#B9B9BE" />
        <rect x="38" y="26" width="14" height="2.4" rx="1.2" fill="#C7C7CB" />
      </g>
      <rect x="33" y="10" width="34" height="44" rx="4" fill={`url(#${gPage})`} />
      <rect x="39" y="18" width="22" height="2.6" rx="1.3" fill="#A6A6AC" />
      <rect x="39" y="24.5" width="16" height="2.6" rx="1.3" fill="#B9B9BE" />
      <rect x="39" y="31" width="19" height="2.6" rx="1.3" fill="#C7C7CB" />

      {/* Folder back body */}
      <rect x="8" y="24" width="84" height="66" rx="15" fill={`url(#${gBack})`} />

      {/* Frosted-glass front flap, covering the lower ~2/3 */}
      <path
        d="M6 42a10 10 0 0 1 10-10h27l6 8h35a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H16A10 10 0 0 1 6 80V42Z"
        fill={`url(#${gFlap})`}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="0.75"
      />
      <path d="M6 42a10 10 0 0 1 10-10h27l6 8h35a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H16A10 10 0 0 1 6 80V42Z" fill={`url(#${gShine})`} />
    </svg>
  )
}
