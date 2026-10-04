import { formatDateTime } from "./format.js";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

// Lab 4 Ticket status control (Issue #58). Lists only permitted next
// statuses from the backend and explains when the resolution gate blocks
// Resolved. The backend remains the authority (BR-19 to BR-21).

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.MODE === "test" ? "" : "http://localhost:3000");

const CONFIRM_STATUSES = ["CLOSED", "CANCELLED"];

const GATE_MESSAGES: Record<string, string> = {
  NO_OWNER: "Assign a Ticket Owner.",
  NO_ACTIONS_TAKEN: "Record at least one completed Action Taken.",
  LATEST_ACTION_NEEDS_FOLLOW_UP:
    "The latest completed Action Taken needs follow-up. Record a follow-up action first.",
  PLANNED_ACTIONS_REMAIN: "Complete or cancel the planned Actions Taken.",
};

interface WorkflowState {
  currentStatus: string;
  allowedNextStatuses: string[];
  resolutionGate: { satisfied: boolean; unmet: string[] };
  requesterResolutionIndicatedAt: string | null;
}

interface TicketWorkflowControlProps {
  ticketId: number;
  currentStatus: string;
  // Changes whenever the Ticket or its Actions Taken change.
  refreshKey: string;
  onChanged: () => void;
}

class RequestError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch {
    throw new RequestError(
      "NETWORK_ERROR",
      "The server could not be reached. Check your connection and try again."
    );
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new RequestError(
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "The request could not be completed."
    );
  }

  return body as T;
}

export function formatStatus(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ConfirmDialog({
  status,
  busy,
  onConfirm,
  onCancel,
}: {
  status: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Keep focus inside the dialog and close it with Escape.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === "Tab") {
      const first = cancelRef.current;
      const last = confirmRef.current;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  return (
    <div className="tk-dialog-backdrop">
      <div
        className="tk-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className="tk-dialog-title">
          Change status to {formatStatus(status)}?
        </h2>
        <p>
          {status === "CANCELLED"
            ? "Cancelling stops all work on this Ticket and makes its Actions Taken read-only."
            : "Closing finishes this Ticket and makes its Actions Taken read-only."}
        </p>
        <div className="tk-button-row">
          <button
            ref={cancelRef}
            type="button"
            className="tk-button tk-button-secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Keep current status
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`tk-button ${
              status === "CANCELLED" ? "tk-button-danger" : "tk-button-primary"
            }`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Saving..." : `Yes, ${formatStatus(status).toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TicketWorkflowControl({
  ticketId,
  currentStatus,
  refreshKey,
  onChanged,
}: TicketWorkflowControlProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<RequestError | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError("");

    try {
      setWorkflow(
        await requestJson<WorkflowState>(`/api/staff/tickets/${ticketId}/workflow`)
      );
    } catch (loadFailure) {
      setLoadError(
        loadFailure instanceof Error
          ? loadFailure.message
          : "Permitted statuses could not be loaded."
      );
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey, currentStatus]);

  const allowed = workflow?.allowedNextStatuses ?? [];
  const gateBlocked =
    allowed.includes("RESOLVED") && workflow?.resolutionGate.satisfied === false;

  async function changeStatus(status: string) {
    if (saving) return;

    setSaving(true);
    setError(null);
    setNotice("");

    try {
      await requestJson(`/api/staff/tickets/${ticketId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, expectedStatus: currentStatus }),
      });

      setNotice(`Status changed to ${formatStatus(status)}.`);
      setPendingConfirm(null);
      onChanged();
    } catch (changeFailure) {
      setError(
        changeFailure instanceof RequestError
          ? changeFailure
          : new RequestError("REQUEST_FAILED", "Ticket Status could not be updated.")
      );
      setPendingConfirm(null);
      void load();
    } finally {
      setSaving(false);
    }
  }

  function handleSelect(status: string) {
    if (status === currentStatus) return;

    if (CONFIRM_STATUSES.includes(status)) {
      setPendingConfirm(status);
      return;
    }

    void changeStatus(status);
  }

  function closeDialog() {
    setPendingConfirm(null);
    selectRef.current?.focus();
  }

  return (
    <div className="tk-form-group tk-workflow">
      <label className="tk-label" htmlFor="detail-status">
        Status
      </label>

      <select
        ref={selectRef}
        id="detail-status"
        className="tk-select"
        value={currentStatus}
        disabled={saving || !workflow}
        aria-describedby={gateBlocked ? "workflow-gate" : undefined}
        onChange={(event) => handleSelect(event.target.value)}
      >
        <option value={currentStatus}>{formatStatus(currentStatus)} (current)</option>
        {allowed.map((status) => (
          <option
            key={status}
            value={status}
            disabled={status === "RESOLVED" && gateBlocked}
          >
            {formatStatus(status)}
            {status === "RESOLVED" && gateBlocked ? " (not available yet)" : ""}
          </option>
        ))}
      </select>

      {allowed.length === 0 && workflow && (
        <p className="tk-help-text">No further status changes are allowed.</p>
      )}

      {gateBlocked && (
        <div id="workflow-gate" className="tk-workflow-gate">
          <strong>Resolved is not available yet:</strong>
          <ul>
            {workflow!.resolutionGate.unmet.map((code) => (
              <li key={code}>{GATE_MESSAGES[code] ?? code}</li>
            ))}
          </ul>
        </div>
      )}

      {workflow?.requesterResolutionIndicatedAt && (
        <p className="tk-workflow-indication">
          <span className="tk-badge tk-badge-new">
            <span aria-hidden="true">✓ </span>Requester says problem appears resolved
          </span>{" "}
          <span className="tk-help-text">
            {formatDateTime(workflow.requesterResolutionIndicatedAt)}
          </span>
        </p>
      )}

      {loadError && (
        <div className="tk-alert tk-alert-error" role="alert">
          {loadError}{" "}
          <button
            type="button"
            className="tk-button tk-button-secondary tk-button-sm"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div className="tk-alert tk-alert-success" role="status">
          {notice}
        </div>
      )}

      {error && (
        <div
          className={`tk-alert ${
            error.code === "TICKET_CHANGED" ? "tk-alert-warning" : "tk-alert-error"
          }`}
          role="alert"
        >
          {error.code === "TICKET_CHANGED"
            ? "This Ticket was updated by someone else. Reload to see the latest status."
            : error.message}{" "}
          {error.code === "TICKET_CHANGED" && (
            <button
              type="button"
              className="tk-button tk-button-secondary tk-button-sm"
              onClick={() => {
                setError(null);
                onChanged();
              }}
            >
              Reload
            </button>
          )}
        </div>
      )}

      {pendingConfirm && (
        <ConfirmDialog
          status={pendingConfirm}
          busy={saving}
          onConfirm={() => void changeStatus(pendingConfirm)}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
}
