import { useId } from "react";

// Lab 4 dashboard metric card: label, value and an optional drill-down link.
// Only the link is interactive, so the card has no nested controls.

interface MetricCardProps {
  label: string;
  count: number;
  actionLabel?: string;
  onDrillDown?: () => void;
  note?: string;
  emphasis?: boolean;
}

export default function MetricCard({
  label,
  count,
  actionLabel = "View all",
  onDrillDown,
  note,
  emphasis = false,
}: MetricCardProps) {
  const labelId = useId();

  return (
    <section
      className={`tk-metric-card${emphasis ? " tk-metric-card-attention" : ""}`}
      aria-labelledby={labelId}
    >
      <h3 id={labelId} className="tk-metric-label">
        {label}
      </h3>
      <p className="tk-metric-value">{count}</p>
      {note && <p className="tk-metric-note">{note}</p>}
      {onDrillDown && (
        <button
          type="button"
          className="tk-metric-link"
          aria-label={`${actionLabel}: ${label}`}
          onClick={onDrillDown}
        >
          {actionLabel} <span aria-hidden="true">→</span>
        </button>
      )}
    </section>
  );
}
