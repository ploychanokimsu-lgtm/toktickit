import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

const DETAIL_API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.MODE === "test"
    ? ""
    : "http://localhost:3000");

type Priority = "LOW" | "MEDIUM" | "HIGH";

type Status =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface TimelineEntry {
  id: number;
  content: string;
  createdAt: string;
  author: SafeUser;
}

interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: Status;
  createdAt: string;
  updatedAt: string;
  requester: SafeUser;
  owner: SafeUser | null;
  category: {
    id: number;
    name: string;
  };
  relatedSystem: {
    id: number;
    name: string;
  };
  attachments: Array<{
    id: number;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  }>;
  publicComments: TimelineEntry[];
  internalNotes: TimelineEntry[];
}

interface StaffTicketDetailProps {
  ticketId: number;
  currentUserId: number;
  onBack: () => void;
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${DETAIL_API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const body = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.error?.message ??
        "The request could not be completed."
    );
  }

  return body as T;
}

export default function StaffTicketDetail({
  ticketId,
  currentUserId,
  onBack,
}: StaffTicketDetailProps) {
  const [ticket, setTicket] =
    useState<TicketDetail | null>(null);
  const [staffMembers, setStaffMembers] =
    useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [notice, setNotice] = useState("");
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [detailResponse, staffResponse] =
        await Promise.all([
          requestJson<{ ticket: TicketDetail }>(
            `/api/staff/tickets/${ticketId}`
          ),
          requestJson<{
            staffMembers: SafeUser[];
          }>(
            "/api/staff/tickets/staff-members"
          ),
        ]);

      setTicket(detailResponse.ticket);
      setStaffMembers(
        staffResponse.staffMembers
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load Ticket Detail."
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function performOperation(
    path: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
    successMessage: string
  ) {
    setSaving(true);
    setErrorMessage("");
    setNotice("");

    try {
      await requestJson(path, {
        method,
        body: JSON.stringify(body),
      });

      setNotice(successMessage);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The operation could not be completed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitComment(
    event: FormEvent
  ) {
    event.preventDefault();

    const content = comment.trim();

    if (!content) {
      setErrorMessage(
        "Public Comment content is required."
      );
      return;
    }

    await performOperation(
      `/api/staff/tickets/${ticketId}/comments`,
      "POST",
      { content },
      "Public Comment added."
    );

    setComment("");
  }

  async function submitNote(event: FormEvent) {
    event.preventDefault();

    const content = note.trim();

    if (!content) {
      setErrorMessage(
        "Internal Note content is required."
      );
      return;
    }

    await performOperation(
      `/api/staff/tickets/${ticketId}/internal-notes`,
      "POST",
      { content },
      "Internal Note added."
    );

    setNote("");
  }

  if (loading && !ticket) {
    return (
      <main className="tk-page">
        <section className="tk-card">
          <div className="tk-state" role="status">
            <span
              className="tk-spinner"
              aria-hidden="true"
            />
            Loading Ticket Detail...
          </div>
        </section>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="tk-page">
        <div
          className="tk-alert tk-alert-error"
          role="alert"
        >
          {errorMessage ||
            "Ticket Detail is unavailable."}
        </div>

        <div className="tk-button-row">
          <button
            type="button"
            className="tk-button tk-button-secondary"
            onClick={onBack}
          >
            Back to queue
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="tk-page">
      <div className="tk-page-header">
        <div>
          <h1 className="tk-page-title">
            {ticket.ticketNumber}
          </h1>

          <p className="tk-page-description">
            {ticket.summary}
          </p>
        </div>

        <button
          type="button"
          className="tk-button tk-button-secondary"
          onClick={onBack}
        >
          Back to queue
        </button>
      </div>

      {errorMessage && (
        <div
          className="tk-alert tk-alert-error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {notice && (
        <div
          className="tk-alert tk-alert-success"
          role="status"
        >
          {notice}
        </div>
      )}

      <section className="tk-card">
        <div className="tk-card-body">
          <h2>Ticket Information</h2>

          <p>{ticket.description}</p>

          <div className="tk-queue-filter-grid">
            <div>
              <strong>Requester</strong>
              <div>{ticket.requester.name}</div>
              <div>{ticket.requester.email}</div>
            </div>

            <div>
              <strong>Category</strong>
              <div>{ticket.category.name}</div>
            </div>

            <div>
              <strong>Related System</strong>
              <div>
                {ticket.relatedSystem.name}
              </div>
            </div>

            <div>
              <strong>Requested Priority</strong>
              <div>
                {formatLabel(
                  ticket.requestedPriority
                )}
              </div>
            </div>

            <div>
              <strong>Created</strong>
              <div>
                {formatDate(ticket.createdAt)}
              </div>
            </div>

            <div>
              <strong>Last Updated</strong>
              <div>
                {formatDate(ticket.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tk-card">
        <div className="tk-card-body">
          <h2>Operations</h2>

          <div className="tk-queue-filter-grid">
            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="detail-owner"
              >
                Ticket Owner
              </label>

              <select
                id="detail-owner"
                className="tk-select"
                value={ticket.owner?.id ?? ""}
                disabled={saving}
                onChange={(event) => {
                  const ownerId = Number(
                    event.target.value
                  );

                  if (ownerId > 0) {
                    void performOperation(
                      `/api/staff/tickets/${ticketId}/assignment`,
                      "PATCH",
                      { ownerId },
                      "Ticket reassigned."
                    );
                  }
                }}
              >
                <option value="">
                  Unassigned
                </option>

                {staffMembers.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.name} (
                    {formatLabel(member.role)})
                  </option>
                ))}
              </select>
            </div>

            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="detail-priority"
              >
                IT Priority
              </label>

              <select
                id="detail-priority"
                className="tk-select"
                value={ticket.itPriority}
                disabled={saving}
                onChange={(event) =>
                  void performOperation(
                    `/api/staff/tickets/${ticketId}/priority`,
                    "PATCH",
                    {
                      itPriority:
                        event.target.value,
                    },
                    "IT Priority updated."
                  )
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">
                  Medium
                </option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="detail-status"
              >
                Status
              </label>

              <select
                id="detail-status"
                className="tk-select"
                value={ticket.currentStatus}
                disabled={saving}
                onChange={(event) =>
                  void performOperation(
                    `/api/staff/tickets/${ticketId}/status`,
                    "PATCH",
                    {
                      status:
                        event.target.value,
                    },
                    "Ticket Status updated."
                  )
                }
              >
                {[
                  "NEW",
                  "OPEN",
                  "IN_PROGRESS",
                  "WAITING_FOR_REQUESTER",
                  "RESOLVED",
                  "CLOSED",
                  "REOPENED",
                  "CANCELLED",
                ].map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!ticket.owner && (
            <div className="tk-button-row">
              <button
                type="button"
                className="tk-button tk-button-primary"
                disabled={saving}
                onClick={() =>
                  void performOperation(
                    `/api/staff/tickets/${ticketId}/claim`,
                    "POST",
                    {},
                    "Ticket claimed."
                  )
                }
              >
                Claim Ticket
              </button>
            </div>
          )}

          {ticket.owner?.id ===
            currentUserId && (
            <p>
              This Ticket is assigned to you.
            </p>
          )}
        </div>
      </section>

      <section className="tk-card">
        <div className="tk-card-body">
          <h2>Attachments</h2>

          {ticket.attachments.length === 0 ? (
            <p>No active attachments.</p>
          ) : (
            <ul>
              {ticket.attachments.map(
                (attachment) => (
                  <li key={attachment.id}>
                    {attachment.originalFilename} (
                    {attachment.mimeType},{" "}
                    {attachment.sizeBytes} bytes)
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </section>

      <section className="tk-card">
        <div className="tk-card-body">
          <h2>Public Comments</h2>

          {ticket.publicComments.length ===
          0 ? (
            <p>No Public Comments.</p>
          ) : (
            ticket.publicComments.map(
              (entry) => (
                <article
                  key={entry.id}
                  className="tk-card"
                >
                  <div className="tk-card-body">
                    <strong>
                      {entry.author.name}
                    </strong>
                    <p>{entry.content}</p>
                    <small>
                      {formatDate(
                        entry.createdAt
                      )}
                    </small>
                  </div>
                </article>
              )
            )
          )}

          <form onSubmit={submitComment}>
            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="public-comment"
              >
                Add Public Comment
              </label>

              <textarea
                id="public-comment"
                className="tk-input"
                value={comment}
                maxLength={5000}
                disabled={saving}
                onChange={(event) =>
                  setComment(event.target.value)
                }
              />
            </div>

            <button
              type="submit"
              className="tk-button tk-button-primary"
              disabled={
                saving || !comment.trim()
              }
            >
              Add Public Comment
            </button>
          </form>
        </div>
      </section>

      <section className="tk-card">
        <div className="tk-card-body">
          <h2>Internal Notes</h2>

          {ticket.internalNotes.length ===
          0 ? (
            <p>No Internal Notes.</p>
          ) : (
            ticket.internalNotes.map((entry) => (
              <article
                key={entry.id}
                className="tk-card"
              >
                <div className="tk-card-body">
                  <strong>
                    {entry.author.name}
                  </strong>
                  <p>{entry.content}</p>
                  <small>
                    {formatDate(entry.createdAt)}
                  </small>
                </div>
              </article>
            ))
          )}

          <form onSubmit={submitNote}>
            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="internal-note"
              >
                Add Internal Note
              </label>

              <textarea
                id="internal-note"
                className="tk-input"
                value={note}
                maxLength={5000}
                disabled={saving}
                onChange={(event) =>
                  setNote(event.target.value)
                }
              />
            </div>

            <button
              type="submit"
              className="tk-button tk-button-primary"
              disabled={saving || !note.trim()}
            >
              Add Internal Note
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
