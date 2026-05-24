export const CHART_HEIGHT = 300;
export const CHART_HEIGHT_MOBILE = 260;

export const CHART_MARGIN = {
  top: 8,
  right: 12,
  left: 4,
  bottom: 4,
} as const;

export const CHART_MARGIN_WITH_RIGHT_LABEL = {
  top: 8,
  right: 48,
  left: 4,
  bottom: 4,
} as const;

export const AXIS_TICK = {
  fill: 'var(--muted)',
  fontSize: 11,
};

export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: 'var(--border-subtle)',
  vertical: false,
};

export function formatKwhTick(value: number): string {
  if (Math.abs(value) >= 100) return `${Math.round(value)}`;
  return value.toFixed(1).replace('.', ',');
}

export function formatArTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

export function formatDateShort(iso: string): string {
  const d = iso.includes('T') ? iso : `${iso}T12:00:00`;
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function formatDateLong(iso: string): string {
  const d = iso.includes('T') ? iso : `${iso}T12:00:00`;
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function yAxisKwhProps(extra?: object) {
  return {
    stroke: 'var(--muted)',
    fontSize: 11,
    tickFormatter: (v: number) => formatKwhTick(v),
    width: 44,
    label: {
      value: 'kWh',
      angle: -90,
      position: 'insideLeft' as const,
      fill: 'var(--muted)',
      fontSize: 10,
      offset: 8,
    },
    ...extra,
  };
}

export function yAxisArProps(extra?: object) {
  return {
    stroke: 'var(--muted)',
    fontSize: 11,
    tickFormatter: (v: number) => formatArTick(v),
    width: 48,
    label: {
      value: 'Ar',
      angle: 90,
      position: 'insideRight' as const,
      fill: 'var(--muted)',
      fontSize: 10,
      offset: 8,
    },
    ...extra,
  };
}

export function xAxisDateProps(dataLength: number, extra?: object) {
  return {
    stroke: 'var(--muted)',
    fontSize: 11,
    minTickGap: dataLength > 12 ? 28 : 16,
    tickFormatter: formatDateShort,
    ...extra,
  };
}

export const LEGEND_STYLE = {
  wrapperStyle: { color: 'var(--text)', fontSize: 12, paddingTop: 8 },
};

export const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text)',
  padding: '8px 10px',
  boxShadow: 'var(--shadow-md)',
};

export const SERIE_REAL = 'var(--accent)';
export const SERIE_FORECAST = 'var(--muted)';
export const SERIE_BAND = 'oklch(from var(--amber) l c h / 0.2)';
export const SERIE_BAND_STROKE = 'oklch(from var(--amber) l c h / 0.55)';
