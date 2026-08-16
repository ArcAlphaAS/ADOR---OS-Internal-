// The Spartan Λ shield mark, used as the loading motif on Splash and Login
// in place of the earlier 6-dot chase ring — same slot, same "quietly
// breathing" motion (`ador-pulse`, opacity 0.6→1 loop), just the brand mark
// itself instead of abstract dots.
export default function AdorMark({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ animation: 'ador-pulse 1.6s ease-in-out infinite' }}
    >
      <circle cx="50" cy="50" r="47" fill="#7A1620" stroke="#D4A93B" strokeWidth="3" />
      <path
        d="M50 20 L72 74 Q73 78 68 78 L60 78 Q57 78 56 74 L50 58 L44 74 Q43 78 40 78 L32 78 Q27 78 28 74 Z"
        fill="#E0B94A"
      />
    </svg>
  )
}
