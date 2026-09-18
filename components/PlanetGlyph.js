// Colors are a reasonable approximation of each planet's naked-eye/telescopic
// hue. Sizes are NOT true apparent angular size (at that scale every planet
// would be an indistinguishable point) — they're a compressed relative-diameter
// scale, purely for a recognizable, visually distinct icon.
const PLANET_VISUALS = {
  Mercury: { color1: "#b8ada0", color2: "#7d7168", size: 0.5 },
  Venus: { color1: "#fdf3d8", color2: "#e0c98a", size: 0.68 },
  Mars: { color1: "#e2764f", color2: "#a8431e", size: 0.56 },
  Jupiter: { color1: "#e8d3ae", color2: "#b98e57", size: 1, bands: true },
  Saturn: { color1: "#f1e2b0", color2: "#c9a55f", size: 0.9, ring: true },
  Uranus: { color1: "#c9eeee", color2: "#7fc7c9", size: 0.66 },
  Neptune: { color1: "#5c7fe0", color2: "#2d3f8f", size: 0.66 },
};

export default function PlanetGlyph({ name, baseSize = 26 }) {
  const v = PLANET_VISUALS[name];
  if (!v) return null;
  const size = baseSize * v.size;
  const r = size / 2;
  const ringRx = v.ring ? r * 1.6 : r;
  const pad = 4;
  const canvasW = ringRx * 2 + pad * 2;
  const canvasH = size + pad * 2;
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const gid = `planet-${name}`;

  return (
    <div className="planet-glyph" title={name}>
      <svg width={canvasW} height={canvasH} viewBox={`0 0 ${canvasW} ${canvasH}`}>
        <defs>
          <radialGradient id={gid} cx="35%" cy="35%" r="75%">
            <stop offset="0%" stopColor={v.color1} />
            <stop offset="100%" stopColor={v.color2} />
          </radialGradient>
        </defs>
        {v.ring && (
          <ellipse
            cx={cx}
            cy={cy}
            rx={ringRx}
            ry={r * 0.5}
            fill="none"
            stroke={v.color1}
            strokeWidth={Math.max(1.5, r * 0.16)}
            opacity="0.9"
          />
        )}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${gid})`} />
        {v.bands && (
          <>
            <ellipse cx={cx} cy={cy - r * 0.25} rx={r * 0.95} ry={r * 0.16} fill={v.color2} opacity="0.35" />
            <ellipse cx={cx} cy={cy + r * 0.3} rx={r * 0.95} ry={r * 0.14} fill={v.color2} opacity="0.3" />
          </>
        )}
      </svg>
      <span className="planet-glyph-label">{name}</span>
    </div>
  );
}
