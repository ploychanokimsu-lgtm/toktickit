import { useCallback, useEffect, useState } from "react";

import MetricCard from "./components/MetricCard.js";
import TicketStatusBadge from "./components/TicketStatusBadge.js";
import {
  getRequesterDashboard,
  type DashboardTicket,
  type RequesterDashboardData,
} from "./dashboard-api.js";

// Lab 4 Requester Dashboard (Issue #59, ui-spec section 3).

interface RequesterDashboardProps {
  requesterName: string;
  onDrillDown: (status: string) => void;
  onOpenTicket: (ticketId: number) => void;
  onCreateTicket: () => void;
  onViewMyTickets: () => void;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function TicketList({
  title,
  tickets,
  emptyText,
  onOpenTicket,
}: {
  title: string;
  tickets: DashboardTicket[];
  emptyText: string;
  onOpenTicket: (ticketId: number) => void;
}) {
  return (
    <section className="tk-card tk-dashboard-list" aria-label={title}>
      <div className="tk-card-body">
        <h2 className="tk-card-title">{title}</h2>

        {tickets.length === 0 ? (
          <p className="tk-help-text">{emptyText}</p>
        ) : (
          <ul className="tk-dashboard-tickets">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  className="tk-dashboard-ticket-link"
                  onClick={() => onOpenTicket(ticket.id)}
                >
                  {ticket.ticketNumber}
                </button>
                <span className="tk-dashboard-summary" title={ticket.summary}>
                  {ticket.summary}
                </span>
                <span className="tk-dashboard-meta">
                  <TicketStatusBadge status={ticket.currentStatus} />
                  <time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function RequesterDashboard({
  requesterName,
  onDrillDown,
  onOpenTicket,
  onCreateTicket,
  onViewMyTickets,
}: RequesterDashboardProps) {
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await getRequesterDashboard());
    } catch (loadError) {
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

  return (
    <main className="tk-page">
      <div className="tk-page-header">
        <div>
          <h1 className="tk-page-title">Welcome, {requesterName}!</h1>
          <p className="tk-page-description">Here is the latest on your requests.</p>
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
            Loading your dashboard...
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

          <div className="tk-metric-grid" aria-label="Ticket summary">
            {data.metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                count={metric.count}
                emphasis={metric.key === "waitingForMe" && metric.count > 0}
                note={
                  metric.key === "waitingForMe" && metric.count > 0
                    ? "Needs your reply"
                    : undefined
                }
                onDrillDown={
                  metric.drillDown
                    ? () => onDrillDown(metric.drillDown!.query.status ?? "")
                    : undefined
                }
              />
            ))}
          </div>

          <div className="tk-dashboard-columns">
            <div className="tk-dashboard-main">
              <TicketList
                title="Recently Updated"
                tickets={data.recentlyUpdated}
                emptyText="No tickets updated in the last 7 days."
                onOpenTicket={onOpenTicket}
              />
              <TicketList
                title="Recently Resolved"
                tickets={data.recentlyResolved}
                emptyText="No recently resolved tickets."
                onOpenTicket={onOpenTicket}
              />
            </div>

            <section className="tk-card tk-dashboard-actions" aria-label="Quick Actions">
              <div className="tk-card-body">
                <h2 className="tk-card-title">Quick Actions</h2>
                <div className="tk-quick-actions">
                  <button
                    type="button"
                    className="tk-button tk-button-primary"
                    onClick={onCreateTicket}
                  >
                    Create Ticket
                  </button>
                  <button
                    type="button"
                    className="tk-button tk-button-secondary"
                    onClick={onViewMyTickets}
                  >
                    View My Tickets
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </main>
  );
}
