import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createTicket,
  getCategories,
  getDevelopmentRequesters,
  getRelatedSystems,
  type Category,
  type CreatedTicket,
  type DevelopmentRequester,
  type RelatedSystem,
  type RequestedPriority,
} from "./api.js";

const REQUESTER_STORAGE_KEY = "developmentRequesterId";

type RequesterViewState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

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

// ------------------------------------------------------------
// Create Ticket Screen
// ------------------------------------------------------------

function CreateTicketScreen({
  requester,
}: {
  requester: DevelopmentRequester;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<
    RelatedSystem[]
  >([]);

  const [referenceLoading, setReferenceLoading] =
    useState(true);

  const [referenceError, setReferenceError] =
    useState("");

  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] =
    useState("");

  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");

  const [requestedPriority, setRequestedPriority] =
    useState<RequestedPriority>("MEDIUM");

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [createdTicket, setCreatedTicket] =
    useState<CreatedTicket | null>(null);

  const submissionIdRef = useRef(createSubmissionId());

  const loadReferenceData = useCallback(async () => {
    setReferenceLoading(true);
    setReferenceError("");

    try {
      const [loadedCategories, loadedRelatedSystems] =
        await Promise.all([
          getCategories(),
          getRelatedSystems(),
        ]);

      setCategories(loadedCategories);
      setRelatedSystems(loadedRelatedSystems);
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
      nextErrors.categoryId = "Category is required.";
    }

    if (!relatedSystemId) {
      nextErrors.relatedSystemId =
        "Related System is required.";
    }

    const trimmedSummary = summary.trim();

    if (trimmedSummary.length < 5) {
      nextErrors.summary =
        "Ticket Summary must contain at least 5 characters.";
    } else if (trimmedSummary.length > 150) {
      nextErrors.summary =
        "Ticket Summary must not exceed 150 characters.";
    }

    const trimmedDescription = description.trim();

    if (trimmedDescription.length < 10) {
      nextErrors.description =
        "Description must contain at least 10 characters.";
    } else if (trimmedDescription.length > 5000) {
      nextErrors.description =
        "Description must not exceed 5000 characters.";
    }

    return nextErrors;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const nextErrors = validateForm();

    setErrors(nextErrors);
    setSubmitError("");
    setCreatedTicket(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const ticket = await createTicket({
        clientSubmissionId: submissionIdRef.current,
        requesterId: requester.id,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        summary: summary.trim(),
        requestedPriority,
        description: description.trim(),
      });

      setCreatedTicket(ticket);

      // The next new submission must use a different identifier.
      submissionIdRef.current = createSubmissionId();
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
    ? new Date(createdTicket.createdAt).toLocaleString()
    : "Generated when submitted";

  return (
    <main className="tk-page tk-page-medium">
      <div className="tk-page-header">
        <div>
          <h1 className="tk-page-title">Create Ticket</h1>

          <p className="tk-page-description">
            Submit a new IT support request.
          </p>
        </div>
      </div>

      {createdTicket && (
        <div
          className="tk-alert tk-alert-success"
          role="status"
        >
          <strong>Ticket created successfully.</strong>
          <div>
            Official Ticket Number:{" "}
            <strong>{createdTicket.ticketNumber}</strong>
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
          <div>{referenceError}</div>

          <div className="tk-button-row">
            <button
              type="button"
              className="tk-button tk-button-secondary"
              onClick={() => void loadReferenceData()}
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

          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="tk-form-group">
                  <label className="tk-label">
                    Ticket Number
                  </label>

                  <div className="tk-readonly">
                    {createdTicket?.ticketNumber ??
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
                    <strong>{requester.name}</strong>
                    {" — "}
                    {requester.email}
                  </div>

                  <p className="tk-help-text">
                    Populated from the selected Development
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
                      setCategoryId(event.target.value);

                      if (errors.categoryId) {
                        setErrors((current) => ({
                          ...current,
                          categoryId: undefined,
                        }));
                      }
                    }}
                    disabled={
                      referenceLoading ||
                      Boolean(referenceError) ||
                      submitting
                    }
                    aria-invalid={
                      Boolean(errors.categoryId)
                    }
                  >
                    <option value="">
                      Select a category
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {errors.categoryId && (
                    <div className="tk-field-error">
                      {errors.categoryId}
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
                    value={relatedSystemId}
                    onChange={(event) => {
                      setRelatedSystemId(
                        event.target.value
                      );

                      if (errors.relatedSystemId) {
                        setErrors((current) => ({
                          ...current,
                          relatedSystemId: undefined,
                        }));
                      }
                    }}
                    disabled={
                      referenceLoading ||
                      Boolean(referenceError) ||
                      submitting
                    }
                    aria-invalid={
                      Boolean(errors.relatedSystemId)
                    }
                  >
                    <option value="">
                      Select a related system
                    </option>

                    {relatedSystems.map((system) => (
                      <option
                        key={system.id}
                        value={system.id}
                      >
                        {system.name}
                      </option>
                    ))}
                  </select>

                  {errors.relatedSystemId && (
                    <div className="tk-field-error">
                      {errors.relatedSystemId}
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
                    aria-invalid={Boolean(errors.summary)}
                    onChange={(event) => {
                      setSummary(event.target.value);

                      if (errors.summary) {
                        setErrors((current) => ({
                          ...current,
                          summary: undefined,
                        }));
                      }
                    }}
                  />

                  <p className="tk-help-text">
                    5–150 characters.
                  </p>

                  {errors.summary && (
                    <div className="tk-field-error">
                      {errors.summary}
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
                    value={requestedPriority}
                    disabled={submitting}
                    onChange={(event) =>
                      setRequestedPriority(
                        event.target
                          .value as RequestedPriority
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
                    aria-invalid={
                      Boolean(errors.description)
                    }
                    onChange={(event) => {
                      setDescription(event.target.value);

                      if (errors.description) {
                        setErrors((current) => ({
                          ...current,
                          description: undefined,
                        }));
                      }
                    }}
                  />

                  <p className="tk-help-text">
                    10–5000 characters.
                  </p>

                  {errors.description && (
                    <div className="tk-field-error">
                      {errors.description}
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
                Loading Ticket reference data...
              </div>
            )}

            <div className="tk-button-row">
              <button
                type="submit"
                className="tk-button tk-button-primary"
                disabled={
                  submitting ||
                  referenceLoading ||
                  Boolean(referenceError)
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

// ------------------------------------------------------------
// Main App
// ------------------------------------------------------------

export default function App() {
  const [requesters, setRequesters] = useState<
    DevelopmentRequester[]
  >([]);

  const [selectedId, setSelectedId] = useState("");

  const [currentRequester, setCurrentRequester] =
    useState<DevelopmentRequester | null>(null);

  const [viewState, setViewState] =
    useState<RequesterViewState>("loading");

  const [errorMessage, setErrorMessage] = useState("");

  const loadRequesters = useCallback(async () => {
    setViewState("loading");
    setErrorMessage("");

    try {
      const loadedRequesters =
        await getDevelopmentRequesters();

      setRequesters(loadedRequesters);

      if (loadedRequesters.length === 0) {
        setCurrentRequester(null);
        setSelectedId("");
        setViewState("empty");
        return;
      }

      const storedRequesterId = sessionStorage.getItem(
        REQUESTER_STORAGE_KEY
      );

      if (storedRequesterId) {
        const storedRequester = loadedRequesters.find(
          (requester) =>
            requester.id ===
            Number(storedRequesterId)
        );

        if (storedRequester) {
          setSelectedId(String(storedRequester.id));
          setCurrentRequester(storedRequester);
        } else {
          sessionStorage.removeItem(
            REQUESTER_STORAGE_KEY
          );

          setSelectedId("");
          setCurrentRequester(null);
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
    const requester = requesters.find(
      (item) => item.id === Number(selectedId)
    );

    if (!requester) {
      return;
    }

    sessionStorage.setItem(
      REQUESTER_STORAGE_KEY,
      String(requester.id)
    );

    setCurrentRequester(requester);
  }

  function handleChangeRequester() {
    sessionStorage.removeItem(
      REQUESTER_STORAGE_KEY
    );

    setSelectedId("");
    setCurrentRequester(null);
  }

  if (currentRequester) {
    return (
      <div className="tk-app">
        <header className="tk-header">
          <div className="tk-header-inner">
            <span className="tk-brand">TokTickIT</span>

            <div className="tk-header-actions">
              <span className="tk-requester-display">
                Requester:{" "}
                <strong>
                  {currentRequester.name}
                </strong>
              </span>

              <button
                type="button"
                className="tk-button tk-button-secondary tk-button-sm"
                onClick={handleChangeRequester}
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
          <span
            className="tk-nav-link"
            aria-disabled="true"
          >
            My Tickets
          </span>

          <span
            className="tk-nav-link active"
            aria-current="page"
          >
            Create Ticket
          </span>
        </nav>

        <CreateTicketScreen
          requester={currentRequester}
        />
      </div>
    );
  }

  return (
    <div className="tk-app">
      <header className="tk-header">
        <div className="tk-header-inner">
          <span className="tk-brand">TokTickIT</span>
        </div>
      </header>

      <main className="tk-page tk-page-narrow">
        <section className="tk-card tk-requester-card">
          <div className="tk-card-body">
            <div className="tk-requester-intro">
              <h1 className="tk-card-title">
                Select Development Requester
              </h1>

              <p className="tk-page-description">
                Select a Development Requester to test
                requester-specific ticket behavior.
              </p>

              <p className="tk-page-description">
                This is not a login screen.
                Authentication and role-based access will
                be introduced in Lab 3.
              </p>
            </div>

            {viewState === "loading" && (
              <div
                className="tk-state"
                role="status"
              >
                <span
                  className="tk-spinner"
                  aria-hidden="true"
                />
                Loading Development Requesters...
              </div>
            )}

            {viewState === "error" && (
              <div className="tk-alert tk-alert-error">
                <div>{errorMessage}</div>

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

            {viewState === "empty" && (
              <div
                className="tk-alert tk-alert-warning"
                role="status"
              >
                No active Development Requesters are
                available.
              </div>
            )}

            {viewState === "ready" && (
              <>
                <div className="tk-form-group">
                  <label
                    htmlFor="development-requester"
                    className="tk-label"
                  >
                    Development Requester{" "}
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
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Select a requester
                    </option>

                    {requesters.map((requester) => (
                      <option
                        key={requester.id}
                        value={requester.id}
                      >
                        {requester.name}
                      </option>
                    ))}
                  </select>

                  <p className="tk-help-text">
                    Only active Development Requesters are
                    shown.
                  </p>
                </div>

                <div className="tk-button-row">
                  <button
                    type="button"
                    className="tk-button tk-button-primary"
                    disabled={!selectedId}
                    onClick={handleContinue}
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