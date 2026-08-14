// Placeholder wordmark. To swap in the final mark, replace the <span> below
// with: <img src={logoSvg} alt="ADOR" style={{ height: size }} />
export default function Logo({ size = 28, className = '' }) {
  return (
    <span
      className={`select-none font-semibold text-[#F5F5F5] ${className}`}
      style={{
        fontSize: size,
        letterSpacing: '0.2em',
        lineHeight: 1,
      }}
    >
      ADOR
    </span>
  )
}
