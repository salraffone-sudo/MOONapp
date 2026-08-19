// Renders a geometrically accurate moon phase disc.
// k = illumination fraction (0 = new, 1 = full). waxing = true if the right limb is lit
// (correct for Northern Hemisphere observers, which covers New Haven).
export default function MoonGlyph({ k, waxing, size = 200, glow = true }) {
  const r = size / 2;
  const cx = r;
  const cy = r;

  const sweep1 = waxing ? 1 : 0;
  const sweep2 = k >= 0.5 ? sweep1 : 1 - sweep1;
  const rx = Math.abs(1 - 2 * k) * r;

  const litPath = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweep1} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep2} ${cx} ${cy - r} Z`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={glow ? "moon-glow" : ""}>
      <defs>
        <radialGradient id="darkDisc" cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#2a3350" />
          <stop offset="100%" stopColor="#161d30" />
        </radialGradient>
        <radialGradient id="litDisc" cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#fdf6e3" />
          <stop offset="70%" stopColor="#f0dfa8" />
          <stop offset="100%" stopColor="#d8bf7e" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r - 1} fill="url(#darkDisc)" stroke="#3a4568" strokeWidth="1" />
      <path d={litPath} fill="url(#litDisc)" />
    </svg>
  );
}
