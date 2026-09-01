import { useEffect, useState } from "react";
import {
  DevelopmentRequester,
  getDevelopmentRequesters,
} from "./api";

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
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#F5F7F6",
        }}
      >
        <header
          style={{
            backgroundColor: "#006B3C",
            color: "white",
            padding: "14px 24px",
          }}
        >
          <div
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <strong style={{ fontSize: "20px" }}>TokTickIT</strong>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <span>
                Requester: <strong>{currentRequester.name}</strong>
              </span>

              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={handleChangeRequester}
              >
                Change Requester
              </button>
            </div>
          </div>
        </header>

        <main
          className="container py-5"
          style={{
            maxWidth: "900px",
          }}
        >
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h1 className="h4 mb-3">Development Requester Selected</h1>

              <p className="mb-1">
                Current Requester:
                <strong> {currentRequester.name}</strong>
              </p>

              <p className="text-muted mb-0">
                {currentRequester.email}
              </p>

              <div
                className="alert mt-4 mb-0"
                style={{
                  backgroundColor: "#EAF6EF",
                  borderColor: "#0B7A46",
                  color: "#18352A",
                }}
              >
                Requester context is ready. Ticket functionality will be
                added in the next Lab 2 features.
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F5F7F6",
      }}
    >
      <header
        style={{
          backgroundColor: "#006B3C",
          color: "white",
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          <strong style={{ fontSize: "20px" }}>TokTickIT</strong>
        </div>
      </header>

      <main
        className="container py-5"
        style={{
          maxWidth: "700px",
        }}
      >
        <div className="card shadow-sm">
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <h1 className="h3">Select Development Requester</h1>

              <p className="text-muted mb-0">
                Select a Development Requester to test
                requester-specific ticket behavior.
              </p>

              <p className="text-muted">
                This is not a login screen. Authentication and
                role-based access will be introduced in Lab 3.
              </p>
            </div>

            {viewState === "loading" && (
              <div
                className="alert alert-secondary"
                role="status"
              >
                Loading Development Requesters…
              </div>
            )}

            {viewState === "error" && (
              <div className="alert alert-danger" role="alert">
                <p className="mb-3">
                  {errorMessage ||
                    "Development Requesters could not be loaded."}
                </p>

                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => void loadRequesters()}
                >
                  Retry
                </button>
              </div>
            )}

            {viewState === "empty" && (
              <div className="alert alert-warning" role="alert">
                No active Development Requesters are available.
              </div>
            )}

            {(viewState === "ready" ||
              viewState === "loading" ||
              viewState === "empty") && (
              <div>
                <label
                  htmlFor="development-requester"
                  className="form-label fw-semibold"
                >
                  Development Requester{" "}
                  <span className="text-danger">*</span>
                </label>

                <select
                  id="development-requester"
                  className="form-select"
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

                <div
                  className="mt-3 p-3 rounded"
                  style={{
                    backgroundColor: "#EAF6EF",
                    color: "#18352A",
                  }}
                >
                  Only active Development Requesters are shown.
                </div>

                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="btn"
                    style={{
                      backgroundColor: "#006B3C",
                      color: "white",
                    }}
                    onClick={handleContinue}
                    disabled={
                      viewState !== "ready" || selectedId === ""
                    }
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}