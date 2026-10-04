import { useCallback, useEffect, useState } from "react";

import DashboardTicketList from "./components/DashboardTicketList.js";
import MetricCard from "./components/MetricCard.js";
import { formatStatusLabel } from "./components/TicketStatusBadge.js";
import {
  DashboardError,
  getStaffDashboard,
  type StaffDashboardData,
} from "./dashboard-api.js";

// Lab 4 IT Staff and Administrator Dashboard (Issue #60, ui-spec section 4).

interface StaffDashboardProps {
  userName: string;
  isAdministrator: boolean;
  onDrillDown: (query: Record<string, string>) => void;
  onOpenTicket: (ticketId: number) => void;
  onOpenQueue: () => void;
  onOpenUsers?: () => void;
}

function Breakdown({
  title,
  items,
  onDrillDown,
}: {
  title: string;
  items: { label: string; count: number; query: Record<string, string>; tone: string }[];
  onDrillDown: (query: Record<string, string>) => void;
}) {
  return (
    <section className="tk-card tk-breakdown" aria-label={title}>
      <div className="tk-card-body">
        <h2 className="tk-card-title">{title}</h2>
        <ul className="tk-chip-list">
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className={`tk-chip ${item.tone}`}
                aria-label={`${item.label}: ${item.count}. View in Ticket Queue`}
                onClick={() => onDrillDown(item.query)}
              >
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STATUS_TONES: Record<string, string> = {
  NEW: "tk-badge-new",
  OPEN: "tk-badge-new",
  IN_PROGRESS: "tk-badge-new",
  WAITING_FOR_REQUESTER: "tk-badge-medium",
  REOPENED: "tk-badge-medium",
  RESOLVED: "tk-badge-neutral",
  CLOSED: "tk-badge-neutral",
  CANCELLED: "tk-badge-neutral",
};

export default function StaffDashboard({
  userName,
  isAdministrator,
  onDrillDown,
  onOpenTicket,
  onOpenQueue,
  onOpenUsers,
}: StaffDashboardProps) {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await getStaffDashboard());
      setForbidden(false);
    } catch (loadError) {
      if (loadError instanceof DashboardError && loadError.status === 403) {
        setForbidden(true);
      }

      setError(
        loadError instanceof Error ? loadError.message : "The dashboard could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (forbidden) {
    return (
      <main className="tk-page">
        <div className="tk-alert tk-alert-error" role="alert">
          You do not have access to the IT Staff dashboard.
        </div>
      </main>
    );
  }

  return (
    <main className="tk-page">
      <div className="tk-page-header">
        <div>
          <h1 className="tk-page-title">Welcome back, {userName}!</h1>
          <p className="tk-page-description">Here is what is happening in the queue today.</p>
        </div>
        <button
          type="button"
          className="tk-button tk-button-secondary"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading && data ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && !data ? (
        <section className="tk-card">
          <div className="tk-state" role="status">
            <span className="tk-spinner" aria-hidden="true" />
            Loading the dashboard...
          </div>
        </section>
      ) : error && !data ? (
        <div className="tk-alert tk-alert-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="tk-button tk-button-secondary tk-button-sm"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          {error && (
            <div className="tk-alert tk-alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="tk-metric-grid tk-metric-grid-3" aria-label="Queue summary">
            {data.metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                count={metric.count}
                emphasis={metric.key === "unassigned" && metric.count > 0}
                note={
                  metric.key === "unassigned" && metric.count > 0
                    ? "Needs an owner"
                    : undefined
                }
                actionLabel="View in queue"
                onDrillDown={
                  metric.drillDown
                    ? () => onDrillDown(metric.drillDown!.query)
                    : undefined
                }
              />
            ))}
          </div>

          <Breakdown
            title="Tickets by Status"
            items={data.byStatus.map((entry) => ({
              label: formatStatusLabel(entry.status),
              count: entry.count,
              query: entry.drillDown.query,
              tone: STATUS_TONES[entry.status] ?? "tk-badge-neutral",
            }))}
            onDrillDown={onDrillDown}
          />

          <Breakdown
            title="Active Tickets by IT Priority"
            items={data.byItPriority.map((entry) => ({
              label: formatStatusLabel(entry.itPriority),
              count: entry.count,
              query: entry.drillDown.query,
              tone: `tk-badge-${entry.itPriority.toLowerCase()}`,
            }))}
            onDrillDown={onDrillDown}
          />

          <div className="tk-dashboard-columns">
            <div className="tk-dashboard-main">
              <DashboardTicketList
                title="Urgent (High IT Priority, oldest first)"
                tickets={data.urgent}
                emptyText="No active High priority Tickets."
                onOpenTicket={onOpenTicket}
                showOwner
              />
              <DashboardTicketList
                title="Recently Updated"
                tickets={data.recentlyUpdated}
                emptyText="No Tickets yet."
                onOpenTicket={onOpenTicket}
                showOwner
              />
            </div>

            <div className="tk-dashboard-main">
              {isAdministrator && data.usersByRole && (
                <section className="tk-card" aria-label="Active Users">
                  <div className="tk-card-body">
                    <h2 className="tk-card-title">Active Users</h2>
                    <dl className="tk-user-counts">
                      <div>
                        <dt>Requesters</dt>
                        <dd>{data.usersByRole.REQUESTER}</dd>
                      </div>
                      <div>
                        <dt>IT Staff</dt>
                        <dd>{data.usersByRole.IT_STAFF}</dd>
                      </div>
                      <div>
                        <dt>Administrators</dt>
                        <dd>{data.usersByRole.ADMINISTRATOR}</dd>
                      </div>
                    </dl>
                    {onOpenUsers && (
                      <button
                        type="button"
                        className="tk-metric-link"
                        onClick={onOpenUsers}
                      >
                        Manage users <span aria-hidden="true">→</span>
                      </button>
                    )}
                  </div>
                </section>
              )}

              <section className="tk-card tk-dashboard-actions" aria-label="Quick Actions">
                <div className="tk-card-body">
                  <h2 className="tk-card-title">Quick Actions</h2>
                  <div className="tk-quick-actions">
                    <button
                      type="button"
                      className="tk-button tk-button-primary"
                      onClick={onOpenQueue}
                    >
                      Open Ticket Queue
                    </button>
                    <button
                      type="button"
                      className="tk-button tk-button-secondary"
                      onClick={() => onDrillDown({ assignment: "mine" })}
                    >
                      My Queue
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
