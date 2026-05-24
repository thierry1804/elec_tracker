import type { TooltipProps } from 'recharts';

export interface ChartTooltipRow {
  label: string;
  value: string;
  color?: string;
}

interface ChartTooltipContentProps extends TooltipProps<number, string> {
  title?: string;
  rows?: ChartTooltipRow[];
  hiddenKeys?: string[];
  labelFormatter?: (label: string) => string;
  rowFormatter?: (dataKey: string, value: number, name: string) => ChartTooltipRow | null;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  title,
  rows,
  hiddenKeys = [],
  labelFormatter,
  rowFormatter,
}: ChartTooltipContentProps) {
  if (!active) return null;

  const header = title ?? (label != null ? (labelFormatter ? labelFormatter(String(label)) : String(label)) : null);

  let displayRows: ChartTooltipRow[] = rows ?? [];

  if (!rows && payload?.length) {
    displayRows = payload
      .filter((p) => p.dataKey && !hiddenKeys.includes(String(p.dataKey)))
      .map((entry) => {
        const key = String(entry.dataKey);
        const val = entry.value;
        if (val == null || (typeof val === 'number' && Number.isNaN(val))) return null;
        if (rowFormatter && typeof val === 'number') {
          return rowFormatter(key, val, String(entry.name ?? key));
        }
        return {
          label: String(entry.name ?? key),
          value: typeof val === 'number' ? val.toFixed(2).replace('.', ',') : String(val),
          color: entry.color,
        };
      })
      .filter((r): r is ChartTooltipRow => r != null);
  }

  if (displayRows.length === 0) return null;

  return (
    <div className="chart-tooltip-panel" role="status">
      {header && <div className="chart-tooltip-label">{header}</div>}
      <ul className="chart-tooltip-list">
        {displayRows.map((row) => (
          <li key={row.label} className="chart-tooltip-item">
            {row.color && (
              <span className="chart-tooltip-swatch" style={{ background: row.color }} aria-hidden />
            )}
            <span className="chart-tooltip-item-label">{row.label}</span>
            <span className="chart-tooltip-item-value mono">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
