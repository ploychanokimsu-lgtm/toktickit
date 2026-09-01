import { useEffect, useState } from "react";

import {
  type DevelopmentRequester,
  getDevelopmentRequesters,
} from "./api.js";

const REQUESTER_STORAGE_KEY = "developmentRequesterId";

type ViewState = "loading" | "ready" | "empty" | "error";

export default function App() {
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const [currentRequester, setCurrentRequester] =
    useState<DevelopmentRequester | null>(null);

  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadRequesters() {
    setViewState("loading");
    setErrorMessage("");

    try {
      const result = await getDevelopmentRequesters();

      setRequesters(result);

      if (result.length === 0) {
        setViewState("empty");
        return;
      }

      const storedRequesterId = sessionStorage.getItem(
        REQUESTER_STORAGE_KEY
      );

      if (storedRequesterId) {
        const storedRequester = result.find(
          (requester) => requester.id === Number(storedRequesterId)
        );

        if (storedRequester) {
          setCurrentRequester(storedRequester);
          setSelectedId(String(storedRequester.id));
        } else {
          sessionStorage.removeItem(REQUESTER_STORAGE_KEY);
        }
      }

      setViewState("ready");
    } catch (error) {
      setRequesters([]);
      setViewState("error");

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load Development Requesters.");
      }
    }
  }

  useEffect(() => {
    void loadRequesters();
  }, []);

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
    sessionStorage.removeItem(REQUESTER_STORAGE_KEY);

    setCurrentRequester(null);
    setSelectedId("");
  }

  if (currentRequester) {
    return (
      <div className="tk-app">
        <header className="tk-header">
          <div className="tk-header-inner">
            <span className="tk-brand">TokTickIT</span>

            <div className="tk-header-actions">
              <span className="tk-requester-display">
                Requester: <strong>{currentRequester.name}</strong>
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

        <main className="tk-page tk-page-medium">
          <section className="tk-card">
            <div className="tk-card-body">
              <div className="tk-page-header">
                <h1 className="tk-card-title">
                  Development Requester Selected
                </h1>

                <p className="tk-page-description">
                  Requester-specific testing context is active.
                </p>
              </div>

              <div className="tk-readonly">
                <strong>Current Requester:</strong>{" "}
                {currentRequester.name}
              </div>

              <p className="tk-help-text">
                {currentRequester.email}
              </p>

              <div
                className="tk-alert tk-alert-success tk-context-note"
                role="status"
              >
                Requester context is ready. Ticket functionality will be
                added in the next Lab 2 features.
              </div>
            </div>
          </section>
        </main>
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
              <h1 className="tk-page-title">
                Select Development Requester
              </h1>

              <p>
                Select a Development Requester to test requester-specific
                ticket behavior.
              </p>

              <p>
                This is not a login screen. Authentication and role-based
                access will be introduced in Lab 3.
              </p>
            </div>

            {viewState === "loading" && (
              <div className="tk-state" role="status">
                <div
                  className="tk-spinner"
                  aria-hidden="true"
                />

                <div className="tk-state-title">
                  Loading Development Requesters…
                </div>

                <p className="tk-state-text">
                  Please wait while active Requesters are retrieved.
                </p>
              </div>
            )}

            {viewState === "error" && (
              <div className="tk-alert tk-alert-error" role="alert">
                <p>
                  {errorMessage ||
                    "Development Requesters could not be loaded."}
                </p>

                <button
                  type="button"
                  className="tk-button tk-button-secondary"
                  onClick={() => void loadRequesters()}
                >
                  Retry
                </button>
              </div>
            )}

            {viewState === "empty" && (
              <div className="tk-alert tk-alert-warning" role="alert">
                No active Development Requesters are available.
              </div>
            )}

            {viewState !== "error" && (
              <>
                <div className="tk-form-group">
                  <label
                    htmlFor="development-requester"
                    className="tk-label"
                  >
                    Development Requester{" "}
                    <span className="tk-required">*</span>
                  </label>

                  <select
                    id="development-requester"
                    className="tk-select"
                    value={selectedId}
                    onChange={(event) =>
                      setSelectedId(event.target.value)
                    }
                    disabled={viewState !== "ready"}
                  >
                    <option value="">Select a requester</option>

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
                    Only active Development Requesters are shown.
                  </p>
                </div>

                <div className="tk-button-row">
                  <button
                    type="button"
                    className="tk-button tk-button-primary"
                    onClick={handleContinue}
                    disabled={
                      viewState !== "ready" || selectedId === ""
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