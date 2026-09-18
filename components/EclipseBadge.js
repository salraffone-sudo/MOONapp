function daysUntil(date) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 86400000));
}

function LunarEclipseGlyph({ size = 44 }) {
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="bloodMoon" cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#e8836a" />
          <stop offset="60%" stopColor="#b8432e" />
          <stop offset="100%" stopColor="#7a2418" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#bloodMoon)" stroke="#c1524b" strokeWidth="1.5" />
    </svg>
  );
}

function SolarEclipseGlyph({ size = 44 }) {
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="corona" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#0a0d16" stopOpacity="0" />
          <stop offset="62%" stopColor="#f0dfa8" stopOpacity="0.9" />
          <stop offset="78%" stopColor="#c9a15c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c9a15c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={size / 2 - 1} fill="url(#corona)" />
      <circle cx={cx} cy={cy} r={r} fill="#05070c" stroke="#1a2338" strokeWidth="1" />
    </svg>
  );
}

export default function EclipseBadge({ lunar, solar }) {
  if (!lunar && !solar) return null;

  return (
    <div className="eclipse-badge-stack">
      {solar && (
        <div className="eclipse-badge" title={solar.type}>
          <SolarEclipseGlyph />
          <span className="eclipse-badge-label">
            {daysUntil(solar.date) === 0 ? "Today" : `${daysUntil(solar.date)}d`}
          </span>
        </div>
      )}
      {lunar && (
        <div className="eclipse-badge" title={lunar.type}>
          <LunarEclipseGlyph />
          <span className="eclipse-badge-label">
            {daysUntil(lunar.date) === 0 ? "Today" : `${daysUntil(lunar.date)}d`}
          </span>
        </div>
      )}
    </div>
  );
}
