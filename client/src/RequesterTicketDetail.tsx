import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getTicketDetail,
  type DevelopmentRequester,
  type TicketDetail,
} from "./api.js";

interface RequesterTicketDetailProps {
  requester: DevelopmentRequester;
  ticketId: number;
  onBack: () => void;
}

function formatDate(
  value: string
): string {
  return new Date(
    value
  ).toLocaleString();
}

function priorityClass(
  priority: string
): string {
  if (priority === "HIGH") {
    return "tk-badge-high";
  }

  if (priority === "LOW") {
    return "tk-badge-low";
  }

  return "tk-badge-medium";
}

export default function RequesterTicketDetail({
  requester,
  ticketId,
  onBack,
}: RequesterTicketDetailProps) {
  const [ticket, setTicket] =
    useState<TicketDetail | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadTicket =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const loadedTicket =
          await getTicketDetail(
            requester.id,
            ticketId
          );

        setTicket(loadedTicket);
      } catch (loadError) {
        setTicket(null);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load Ticket Detail. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }, [
      requester.id,
      ticketId,
    ]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  return (
    <main className="tk-page tk-page-medium">
      <div className="tk-page-header">
        <div>
          <h1 className="tk-page-title">
            Ticket Detail
          </h1>

          <p className="tk-page-description">
            Review the current
            Requester-facing Ticket
            information.
          </p>
        </div>

        <button
          type="button"
          className="tk-button tk-button-secondary"
          onClick={onBack}
        >
          Back to My Tickets
        </button>
      </div>

      {loading && (
        <div
          className="tk-state"
          role="status"
        >
          <span
            className="tk-spinner"
            aria-hidden="true"
          />
          Loading Ticket Detail...
        </div>
      )}

      {error && (
        <div
          className="tk-alert tk-alert-error"
          role="alert"
        >
          <div>{error}</div>

          <div className="tk-button-row">
            <button
              type="button"
              className="tk-button tk-button-secondary"
              onClick={() =>
                void loadTicket()
              }
            >
              Retry
            </button>

            <button
              type="button"
              className="tk-button tk-button-tertiary"
              onClick={onBack}
            >
              Back to My Tickets
            </button>
          </div>
        </div>
      )}

      {!loading &&
        !error &&
        ticket && (
          <>
            <section className="tk-card">
              <div className="tk-card-body">
                <h2 className="tk-card-title">
                  Ticket Information
                </h2>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Ticket Number
                      </label>

                      <div className="tk-readonly">
                        <strong>
                          {
                            ticket.ticketNumber
                          }
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Ticket Date
                      </label>

                      <div className="tk-readonly">
                        {formatDate(
                          ticket.createdAt
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-12">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Requester
                      </label>

                      <div className="tk-readonly">
                        <strong>
                          {
                            ticket.requester
                              .name
                          }
                        </strong>
                        {" — "}
                        {
                          ticket.requester
                            .email
                        }
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Category
                      </label>

                      <div className="tk-readonly">
                        {
                          ticket.category
                            .name
                        }
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Related System
                      </label>

                      <div className="tk-readonly">
                        {
                          ticket.relatedSystem
                            .name
                        }
                      </div>
                    </div>
                  </div>

                  <div className="col-md-12">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Ticket Summary
                      </label>

                      <div className="tk-readonly">
                        {ticket.summary}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Requested Priority
                      </label>

                      <div className="tk-readonly">
                        <span
                          className={`tk-badge ${priorityClass(
                            ticket.requestedPriority
                          )}`}
                        >
                          {
                            ticket.requestedPriority
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        IT Priority
                      </label>

                      <div className="tk-readonly">
                        {ticket.itPriority ? (
                          <span
                            className={`tk-badge ${priorityClass(
                              ticket.itPriority
                            )}`}
                          >
                            {
                              ticket.itPriority
                            }
                          </span>
                        ) : (
                          "Not assigned"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Current Status
                      </label>

                      <div className="tk-readonly">
                        <span className="tk-badge tk-badge-new">
                          New
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-12">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Description
                      </label>

                      <div className="tk-readonly">
                        {
                          ticket.description
                        }
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Created
                      </label>

                      <div className="tk-readonly">
                        {formatDate(
                          ticket.createdAt
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="tk-form-group">
                      <label className="tk-label">
                        Last Updated
                      </label>

                      <div className="tk-readonly">
                        {formatDate(
                          ticket.updatedAt
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="tk-card mt-3">
              <div className="tk-card-body">
                <h2 className="tk-card-title">
                  Attachments
                </h2>

                {ticket.attachments
                  .length === 0 ? (
                  <div className="tk-alert tk-alert-info">
                    No attachments have
                    been added to this
                    Ticket.
                  </div>
                ) : (
                  <div className="d-grid gap-2">
                    {ticket.attachments.map(
                      (attachment) => (
                        <div
                          key={
                            attachment.id
                          }
                          className="tk-readonly"
                        >
                          <strong>
                            {
                              attachment.originalFilename
                            }
                          </strong>

                          {attachment.isRemoved && (
                            <span className="tk-badge tk-badge-neutral ms-2">
                              Removed
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                <p className="tk-help-text mt-3 mb-0">
                  Attachment management
                  is implemented in the
                  next Lab 2 increment.
                </p>
              </div>
            </section>
          </>
        )}
    </main>
  );
}