import { useState, type ReactNode } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { AppSettings } from '../types';

type Periode = NonNullable<AppSettings['periodeGraphiques']>;

const PERIODE_OPTIONS: { value: Periode; short: string; title: string }[] = [
  { value: '7', short: '7', title: '7 derniers jours' },
  { value: '30', short: '30', title: '30 derniers jours' },
  { value: '90', short: '90', title: '90 derniers jours' },
  { value: 'tout', short: '∞', title: 'Toute la période' },
];

const IconChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  </svg>
);

const IconTable = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="9" y1="4" x2="9" y2="20" />
  </svg>
);

export interface ChartTableColumn {
  key: string;
  header: string;
  align?: 'left' | 'right';
}

export interface ChartTableRow {
  [key: string]: string;
}

interface ChartShellProps {
  title: string;
  summary?: ReactNode;
  ariaSummary?: string;
  showPeriod?: boolean;
  tableColumns?: ChartTableColumn[];
  tableRows?: ChartTableRow[];
  children: ReactNode;
}

export default function ChartShell({
  title,
  summary,
  ariaSummary,
  showPeriod = false,
  tableColumns,
  tableRows,
  children,
}: ChartShellProps) {
  const { settings, updateSettings } = useSettings();
  const periode = settings.periodeGraphiques ?? '30';
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const hasTable = tableColumns != null && tableRows != null && tableRows.length > 0;

  const periodLabel =
    periode === 'tout' ? 'Toute la période' : `${periode} derniers jours`;

  return (
    <div
      className="chart-container"
      role="img"
      aria-label={ariaSummary ?? title}
    >
      <div className="chart-header">
        <div className="chart-header-top">
          <h3 className="chart-title">{title}</h3>
          {(showPeriod || hasTable) && (
            <div className="chart-header-actions">
              {showPeriod && (
                <div className="chart-toolbar" role="group" aria-label="Période affichée">
                  {PERIODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`chart-toolbar-btn chart-toolbar-btn-period${periode === opt.value ? ' chart-toolbar-btn-active' : ''}`}
                      onClick={() => updateSettings({ periodeGraphiques: opt.value })}
                      aria-pressed={periode === opt.value}
                      title={opt.title}
                      aria-label={opt.title}
                    >
                      {opt.short}
                    </button>
                  ))}
                </div>
              )}
              {hasTable && (
                <div className="chart-toolbar" role="group" aria-label="Mode d'affichage">
                  <button
                    type="button"
                    className={`chart-toolbar-btn${view === 'chart' ? ' chart-toolbar-btn-active' : ''}`}
                    onClick={() => setView('chart')}
                    aria-pressed={view === 'chart'}
                    title="Graphique"
                    aria-label="Graphique"
                  >
                    <IconChart />
                  </button>
                  <button
                    type="button"
                    className={`chart-toolbar-btn${view === 'table' ? ' chart-toolbar-btn-active' : ''}`}
                    onClick={() => setView('table')}
                    aria-pressed={view === 'table'}
                    title="Tableau"
                    aria-label="Tableau"
                  >
                    <IconTable />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {(showPeriod || summary) && (
          <div className="chart-header-meta">
            {showPeriod && <p className="chart-period-label">{periodLabel}</p>}
            {summary && <p className="chart-summary">{summary}</p>}
          </div>
        )}
      </div>

      {view === 'chart' || !hasTable ? children : (
        <div className="chart-table-wrap">
          <table className="chart-data-table">
            <thead>
              <tr>
                {tableColumns!.map((col) => (
                  <th key={col.key} className={col.align === 'right' ? 'chart-th-right' : undefined}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows!.map((row, i) => (
                <tr key={i}>
                  {tableColumns!.map((col) => (
                    <td key={col.key} className={col.align === 'right' ? 'chart-td-right mono' : undefined}>
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function useChartPeriodeJours(): number | undefined {
  const { settings } = useSettings();
  const periode = settings.periodeGraphiques ?? '30';
  return periode === 'tout' ? undefined : parseInt(periode, 10);
}
