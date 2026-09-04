import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import RequesterTicketDetail from "./RequesterTicketDetail.js";

import {
  createTicket,
  getCategories,
  getDevelopmentRequesters,
  getMyTickets,
  getRelatedSystems,
  type Category,
  type CreatedTicket,
  type DevelopmentRequester,
  type RelatedSystem,
  type RequestedPriority,
  type TicketListItem,
} from "./api.js";

const REQUESTER_STORAGE_KEY =
  "developmentRequesterId";

type RequesterViewState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

type AppScreen =
  | "create"
  | "myTickets"
  | "ticketDetail";

interface FormErrors {
  categoryId?: string;
  relatedSystemId?: string;
  summary?: string;
  description?: string;
}

function createSubmissionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

// ============================================================
// Create Ticket
// ============================================================

function CreateTicketScreen({
  requester,
}: {
  requester: DevelopmentRequester;
}) {
  const [categories, setCategories] = useState<
    Category[]
  >([]);

  const [
    relatedSystems,
    setRelatedSystems,
  ] = useState<RelatedSystem[]>([]);

  const [
    referenceLoading,
    setReferenceLoading,
  ] = useState(true);

  const [
    referenceError,
    setReferenceError,
  ] = useState("");

  const [categoryId, setCategoryId] =
    useState("");

  const [
    relatedSystemId,
    setRelatedSystemId,
  ] = useState("");

  const [summary, setSummary] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [
    requestedPriority,
    setRequestedPriority,
  ] =
    useState<RequestedPriority>(
      "MEDIUM"
    );

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [
    createdTicket,
    setCreatedTicket,
  ] =
    useState<CreatedTicket | null>(
      null
    );

  const submissionIdRef = useRef(
    createSubmissionId()
  );

  const loadReferenceData =
    useCallback(async () => {
      setReferenceLoading(true);
      setReferenceError("");

      try {
        const [
          loadedCategories,
          loadedSystems,
        ] = await Promise.all([
          getCategories(),
          getRelatedSystems(),
        ]);

        setCategories(
          loadedCategories
        );

        setRelatedSystems(
          loadedSystems
        );
      } catch (error) {
        setReferenceError(
          error instanceof Error
            ? error.message
            : "Unable to load Ticket reference data."
        );
      } finally {
        setReferenceLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};

    if (!categoryId) {
      nextErrors.categoryId =
        "Category is required.";
    }

    if (!relatedSystemId) {
      nextErrors.relatedSystemId =
        "Related System is required.";
    }

    const trimmedSummary =
      summary.trim();

    if (trimmedSummary.length < 5) {
      nextErrors.summary =
        "Ticket Summary must contain at least 5 characters.";
    } else if (
      trimmedSummary.length > 150
    ) {
      nextErrors.summary =
        "Ticket Summary must not exceed 150 characters.";
    }

    const trimmedDescription =
      description.trim();

    if (
      trimmedDescription.length < 10
    ) {
      nextErrors.description =
        "Description must contain at least 10 characters.";
    } else if (
      trimmedDescription.length > 5000
    ) {
      nextErrors.description =
        "Description must not exceed 5000 characters.";
    }

    return nextErrors;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const nextErrors =
      validateForm();

    setErrors(nextErrors);
    setSubmitError("");
    setCreatedTicket(null);

    if (
      Object.keys(nextErrors).length >
      0
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const ticket =
        await createTicket({
          clientSubmissionId:
            submissionIdRef.current,

          requesterId:
            requester.id,

          categoryId:
            Number(categoryId),

          relatedSystemId:
            Number(relatedSystemId),

          summary: summary.trim(),

          requestedPriority,

          description:
            description.trim(),
        });

      setCreatedTicket(ticket);

      submissionIdRef.current =
        createSubmissionId();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "The Ticket could not be created. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const ticketDate = createdTicket
    ? formatDate(
        createdTicket.createdAt
      )
    : "Generated when submitted";

  return (
    <main className="tk-page tk-page-medium">
      <div className="tk-page-header">
        <div>
          <h1 className="tk-page-title">
            Create Ticket
          </h1>

          <p className="tk-page-description">
            Submit a new IT support
            request.
          </p>
        </div>
      </div>

      {createdTicket && (
        <div
          className="tk-alert tk-alert-success"
          role="status"
        >
          <strong>
            Ticket created successfully.
          </strong>

          <div>
            Official Ticket Number:{" "}
            <strong>
              {
                createdTicket.ticketNumber
              }
            </strong>
          </div>
        </div>
      )}

      {submitError && (
        <div
          className="tk-alert tk-alert-error"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {referenceError && (
        <div
          className="tk-alert tk-alert-error"
          role="alert"
        >
          <div>
            {referenceError}
          </div>

          <div className="tk-button-row">
            <button
              type="button"
              className="tk-button tk-button-secondary"
              onClick={() =>
                void loadReferenceData()
              }
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <section className="tk-card">
        <div className="tk-card-body">
          <h2 className="tk-card-title">
            Ticket Information
          </h2>

          <form
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="row g-3">
              <div className="col-md-6">
                <div className="tk-form-group">
                  <label className="tk-label">
                    Ticket Number
                  </label>

                  <div className="tk-readonly">
                    {createdTicket
                      ?.ticketNumber ??
                      "Generated after successful submission"}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="tk-form-group">
                  <label className="tk-label">
                    Ticket Date
                  </label>

                  <div className="tk-readonly">
                    {ticketDate}
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
                      {requester.name}
                    </strong>
                    {" — "}
                    {requester.email}
                  </div>

                  <p className="tk-help-text">
                    Populated from the
                    selected Development
                    Requester.
                  </p>
                </div>
              </div>

              <div className="col-md-6">
                <div className="tk-form-group">
                  <label
                    htmlFor="ticket-category"
                    className="tk-label"
                  >
                    Category{" "}
                    <span
                      className="tk-required"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </label>

                  <select
                    id="ticket-category"
                    className={`tk-select ${
                      errors.categoryId
                        ? "tk-input-invalid"
                        : ""
                    }`}
                    value={categoryId}
                    onChange={(event) => {
                      setCategoryId(
                        event.target.value
                      );

                      if (
                        errors.categoryId
                      ) {
                        setErrors(
                          (current) => ({
                            ...current,
                            categoryId:
                              undefined,
                          })
                        );
                      }
                    }}
                    disabled={
                      referenceLoading ||
                      Boolean(
                        referenceError
                      ) ||
                      submitting
                    }
                    aria-invalid={Boolean(
                      errors.categoryId
                    )}
                  >
                    <option value="">
                      Select a category
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  {errors.categoryId && (
                    <div className="tk-field-error">
                      {
                        errors.categoryId
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="col-md-6">
                <div className="tk-form-group">
                  <label
                    htmlFor="ticket-related-system"
                    className="tk-label"
                  >
                    Related System{" "}
                    <span
                      className="tk-required"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </label>

                  <select
                    id="ticket-related-system"
                    className={`tk-select ${
                      errors.relatedSystemId
                        ? "tk-input-invalid"
                        : ""
                    }`}
                    value={
                      relatedSystemId
                    }
                    onChange={(event) => {
                      setRelatedSystemId(
                        event.target.value
                      );

                      if (
                        errors.relatedSystemId
                      ) {
                        setErrors(
                          (current) => ({
                            ...current,
                            relatedSystemId:
                              undefined,
                          })
                        );
                      }
                    }}
                    disabled={
                      referenceLoading ||
                      Boolean(
                        referenceError
                      ) ||
                      submitting
                    }
                    aria-invalid={Boolean(
                      errors.relatedSystemId
                    )}
                  >
                    <option value="">
                      Select a related
                      system
                    </option>

                    {relatedSystems.map(
                      (system) => (
                        <option
                          key={
                            system.id
                          }
                          value={
                            system.id
                          }
                        >
                          {system.name}
                        </option>
                      )
                    )}
                  </select>

                  {errors.relatedSystemId && (
                    <div className="tk-field-error">
                      {
                        errors.relatedSystemId
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="col-md-12">
                <div className="tk-form-group">
                  <label
                    htmlFor="ticket-summary"
                    className="tk-label"
                  >
                    Ticket Summary{" "}
                    <span
                      className="tk-required"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </label>

                  <input
                    id="ticket-summary"
                    className={`tk-input ${
                      errors.summary
                        ? "tk-input-invalid"
                        : ""
                    }`}
                    type="text"
                    value={summary}
                    maxLength={150}
                    disabled={submitting}
                    aria-invalid={Boolean(
                      errors.summary
                    )}
                    onChange={(event) => {
                      setSummary(
                        event.target.value
                      );

                      if (
                        errors.summary
                      ) {
                        setErrors(
                          (current) => ({
                            ...current,
                            summary:
                              undefined,
                          })
                        );
                      }
                    }}
                  />

                  <p className="tk-help-text">
                    5–150 characters.
                  </p>

                  {errors.summary && (
                    <div className="tk-field-error">
                      {
                        errors.summary
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="col-md-6">
                <div className="tk-form-group">
                  <label
                    htmlFor="requested-priority"
                    className="tk-label"
                  >
                    Requested Priority{" "}
                    <span
                      className="tk-required"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </label>

                  <select
                    id="requested-priority"
                    className="tk-select"
                    value={
                      requestedPriority
                    }
                    disabled={submitting}
                    onChange={(event) =>
                      setRequestedPriority(
                        event.target
                          .value as RequestedPriority
                      )
                    }
                  >
                    <option value="LOW">
                      Low
                    </option>

                    <option value="MEDIUM">
                      Medium
                    </option>

                    <option value="HIGH">
                      High
                    </option>
                  </select>
                </div>
              </div>

              <div className="col-md-6">
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
                  <label
                    htmlFor="ticket-description"
                    className="tk-label"
                  >
                    Description{" "}
                    <span
                      className="tk-required"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </label>

                  <textarea
                    id="ticket-description"
                    className={`tk-textarea ${
                      errors.description
                        ? "tk-input-invalid"
                        : ""
                    }`}
                    rows={6}
                    value={description}
                    maxLength={5000}
                    disabled={submitting}
                    aria-invalid={Boolean(
                      errors.description
                    )}
                    onChange={(event) => {
                      setDescription(
                        event.target.value
                      );

                      if (
                        errors.description
                      ) {
                        setErrors(
                          (current) => ({
                            ...current,
                            description:
                              undefined,
                          })
                        );
                      }
                    }}
                  />

                  <p className="tk-help-text">
                    10–5000 characters.
                  </p>

                  {errors.description && (
                    <div className="tk-field-error">
                      {
                        errors.description
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            {referenceLoading && (
              <div
                className="tk-state"
                role="status"
              >
                <span
                  className="tk-spinner"
                  aria-hidden="true"
                />
                Loading Ticket
                reference data...
              </div>
            )}

            <div className="tk-button-row">
              <button
                type="submit"
                className="tk-button tk-button-primary"
                disabled={
                  submitting ||
                  referenceLoading ||
                  Boolean(
                    referenceError
                  )
                }
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Ticket"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

// ============================================================
// My Tickets
// ============================================================

function MyTicketsScreen({
  requester,
  onOpenTicket,
}: {
  requester: DevelopmentRequester;
  onOpenTicket: (
    ticketId: number
  ) => void;
}) {
  const [tickets, setTickets] =
    useState<TicketListItem[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [
    relatedSystems,
    setRelatedSystems,
  ] = useState<RelatedSystem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState("");

  const [categoryId, setCategoryId] =
    useState("");

  const [
    relatedSystemId,
    setRelatedSystemId,
  ] = useState("");

  const [
    requestedPriority,
    setRequestedPriority,
  ] = useState<
    RequestedPriority | ""
  >("");

  const [sortValue, setSortValue] =
    useState("updatedAt:desc");

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState<10 | 20 | 50>(10);

  const [
    totalItems,
    setTotalItems,
  ] = useState(0);

  const [
    totalPages,
    setTotalPages,
  ] = useState(0);

  const [
    retryVersion,
    setRetryVersion,
  ] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadReferences() {
      try {
        const [
          loadedCategories,
          loadedSystems,
        ] = await Promise.all([
          getCategories(),
          getRelatedSystems(),
        ]);

        if (!active) {
          return;
        }

        setCategories(
          loadedCategories
        );

        setRelatedSystems(
          loadedSystems
        );
      } catch {
        // My Tickets API error
        // remains the main screen error.
      }
    }

    void loadReferences();

    return () => {
      active = false;
    };
  }, []);

  const loadTickets =
    useCallback(async () => {
      setLoading(true);
      setError("");

      const [
        sortBy,
        sortOrder,
      ] = sortValue.split(":") as [
        | "updatedAt"
        | "createdAt"
        | "ticketNumber"
        | "summary"
        | "requestedPriority",
        "asc" | "desc",
      ];

      try {
        const result =
          await getMyTickets(
            requester.id,
            {
              search:
                appliedSearch,

              categoryId:
                categoryId
                  ? Number(
                      categoryId
                    )
                  : undefined,

              relatedSystemId:
                relatedSystemId
                  ? Number(
                      relatedSystemId
                    )
                  : undefined,

              requestedPriority,

              sortBy,
              sortOrder,
              page,
              pageSize,
            }
          );

        setTickets(
          result.tickets
        );

        setTotalItems(
          result.pagination
            .totalItems
        );

        setTotalPages(
          result.pagination
            .totalPages
        );

        if (
          result.pagination
            .totalPages > 0 &&
          page >
            result.pagination
              .totalPages
        ) {
          setPage(
            result.pagination
              .totalPages
          );
        }
      } catch (loadError) {
        setTickets([]);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load Tickets. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }, [
      requester.id,
      appliedSearch,
      categoryId,
      relatedSystemId,
      requestedPriority,
      sortValue,
      page,
      pageSize,
    ]);

  useEffect(() => {
    void loadTickets();
  }, [
    loadTickets,
    retryVersion,
  ]);

  function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPage(1);

    const nextSearch =
      searchInput.trim();

    if (
      nextSearch ===
      appliedSearch
    ) {
      setRetryVersion(
        (current) =>
          current + 1
      );
    } else {
      setAppliedSearch(
        nextSearch
      );
    }
  }

  function clearFilters() {
    setSearchInput("");
    setAppliedSearch("");
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("");
    setSortValue(
      "updatedAt:desc"
    );
    setPageSize(10);
    setPage(1);
  }

  const hasSearchOrFilters =
    Boolean(appliedSearch) ||
    Boolean(categoryId) ||
    Boolean(
      relatedSystemId
    ) ||
    Boolean(
      requestedPriority
    );

  return (
    <main className="tk-page">
      <div className="tk-page-header">
        <div>
          <h1 className="tk-page-title">
            My Tickets
          </h1>

          <p className="tk-page-description">
            Search and review
            tickets belonging to{" "}
            <strong>
              {requester.name}
            </strong>
            .
          </p>
        </div>
      </div>

      <section className="tk-card mb-3">
        <div className="tk-card-body">
          <form
            onSubmit={
              handleSearch
            }
          >
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="tk-form-group">
                  <label
                    htmlFor="ticket-search"
                    className="tk-label"
                  >
                    Search
                  </label>

                  <input
                    id="ticket-search"
                    className="tk-input"
                    value={
                      searchInput
                    }
                    onChange={(
                      event
                    ) =>
                      setSearchInput(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ticket Number or Summary"
                  />
                </div>
              </div>

              <div className="col-md-6 col-lg-2">
                <div className="tk-form-group">
                  <label
                    htmlFor="filter-category"
                    className="tk-label"
                  >
                    Category
                  </label>

                  <select
                    id="filter-category"
                    className="tk-select"
                    value={
                      categoryId
                    }
                    onChange={(
                      event
                    ) => {
                      setCategoryId(
                        event.target
                          .value
                      );
                      setPage(1);
                    }}
                  >
                    <option value="">
                      All
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="col-md-6 col-lg-2">
                <div className="tk-form-group">
                  <label
                    htmlFor="filter-system"
                    className="tk-label"
                  >
                    Related System
                  </label>

                  <select
                    id="filter-system"
                    className="tk-select"
                    value={
                      relatedSystemId
                    }
                    onChange={(
                      event
                    ) => {
                      setRelatedSystemId(
                        event.target
                          .value
                      );
                      setPage(1);
                    }}
                  >
                    <option value="">
                      All
                    </option>

                    {relatedSystems.map(
                      (system) => (
                        <option
                          key={
                            system.id
                          }
                          value={
                            system.id
                          }
                        >
                          {
                            system.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="col-md-6 col-lg-2">
                <div className="tk-form-group">
                  <label
                    htmlFor="filter-priority"
                    className="tk-label"
                  >
                    Priority
                  </label>

                  <select
                    id="filter-priority"
                    className="tk-select"
                    value={
                      requestedPriority
                    }
                    onChange={(
                      event
                    ) => {
                      setRequestedPriority(
                        event.target
                          .value as
                          | RequestedPriority
                          | ""
                      );
                      setPage(1);
                    }}
                  >
                    <option value="">
                      All
                    </option>

                    <option value="LOW">
                      Low
                    </option>

                    <option value="MEDIUM">
                      Medium
                    </option>

                    <option value="HIGH">
                      High
                    </option>
                  </select>
                </div>
              </div>

              <div className="col-md-6 col-lg-2">
                <div className="tk-form-group">
                  <label
                    htmlFor="ticket-sort"
                    className="tk-label"
                  >
                    Sort
                  </label>

                  <select
                    id="ticket-sort"
                    className="tk-select"
                    value={sortValue}
                    onChange={(
                      event
                    ) => {
                      setSortValue(
                        event.target
                          .value
                      );
                      setPage(1);
                    }}
                  >
                    <option value="updatedAt:desc">
                      Last Updated —
                      Newest
                    </option>

                    <option value="updatedAt:asc">
                      Last Updated —
                      Oldest
                    </option>

                    <option value="createdAt:desc">
                      Created —
                      Newest
                    </option>

                    <option value="ticketNumber:asc">
                      Ticket Number —
                      A-Z
                    </option>

                    <option value="summary:asc">
                      Summary — A-Z
                    </option>

                    <option value="requestedPriority:asc">
                      Priority
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="tk-button-row">
              <button
                type="submit"
                className="tk-button tk-button-primary"
              >
                Search
              </button>

              <button
                type="button"
                className="tk-button tk-button-secondary"
                onClick={
                  clearFilters
                }
              >
                Clear Filters
              </button>
            </div>
          </form>
        </div>
      </section>

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
                setRetryVersion(
                  (current) =>
                    current + 1
                )
              }
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div
          className="tk-state"
          role="status"
        >
          <span
            className="tk-spinner"
            aria-hidden="true"
          />
          Loading your Tickets...
        </div>
      )}

      {!loading &&
        !error &&
        tickets.length === 0 &&
        !hasSearchOrFilters && (
          <div className="tk-alert tk-alert-info">
            You do not have any
            tickets yet.
          </div>
        )}

      {!loading &&
        !error &&
        tickets.length === 0 &&
        hasSearchOrFilters && (
          <div className="tk-alert tk-alert-info">
            No tickets match your
            current search or
            filters.
          </div>
        )}

      {!loading &&
        !error &&
        tickets.length > 0 && (
          <>
            <section className="tk-card">
              <div className="tk-card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <h2 className="tk-card-title mb-0">
                    Tickets
                  </h2>

                  <span className="tk-help-text">
                    {totalItems} total
                  </span>
                </div>

                {/* Desktop / Tablet */}
                <div className="d-none d-md-block">
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>
                            Ticket Number
                          </th>
                          <th>
                            Summary
                          </th>
                          <th>
                            Category
                          </th>
                          <th>
                            Related System
                          </th>
                          <th>
                            Priority
                          </th>
                          <th>
                            Status
                          </th>
                          <th>
                            Last Updated
                          </th>
                          <th>
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {tickets.map(
                          (ticket) => (
                            <tr
                              key={
                                ticket.id
                              }
                            >
                              <td>
                                <strong>
                                  {
                                    ticket.ticketNumber
                                  }
                                </strong>
                              </td>

                              <td>
                                {
                                  ticket.summary
                                }
                              </td>

                              <td>
                                {
                                  ticket.category
                                    .name
                                }
                              </td>

                              <td>
                                {
                                  ticket.relatedSystem
                                    .name
                                }
                              </td>

                              <td>
                                <span
                                  className={`tk-badge ${
                                    ticket.requestedPriority ===
                                    "HIGH"
                                      ? "tk-badge-high"
                                      : ticket.requestedPriority ===
                                          "LOW"
                                        ? "tk-badge-low"
                                        : "tk-badge-medium"
                                  }`}
                                >
                                  {
                                    ticket.requestedPriority
                                  }
                                </span>
                              </td>

                              <td>
                                <span className="tk-badge tk-badge-new">
                                  New
                                </span>
                              </td>

                              <td>
                                {formatDate(
                                  ticket.updatedAt
                                )}
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className="tk-button tk-button-secondary tk-button-sm"
                                  onClick={() =>
                                    onOpenTicket(
                                      ticket.id
                                    )
                                  }
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile */}
                <div className="d-md-none">
                  <div className="d-grid gap-3">
                    {tickets.map(
                      (ticket) => (
                        <article
                          key={
                            ticket.id
                          }
                          className="tk-card"
                        >
                          <div className="tk-card-body">
                            <strong>
                              {
                                ticket.ticketNumber
                              }
                            </strong>

                            <h3 className="h6 mt-2">
                              {
                                ticket.summary
                              }
                            </h3>

                            <div className="tk-help-text">
                              {
                                ticket.category
                                  .name
                              }{" "}
                              ·{" "}
                              {
                                ticket.relatedSystem
                                  .name
                              }
                            </div>

                            <div className="d-flex gap-2 flex-wrap mt-2">
                              <span
                                className={`tk-badge ${
                                  ticket.requestedPriority ===
                                  "HIGH"
                                    ? "tk-badge-high"
                                    : ticket.requestedPriority ===
                                        "LOW"
                                      ? "tk-badge-low"
                                      : "tk-badge-medium"
                                }`}
                              >
                                {
                                  ticket.requestedPriority
                                }
                              </span>

                              <span className="tk-badge tk-badge-new">
                                New
                              </span>
                            </div>

                            <p className="tk-help-text mt-2 mb-0">
                              Updated{" "}
                              {formatDate(
                                ticket.updatedAt
                              )}
                            </p>

                            <div className="tk-button-row">
                              <button
                                type="button"
                                className="tk-button tk-button-secondary tk-button-sm"
                                onClick={() =>
                                  onOpenTicket(
                                    ticket.id
                                  )
                                }
                              >
                                View Ticket
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="tk-card mt-3">
              <div className="tk-card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div className="tk-help-text">
                    Page {page}
                    {totalPages > 0
                      ? ` of ${totalPages}`
                      : ""}
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <label
                      htmlFor="page-size"
                      className="tk-label mb-0"
                    >
                      Per page
                    </label>

                    <select
                      id="page-size"
                      className="tk-select"
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(
                          Number(
                            event.target
                              .value
                          ) as
                            | 10
                            | 20
                            | 50
                        );

                        setPage(1);
                      }}
                    >
                      <option value="10">
                        10
                      </option>

                      <option value="20">
                        20
                      </option>

                      <option value="50">
                        50
                      </option>
                    </select>
                  </div>

                  <div className="tk-button-row m-0">
                    <button
                      type="button"
                      className="tk-button tk-button-secondary"
                      disabled={
                        page <= 1
                      }
                      onClick={() =>
                        setPage(
                          (current) =>
                            Math.max(
                              1,
                              current -
                                1
                            )
                        )
                      }
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="tk-button tk-button-secondary"
                      disabled={
                        totalPages ===
                          0 ||
                        page >=
                          totalPages
                      }
                      onClick={() =>
                        setPage(
                          (current) =>
                            current +
                            1
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
    </main>
  );
}

// ============================================================
// Main App
// ============================================================

export default function App() {
  const [requesters, setRequesters] =
    useState<
      DevelopmentRequester[]
    >([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState("");

  const [
    currentRequester,
    setCurrentRequester,
  ] =
    useState<DevelopmentRequester | null>(
      null
    );

  const [
    viewState,
    setViewState,
  ] =
    useState<RequesterViewState>(
      "loading"
    );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    activeScreen,
    setActiveScreen,
  ] =
    useState<AppScreen>("create");

  const [
    selectedTicketId,
    setSelectedTicketId,
  ] = useState<number | null>(
    null
  );

  const loadRequesters =
    useCallback(async () => {
      setViewState("loading");
      setErrorMessage("");

      try {
        const loaded =
          await getDevelopmentRequesters();

        setRequesters(loaded);

        if (
          loaded.length === 0
        ) {
          setCurrentRequester(null);
          setSelectedId("");
          setViewState("empty");
          return;
        }

        const storedId =
          sessionStorage.getItem(
            REQUESTER_STORAGE_KEY
          );

        if (storedId) {
          const storedRequester =
            loaded.find(
              (requester) =>
                requester.id ===
                Number(storedId)
            );

          if (storedRequester) {
            setSelectedId(
              String(
                storedRequester.id
              )
            );

            setCurrentRequester(
              storedRequester
            );
          } else {
            sessionStorage.removeItem(
              REQUESTER_STORAGE_KEY
            );

            setSelectedId("");
            setCurrentRequester(
              null
            );
          }
        }

        setViewState("ready");
      } catch (error) {
        setCurrentRequester(null);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load Development Requesters."
        );

        setViewState("error");
      }
    }, []);

  useEffect(() => {
    void loadRequesters();
  }, [loadRequesters]);

  function handleContinue() {
    const requester =
      requesters.find(
        (item) =>
          item.id ===
          Number(selectedId)
      );

    if (!requester) {
      return;
    }

    sessionStorage.setItem(
      REQUESTER_STORAGE_KEY,
      String(requester.id)
    );

    setCurrentRequester(
      requester
    );

    setSelectedTicketId(null);
    setActiveScreen("create");
  }

  function handleChangeRequester() {
    sessionStorage.removeItem(
      REQUESTER_STORAGE_KEY
    );

    setSelectedId("");
    setCurrentRequester(null);
    setSelectedTicketId(null);
    setActiveScreen("create");
  }

  if (currentRequester) {
    return (
      <div className="tk-app">
        <header className="tk-header">
          <div className="tk-header-inner">
            <span className="tk-brand">
              TokTickIT
            </span>

            <div className="tk-header-actions">
              <span className="tk-requester-display">
                Requester:{" "}
                <strong>
                  {
                    currentRequester.name
                  }
                </strong>
              </span>

              <button
                type="button"
                className="tk-button tk-button-secondary tk-button-sm"
                onClick={
                  handleChangeRequester
                }
              >
                Change Requester
              </button>
            </div>
          </div>
        </header>

        <nav
          className="tk-nav"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className={`tk-nav-link ${
              activeScreen ===
                "myTickets" ||
              activeScreen ===
                "ticketDetail"
                ? "active"
                : ""
            }`}
            aria-current={
              activeScreen ===
                "myTickets" ||
              activeScreen ===
                "ticketDetail"
                ? "page"
                : undefined
            }
            onClick={() => {
              setSelectedTicketId(
                null
              );

              setActiveScreen(
                "myTickets"
              );
            }}
          >
            My Tickets
          </button>

          <button
            type="button"
            className={`tk-nav-link ${
              activeScreen ===
              "create"
                ? "active"
                : ""
            }`}
            aria-current={
              activeScreen ===
              "create"
                ? "page"
                : undefined
            }
            onClick={() => {
              setSelectedTicketId(
                null
              );

              setActiveScreen(
                "create"
              );
            }}
          >
            Create Ticket
          </button>
        </nav>

        {activeScreen ===
          "create" && (
          <CreateTicketScreen
            requester={
              currentRequester
            }
          />
        )}

        {activeScreen ===
          "myTickets" && (
          <MyTicketsScreen
            requester={
              currentRequester
            }
            onOpenTicket={(
              ticketId
            ) => {
              setSelectedTicketId(
                ticketId
              );

              setActiveScreen(
                "ticketDetail"
              );
            }}
          />
        )}

        {activeScreen ===
          "ticketDetail" &&
          selectedTicketId !==
            null && (
            <RequesterTicketDetail
              requester={
                currentRequester
              }
              ticketId={
                selectedTicketId
              }
              onBack={() => {
                setSelectedTicketId(
                  null
                );

                setActiveScreen(
                  "myTickets"
                );
              }}
            />
          )}
      </div>
    );
  }

  return (
    <div className="tk-app">
      <header className="tk-header">
        <div className="tk-header-inner">
          <span className="tk-brand">
            TokTickIT
          </span>
        </div>
      </header>

      <main className="tk-page tk-page-narrow">
        <section className="tk-card tk-requester-card">
          <div className="tk-card-body">
            <div className="tk-requester-intro">
              <h1 className="tk-card-title">
                Select Development
                Requester
              </h1>

              <p className="tk-page-description">
                Select a Development
                Requester to test
                requester-specific
                ticket behavior.
              </p>

              <p className="tk-page-description">
                This is not a login
                screen. Authentication
                and role-based access
                will be introduced in
                Lab 3.
              </p>
            </div>

            {viewState ===
              "loading" && (
              <div
                className="tk-state"
                role="status"
              >
                <span
                  className="tk-spinner"
                  aria-hidden="true"
                />
                Loading Development
                Requesters...
              </div>
            )}

            {viewState ===
              "error" && (
              <div className="tk-alert tk-alert-error">
                <div>
                  {errorMessage}
                </div>

                <div className="tk-button-row">
                  <button
                    type="button"
                    className="tk-button tk-button-secondary"
                    onClick={() =>
                      void loadRequesters()
                    }
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {viewState ===
              "empty" && (
              <div
                className="tk-alert tk-alert-warning"
                role="status"
              >
                No active Development
                Requesters are
                available.
              </div>
            )}

            {viewState ===
              "ready" && (
              <>
                <div className="tk-form-group">
                  <label
                    htmlFor="development-requester"
                    className="tk-label"
                  >
                    Development
                    Requester{" "}
                    <span
                      className="tk-required"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </label>

                  <select
                    id="development-requester"
                    className="tk-select"
                    value={selectedId}
                    onChange={(event) =>
                      setSelectedId(
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="">
                      Select a requester
                    </option>

                    {requesters.map(
                      (requester) => (
                        <option
                          key={
                            requester.id
                          }
                          value={
                            requester.id
                          }
                        >
                          {
                            requester.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  <p className="tk-help-text">
                    Only active
                    Development
                    Requesters are
                    shown.
                  </p>
                </div>

                <div className="tk-button-row">
                  <button
                    type="button"
                    className="tk-button tk-button-primary"
                    disabled={
                      !selectedId
                    }
                    onClick={
                      handleContinue
                    }
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}