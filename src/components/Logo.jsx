// The real "ADOR" wordmark (public/logo-wordmark.svg — the ADOR letterforms
// cropped out of the brand's own horizontal lockup, recolored white),
// replacing the earlier Inter-font text placeholder this component used to
// render. `size` maps to height, same contract callers already relied on.
export default function Logo({ size = 28, className = '' }) {
  return (
    <img
      src="/logo-wordmark.svg"
      alt="ADOR"
      className={`select-none ${className}`}
      style={{ height: size }}
    />
  )
}
