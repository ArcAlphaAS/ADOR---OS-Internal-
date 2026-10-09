// Tiny line icons for the seasonal badge (Home) — one per celebration, drawn
// in that celebration's color. Stroke style matches the rest of the app's icons.
const PATHS = {
  // Señor de los Milagros — a plain cross.
  cross: <><path d="M12 3.5v17" /><path d="M7 9h10" /></>,
  pumpkin: (
    <>
      <path d="M12 7.5c-.2-1.4.4-2.7 1.6-3.5" />
      <ellipse cx="12" cy="14" rx="8" ry="6.3" />
      <path d="M12 7.8c-2.6 2.6-2.6 9.8 0 12.4" />
    </>
  ),
  tree: <><path d="M12 3.5l4.6 6.5H14l3.6 5.5H6.4L10 10H7.4z" /><path d="M12 15.5v5" /></>,
  star: <path d="M12 3.5l2.5 5.3 5.7.7-4.2 4 1.1 5.7L12 16.4 6.9 19.2 8 13.5l-4.2-4 5.7-.7z" />,
  sparkles: (
    <>
      <path d="M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6z" />
      <path d="M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  flag: <><path d="M6 21V4" /><path d="M6 5h11l-2.2 3.6L17 12H6" /></>,
  flower: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="12" cy="6.2" r="2.8" />
      <circle cx="12" cy="17.8" r="2.8" />
      <circle cx="6.2" cy="12" r="2.8" />
      <circle cx="17.8" cy="12" r="2.8" />
    </>
  ),
}

export default function SeasonIcon({ name, color, size = 14 }) {
  const paths = PATHS[name]
  if (!paths) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths}
    </svg>
  )
}
