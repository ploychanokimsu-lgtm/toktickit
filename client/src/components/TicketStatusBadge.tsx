// Ticket status shown as text and colour (non-colour cue: the label).

const FINISHED = ["RESOLVED", "CLOSED", "CANCELLED"];
const ATTENTION = ["WAITING_FOR_REQUESTER", "REOPENED"];

export function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function TicketStatusBadge({ status }: { status: string }) {
  const tone = FINISHED.includes(status)
    ? "tk-badge-neutral"
    : ATTENTION.includes(status)
      ? "tk-badge-medium"
      : "tk-badge-new";

  return <span className={`tk-badge ${tone}`}>{formatStatusLabel(status)}</span>;
}
