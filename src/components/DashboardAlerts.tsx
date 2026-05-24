import { useState } from 'react';

type AlertKind = 'critical' | 'warning' | 'info';

export interface DashboardAlert {
  id: string;
  kind: AlertKind;
  message: React.ReactNode;
  priority: number;
  action?: { label: string; onClick: () => void };
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

  const renderAlert = (alert: DashboardAlert) => (
    <div
      key={alert.id}
      className={`${alertClass(alert.kind)} dashboard-alert-row`}
      role={alert.kind === 'critical' ? 'alert' : 'status'}
    >
      <span className="dashboard-alert-message">{alert.message}</span>
      {alert.action && (
        <button
          type="button"
          className="btn btn-primary btn-sm dashboard-alert-action"
          onClick={alert.action.onClick}
        >
          {alert.action.label}
        </button>
      )}
    </div>
  );

  return (
    <div className="dashboard-alerts">
      {renderAlert(primary)}
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
              {secondary.map(renderAlert)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type { DashboardAlert as DashboardAlertType };
