interface ArcGaugeProps {
  pct: number;
  color: 'healthy' | 'warning' | 'critical';
}

const COLORS = {
  healthy: '#34d399',
  warning: '#fbbf24',
  critical: '#f87171',
} as const;

export default function ArcGauge({ pct, color }: ArcGaugeProps) {
  const r = 38;
  const cx = 50;
  const cy = 50;
  const startAngle = -210;
  const endAngle = 30;
  const toRad = (a: number) => (a * Math.PI) / 180;

  const x = (angle: number) => cx + r * Math.cos(toRad(angle));
  const y = (angle: number) => cy + r * Math.sin(toRad(angle));

  const angle = startAngle + (endAngle - startAngle) * Math.min(1, Math.max(0, pct));
  const stroke = COLORS[color];

  const trackPath = `M ${x(startAngle)} ${y(startAngle)} A ${r} ${r} 0 1 1 ${x(endAngle)} ${y(endAngle)}`;
  const fillPath = `M ${x(startAngle)} ${y(startAngle)} A ${r} ${r} 0 ${angle - startAngle > 180 ? 1 : 0} 1 ${x(angle)} ${y(angle)}`;

  return (
    <svg viewBox="0 0 100 100" width="90" height="90" className="arc-gauge">
      <path
        d={trackPath}
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      {pct > 0 && (
        <path
          d={fillPath}
          stroke={stroke}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${stroke}88)` }}
        />
      )}
      <text
        x="50"
        y="55"
        textAnchor="middle"
        fill={stroke}
        fontSize="18"
        fontFamily="Space Mono, monospace"
        fontWeight="700"
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
