import { useState } from 'react';

type AlertKind = 'critical' | 'warning' | 'info';

interface DashboardAlert {
  id: string;
  kind: AlertKind;
  message: React.ReactNode;
  priority: number;
}

interface DashboardAlertsProps {
  alerts: DashboardAlert[];
}

function alertClass(kind: AlertKind): string {
  if (kind === 'info') return 'alert-banner alert-info';
  if (kind === 'warning') return 'alert-banner alert-warning';
  return 'alert-banner';
}

export default function DashboardAlerts({ alerts }: DashboardAlertsProps) {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) return null;

  const sorted = [...alerts].sort((a, b) => a.priority - b.priority);
  const primary = sorted[0];
  const secondary = sorted.slice(1);
  const role = primary.kind === 'critical' ? 'alert' : 'status';

  return (
    <div className="dashboard-alerts">
      <div className={alertClass(primary.kind)} role={role}>
        {primary.message}
      </div>
      {secondary.length > 0 && (
        <>
          <button
            type="button"
            className="dashboard-alerts-toggle"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
          >
            {expanded
              ? 'Masquer les autres alertes'
              : `Voir ${secondary.length} autre${secondary.length > 1 ? 's' : ''} alerte${secondary.length > 1 ? 's' : ''}`}
          </button>
          {expanded && (
            <div className="dashboard-alerts-secondary">
              {secondary.map((alert) => (
                <div
                  key={alert.id}
                  className={alertClass(alert.kind)}
                  role={alert.kind === 'critical' ? 'alert' : 'status'}
                >
                  {alert.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type { DashboardAlert };
