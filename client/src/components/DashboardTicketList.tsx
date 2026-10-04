import { formatDateTime } from "../format.js";
import TicketStatusBadge, { formatStatusLabel } from "./TicketStatusBadge.js";
import type { DashboardTicket } from "../dashboard-api.js";

// Short Ticket list used by the Requester and staff dashboards.

function formatDate(value: string): string {
  return formatDateTime(value);
}

export default function DashboardTicketList({
  title,
  tickets,
  emptyText,
  onOpenTicket,
  showOwner = false,
}: {
  title: string;
  tickets: DashboardTicket[];
  emptyText: string;
  onOpenTicket: (ticketId: number) => void;
  showOwner?: boolean;
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
                  {ticket.itPriority && (
                    <span className={`tk-badge tk-badge-${ticket.itPriority.toLowerCase()}`}>
                      {formatStatusLabel(ticket.itPriority)}
                    </span>
                  )}
                  {showOwner && (
                    <span>{ticket.owner ? ticket.owner.name : "Unassigned"}</span>
                  )}
                  <span>
                    Updated{" "}
                    <time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
