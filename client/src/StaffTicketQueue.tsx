import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  ApiRequestError,
  getStaffQueueCategories,
  getStaffTicketQueue,
  type Category,
  type RequestedPriority,
  type StaffQueuePagination,
  type StaffQueueTicket,
  type TicketStatus,
} from "./api.js";

interface StaffTicketQueueProps {
  onOpenTicket: (ticketId: number) => void;
}

const EMPTY_PAGINATION: StaffQueuePagination = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
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

function priorityBadge(
  priority: RequestedPriority
): string {
  return `tk-badge tk-badge-${priority.toLowerCase()}`;
}

function statusBadge(status: TicketStatus): string {
  if (status === "NEW") {
    return "tk-badge tk-badge-new";
  }

  if (
    status === "RESOLVED" ||
    status === "CLOSED"
  ) {
    return "tk-badge tk-badge-low";
  }

  if (
    status === "CANCELLED" ||
    status === "WAITING_FOR_REQUESTER"
  ) {
    return "tk-badge tk-badge-neutral";
  }

  return "tk-badge tk-badge-medium";
}

export default function StaffTicketQueue({
  onOpenTicket,
}: StaffTicketQueueProps) {
  const [tickets, setTickets] = useState<
    StaffQueueTicket[]
  >([]);

  const [categories, setCategories] = useState<
    Category[]
  >([]);

  const [pagination, setPagination] =
    useState<StaffQueuePagination>(
      EMPTY_PAGINATION
    );

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] =
    useState("");
  const [
    requestedPriority,
    setRequestedPriority,
  ] = useState<RequestedPriority | "">("");
  const [itPriority, setItPriority] =
    useState<RequestedPriority | "">("");
  const [status, setStatus] =
    useState<TicketStatus | "">("");
  const [assignment, setAssignment] =
    useState<
      "all" | "assigned" | "unassigned" | "mine"
    >("all");

  const [sort, setSort] =
    useState<
      | "updatedAt"
      | "createdAt"
      | "ticketNumber"
      | "requestedPriority"
      | "itPriority"
      | "status"
    >("updatedAt");

  const [direction, setDirection] =
    useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState(10);

  const [loading, setLoading] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [forbidden, setForbidden] =
    useState(false);
  const [reloadKey, setReloadKey] =
    useState(0);

  useEffect(() => {
    let active = true;

    void getStaffQueueCategories()
      .then((loadedCategories) => {
        if (active) {
          setCategories(loadedCategories);
        }
      })
      .catch(() => {
        if (active) {
          setCategories([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setErrorMessage("");
    setForbidden(false);

    void getStaffTicketQueue({
      search,
      categoryId: categoryId
        ? Number(categoryId)
        : undefined,
      requestedPriority,
      itPriority,
      status,
      assignment,
      sort,
      direction,
      page,
      pageSize,
    })
      .then((response) => {
        if (!active) {
          return;
        }

        setTickets(response.tickets);
        setPagination(response.pagination);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setTickets([]);
        setPagination(EMPTY_PAGINATION);

        if (
          error instanceof ApiRequestError &&
          error.status === 403
        ) {
          setForbidden(true);
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load the Ticket Queue."
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    search,
    categoryId,
    requestedPriority,
    itPriority,
    status,
    assignment,
    sort,
    direction,
    page,
    pageSize,
    reloadKey,
  ]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setItPriority("");
    setStatus("");
    setAssignment("all");
    setSort("updatedAt");
    setDirection("desc");
    setPage(1);
    setPageSize(10);
  }

  const hasFilters =
    search !== "" ||
    categoryId !== "" ||
    requestedPriority !== "" ||
    itPriority !== "" ||
    status !== "" ||
    assignment !== "all";

  return (
    <main className="tk-page">
      <div className="tk-page-header">
        <div>
          <h1 className="tk-page-title">
            IT Staff Ticket Queue
          </h1>

          <p className="tk-page-description">
            Locate, filter and open Tickets requiring
            operational work.
          </p>
        </div>
      </div>

      <section
        className="tk-card tk-queue-filter-card"
        aria-label="Ticket Queue filters"
      >
        <div className="tk-card-body">
          <form
            className="tk-queue-search"
            onSubmit={submitSearch}
          >
            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="staff-queue-search"
              >
                Search
              </label>

              <input
                id="staff-queue-search"
                className="tk-input"
                value={searchInput}
                maxLength={150}
                placeholder="Ticket Number or Summary"
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
              />
            </div>

            <button
              type="submit"
              className="tk-button tk-button-primary"
            >
              Search
            </button>
          </form>

          <div className="tk-queue-filter-grid">
            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="queue-category"
              >
                Category
              </label>

              <select
                id="queue-category"
                className="tk-select"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="queue-requested-priority"
              >
                Requested Priority
              </label>

              <select
                id="queue-requested-priority"
                className="tk-select"
                value={requestedPriority}
                onChange={(event) => {
                  setRequestedPriority(
                    event.target.value as
                      | RequestedPriority
                      | ""
                  );
                  setPage(1);
                }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="queue-it-priority"
              >
                IT Priority
              </label>

              <select
                id="queue-it-priority"
                className="tk-select"
                value={itPriority}
                onChange={(event) => {
                  setItPriority(
                    event.target.value as
                      | RequestedPriority
                      | ""
                  );
                  setPage(1);
                }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="queue-status"
              >
                Status
              </label>

              <select
                id="queue-status"
                className="tk-select"
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value as
                      | TicketStatus
                      | ""
                  );
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">
                  In Progress
                </option>
                <option value="WAITING_FOR_REQUESTER">
                  Waiting for Requester
                </option>
                <option value="RESOLVED">
                  Resolved
                </option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">
                  Reopened
                </option>
                <option value="CANCELLED">
                  Cancelled
                </option>
              </select>
            </div>

            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="queue-assignment"
              >
                Assignment
              </label>

              <select
                id="queue-assignment"
                className="tk-select"
                value={assignment}
                onChange={(event) => {
                  setAssignment(
                    event.target.value as
                      | "all"
                      | "assigned"
                      | "unassigned"
                      | "mine"
                  );
                  setPage(1);
                }}
              >
                <option value="all">All Tickets</option>
                <option value="mine">
                  Assigned to Me
                </option>
                <option value="assigned">
                  Assigned
                </option>
                <option value="unassigned">
                  Unassigned
                </option>
              </select>
            </div>

            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="queue-sort"
              >
                Sort
              </label>

              <select
                id="queue-sort"
                className="tk-select"
                value={sort}
                onChange={(event) => {
                  setSort(
                    event.target.value as typeof sort
                  );
                  setPage(1);
                }}
              >
                <option value="updatedAt">
                  Last Updated
                </option>
                <option value="createdAt">
                  Created Date
                </option>
                <option value="ticketNumber">
                  Ticket Number
                </option>
                <option value="requestedPriority">
                  Requested Priority
                </option>
                <option value="itPriority">
                  IT Priority
                </option>
                <option value="status">
                  Status
                </option>
              </select>
            </div>

            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="queue-direction"
              >
                Direction
              </label>

              <select
                id="queue-direction"
                className="tk-select"
                value={direction}
                onChange={(event) => {
                  setDirection(
                    event.target.value as
                      | "asc"
                      | "desc"
                  );
                  setPage(1);
                }}
              >
                <option value="desc">
                  Descending
                </option>
                <option value="asc">
                  Ascending
                </option>
              </select>
            </div>
          </div>

          <div className="tk-button-row">
            <button
              type="button"
              className="tk-button tk-button-secondary"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <section
          className="tk-card"
          aria-busy="true"
        >
          <div className="tk-state" role="status">
            <span
              className="tk-spinner"
              aria-hidden="true"
            />
            Loading Ticket Queue...
          </div>
        </section>
      )}

      {!loading && forbidden && (
        <div
          className="tk-alert tk-alert-error"
          role="alert"
        >
          You do not have permission to access the
          IT Staff Ticket Queue.
        </div>
      )}

      {!loading && errorMessage && (
        <div
          className="tk-alert tk-alert-error"
          role="alert"
        >
          <div>{errorMessage}</div>

          <div className="tk-button-row">
            <button
              type="button"
              className="tk-button tk-button-secondary"
              onClick={() =>
                setReloadKey((value) => value + 1)
              }
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading &&
        !forbidden &&
        !errorMessage &&
        tickets.length === 0 && (
          <section className="tk-card">
            <div className="tk-state">
              <h2 className="tk-state-title">
                {hasFilters
                  ? "No matching Tickets"
                  : "The Ticket Queue is empty"}
              </h2>

              <p className="tk-state-text">
                {hasFilters
                  ? "Change or clear the current filters and try again."
                  : "There are currently no Tickets requiring operational work."}
              </p>
            </div>
          </section>
        )}

      {!loading &&
        !forbidden &&
        !errorMessage &&
        tickets.length > 0 && (
          <>
            <div
              className="tk-queue-summary"
              role="status"
            >
              {pagination.totalItems} Ticket
              {pagination.totalItems === 1
                ? ""
                : "s"}{" "}
              found
            </div>

            <section
              className="tk-queue-results"
              aria-label="Ticket Queue results"
            >
              {tickets.map((ticket) => (
                <article
                  className="tk-card tk-queue-ticket"
                  key={ticket.id}
                >
                  <div className="tk-card-body">
                    <div className="tk-queue-ticket-header">
                      <div>
                        <span className="tk-queue-number">
                          {ticket.ticketNumber}
                        </span>

                        <h2 className="tk-queue-title">
                          {ticket.summary}
                        </h2>
                      </div>

                      <span
                        className={statusBadge(
                          ticket.currentStatus
                        )}
                      >
                        {formatLabel(
                          ticket.currentStatus
                        )}
                      </span>
                    </div>

                    <dl className="tk-queue-details">
                      <div>
                        <dt>Category</dt>
                        <dd>{ticket.category.name}</dd>
                      </div>

                      <div>
                        <dt>Requested Priority</dt>
                        <dd>
                          <span
                            className={priorityBadge(
                              ticket.requestedPriority
                            )}
                          >
                            {formatLabel(
                              ticket.requestedPriority
                            )}
                          </span>
                        </dd>
                      </div>

                      <div>
                        <dt>IT Priority</dt>
                        <dd>
                          <span
                            className={priorityBadge(
                              ticket.itPriority
                            )}
                          >
                            {formatLabel(
                              ticket.itPriority
                            )}
                          </span>
                        </dd>
                      </div>

                      <div>
                        <dt>Ticket Owner</dt>
                        <dd>
                          {ticket.owner?.name ??
                            "Unassigned"}
                        </dd>
                      </div>

                      <div>
                        <dt>Created</dt>
                        <dd>
                          {formatDate(
                            ticket.createdAt
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>Last Updated</dt>
                        <dd>
                          {formatDate(
                            ticket.updatedAt
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="tk-button-row">
                      <button
                        type="button"
                        className="tk-button tk-button-primary"
                        onClick={() =>
                          onOpenTicket(ticket.id)
                        }
                      >
                        Open Ticket
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <div className="tk-queue-pagination">
              <div className="tk-form-group">
                <label
                  className="tk-label"
                  htmlFor="queue-page-size"
                >
                  Tickets per page
                </label>

                <select
                  id="queue-page-size"
                  className="tk-select"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(
                      Number(event.target.value)
                    );
                    setPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>

              <span>
                Page {pagination.page} of{" "}
                {Math.max(
                  pagination.totalPages,
                  1
                )}
              </span>

              <div className="tk-button-row">
                <button
                  type="button"
                  className="tk-button tk-button-secondary"
                  disabled={
                    !pagination.hasPreviousPage
                  }
                  onClick={() =>
                    setPage((value) =>
                      Math.max(1, value - 1)
                    )
                  }
                >
                  Previous
                </button>

                <button
                  type="button"
                  className="tk-button tk-button-secondary"
                  disabled={!pagination.hasNextPage}
                  onClick={() =>
                    setPage((value) => value + 1)
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
    </main>
  );
}