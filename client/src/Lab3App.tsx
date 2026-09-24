import StaffTicketDetail from "./StaffTicketDetail.js";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import App from "./App.js";
import StaffTicketQueue from "./StaffTicketQueue.js";

import {
  changeInitialPassword,
  getSessionUser,
  signIn,
  signOut,
  type SessionUser,
} from "./auth-api.js";

function LoadingScreen() {
  return (
    <div className="tk-app">
      <header className="tk-header">
        <div className="tk-header-inner">
          <span className="tk-brand">TokTickIT</span>
        </div>
      </header>

      <main className="tk-page tk-page-narrow">
        <div className="tk-state" role="status">
          <span
            className="tk-spinner"
            aria-hidden="true"
          />
          Checking your session...
        </div>
      </main>
    </div>
  );
}

function LoginScreen({
  notice,
  onSignedIn,
}: {
  notice: string;
  onSignedIn: (user: SessionUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await signIn(
        email.trim(),
        password
      );

      onSignedIn(result.user);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="tk-app">
      <header className="tk-header">
        <div className="tk-header-inner">
          <span className="tk-brand">TokTickIT</span>
        </div>
      </header>

      <main className="tk-page tk-page-narrow">
        <section className="tk-card">
          <div className="tk-card-body">
            <h1 className="tk-card-title">
              Sign in
            </h1>

            <p className="tk-page-description">
              Sign in with your TokTickIT account.
            </p>

            {notice && (
              <div
                className="tk-alert tk-alert-success"
                role="status"
              >
                {notice}
              </div>
            )}

            {error && (
              <div
                className="tk-alert tk-alert-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="tk-form-group">
                <label
                  className="tk-label"
                  htmlFor="login-email"
                >
                  Email
                </label>

                <input
                  id="login-email"
                  className="tk-input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  disabled={submitting}
                  required
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                />
              </div>

              <div className="tk-form-group">
                <label
                  className="tk-label"
                  htmlFor="login-password"
                >
                  Password
                </label>

                <input
                  id="login-password"
                  className="tk-input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  disabled={submitting}
                  required
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                />
              </div>

              <div className="tk-button-row">
                <button
                  type="submit"
                  className="tk-button tk-button-primary"
                  disabled={
                    submitting ||
                    !email.trim() ||
                    !password
                  }
                >
                  {submitting
                    ? "Signing in..."
                    : "Sign in"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

function PasswordChangeScreen({
  user,
  onCompleted,
}: {
  user: SessionUser;
  onCompleted: () => void;
}) {
  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await changeInitialPassword(
        currentPassword,
        newPassword,
        confirmPassword
      );

      onCompleted();
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Unable to change your password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="tk-app">
      <header className="tk-header">
        <div className="tk-header-inner">
          <span className="tk-brand">TokTickIT</span>
        </div>
      </header>

      <main className="tk-page tk-page-narrow">
        <section className="tk-card">
          <div className="tk-card-body">
            <h1 className="tk-card-title">
              Change initial password
            </h1>

            <p className="tk-page-description">
              Welcome, {user.name}. You must change
              your initial password before continuing.
            </p>

            {error && (
              <div
                className="tk-alert tk-alert-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="tk-form-group">
                <label
                  className="tk-label"
                  htmlFor="current-password"
                >
                  Current password
                </label>

                <input
                  id="current-password"
                  className="tk-input"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  disabled={submitting}
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="tk-form-group">
                <label
                  className="tk-label"
                  htmlFor="new-password"
                >
                  New password
                </label>

                <input
                  id="new-password"
                  className="tk-input"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  disabled={submitting}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value
                    )
                  }
                />

                <p className="tk-help-text">
                  Use at least 8 characters with
                  uppercase, lowercase, number and
                  symbol.
                </p>
              </div>

              <div className="tk-form-group">
                <label
                  className="tk-label"
                  htmlFor="confirm-password"
                >
                  Confirm new password
                </label>

                <input
                  id="confirm-password"
                  className="tk-input"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  disabled={submitting}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="tk-button-row">
                <button
                  type="submit"
                  className="tk-button tk-button-primary"
                  disabled={
                    submitting ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  {submitting
                    ? "Changing password..."
                    : "Change password"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

function StaffWorkspace({
  user,
  onLogout,
}: {
  user: SessionUser;
  onLogout: () => Promise<void>;
}) {
  const [selectedTicketId, setSelectedTicketId] =
    useState<number | null>(null);
  const [logoutError, setLogoutError] =
    useState("");

  async function handleLogout() {
    setLogoutError("");

    try {
      await onLogout();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to sign out."
      );
    }
  }

  return (
    <div className="tk-app">
      <header className="tk-header">
        <div className="tk-header-inner">
          <span className="tk-brand">TokTickIT</span>

          <div className="tk-header-actions">
            <span className="tk-requester-display">
              {user.name} ·{" "}
              <strong>
                {user.role === "ADMINISTRATOR"
                  ? "Administrator"
                  : "IT Staff"}
              </strong>
            </span>

            <button
              type="button"
              className="tk-button tk-button-secondary tk-button-sm"
              onClick={() => void handleLogout()}
            >
              Sign out
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
          className="tk-nav-link active"
          aria-current="page"
          onClick={() =>
            setSelectedTicketId(null)
          }
        >
          Staff Ticket Queue
        </button>
      </nav>

      {logoutError && (
        <main className="tk-page">
          <div
            className="tk-alert tk-alert-error"
            role="alert"
          >
            {logoutError}
          </div>
        </main>
      )}

      {selectedTicketId === null ? (
        <StaffTicketQueue
          onOpenTicket={(ticketId) =>
            setSelectedTicketId(ticketId)
          }
        />
      ) : (
        <StaffTicketDetail
          ticketId={selectedTicketId}
          currentUserId={user.id}
          onBack={() =>
            setSelectedTicketId(null)
          }
        />
      )}
    </div>
  );
}

export default function Lab3App() {
  const [checkingSession, setCheckingSession] =
    useState(true);
  const [sessionError, setSessionError] =
    useState("");
  const [user, setUser] =
    useState<SessionUser | null>(null);
  const [notice, setNotice] = useState("");

  const loadSession = useCallback(async () => {
    setCheckingSession(true);
    setSessionError("");

    try {
      setUser(await getSessionUser());
    } catch (error) {
      setSessionError(
        error instanceof Error
          ? error.message
          : "Unable to check your session."
      );
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (checkingSession) {
    return <LoadingScreen />;
  }

  if (sessionError) {
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
          <div
            className="tk-alert tk-alert-error"
            role="alert"
          >
            <div>{sessionError}</div>

            <div className="tk-button-row">
              <button
                type="button"
                className="tk-button tk-button-secondary"
                onClick={() =>
                  void loadSession()
                }
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        notice={notice}
        onSignedIn={(signedInUser) => {
          setNotice("");
          setUser(signedInUser);
        }}
      />
    );
  }

  if (user.mustChangePassword) {
    return (
      <PasswordChangeScreen
        user={user}
        onCompleted={() => {
          setUser(null);
          setNotice(
            "Password changed successfully. Sign in with your new password."
          );
        }}
      />
    );
  }

  if (
    user.role === "IT_STAFF" ||
    user.role === "ADMINISTRATOR"
  ) {
    return (
      <StaffWorkspace
        user={user}
        onLogout={async () => {
          await signOut();
          setUser(null);
          setNotice(
            "You have signed out successfully."
          );
        }}
      />
    );
  }

  return <App />;
}
