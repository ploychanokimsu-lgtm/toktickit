import { formatDateTime } from "./format.js";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  addRequesterComment,
  getRequesterComments,
  indicateProblemResolved,
  type RequesterPublicComment,
} from "./requester-completion-api.js";

interface RequesterCompletionPanelProps {
  ticketId: number;
  initialResolutionIndicatedAt:
    string | null;
  onResolutionRecorded: (
    recordedAt: string
  ) => void;
}

function formatDate(
  value: string
): string {
  return formatDateTime(value);
}

function roleLabel(
  role: RequesterPublicComment[
    "author"
  ]["role"]
): string {
  if (role === "IT_STAFF") {
    return "IT Staff";
  }

  if (role === "ADMINISTRATOR") {
    return "Administrator";
  }

  return "Requester";
}

export default function RequesterCompletionPanel({
  ticketId,
  initialResolutionIndicatedAt,
  onResolutionRecorded,
}: RequesterCompletionPanelProps) {
  const [comments, setComments] =
    useState<
      RequesterPublicComment[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [content, setContent] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [commentError, setCommentError] =
    useState("");

  const [commentNotice, setCommentNotice] =
    useState("");

  const [
    resolutionIndicatedAt,
    setResolutionIndicatedAt,
  ] = useState<string | null>(
    initialResolutionIndicatedAt
  );

  const [
    recordingResolution,
    setRecordingResolution,
  ] = useState(false);

  const [
    resolutionError,
    setResolutionError,
  ] = useState("");

  const loadComments =
    useCallback(async () => {
      setLoading(true);
      setLoadError("");

      try {
        setComments(
          await getRequesterComments(
            ticketId
          )
        );
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load Public Comments."
        );
      } finally {
        setLoading(false);
      }
    }, [ticketId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function handleCommentSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    const trimmed =
      content.trim();

    setCommentError("");
    setCommentNotice("");

    if (!trimmed) {
      setCommentError(
        "Comment content is required."
      );
      return;
    }

    if (trimmed.length > 2000) {
      setCommentError(
        "Comment content must not exceed 2000 characters."
      );
      return;
    }

    setSubmitting(true);

    try {
      const comment =
        await addRequesterComment(
          ticketId,
          trimmed
        );

      setComments((current) => [
        ...current,
        comment,
      ]);

      setContent("");

      setCommentNotice(
        "Public Comment added successfully."
      );
    } catch (error) {
      setCommentError(
        error instanceof Error
          ? error.message
          : "The Public Comment could not be added."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolution() {
    setResolutionError("");
    setRecordingResolution(true);

    try {
      const recordedAt =
        await indicateProblemResolved(
          ticketId
        );

      setResolutionIndicatedAt(
        recordedAt
      );

      onResolutionRecorded(
        recordedAt
      );
    } catch (error) {
      setResolutionError(
        error instanceof Error
          ? error.message
          : "The resolution indication could not be recorded."
      );
    } finally {
      setRecordingResolution(false);
    }
  }

  return (
    <>
      <section className="tk-card mt-3">
        <div className="tk-card-body">
          <h2 className="tk-card-title">
            Public Comments
          </h2>

          <p className="tk-help-text">
            Comments are visible to you
            and the IT team. Comments
            cannot be edited or deleted.
          </p>

          {loading && (
            <div
              className="tk-state"
              role="status"
            >
              Loading Public Comments...
            </div>
          )}

          {loadError && (
            <div
              className="tk-alert tk-alert-error"
              role="alert"
            >
              <div>{loadError}</div>

              <div className="tk-button-row">
                <button
                  type="button"
                  className="tk-button tk-button-secondary"
                  onClick={() =>
                    void loadComments()
                  }
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading &&
            !loadError &&
            comments.length === 0 && (
            <div className="tk-alert tk-alert-info">
              No Public Comments yet.
            </div>
          )}

          {!loading &&
            !loadError &&
            comments.length > 0 && (
            <div className="d-grid gap-3">
              {comments.map(
                (comment) => (
                  <article
                    key={comment.id}
                    className="tk-readonly"
                  >
                    <div className="d-flex flex-wrap justify-content-between gap-2">
                      <strong>
                        {
                          comment.author
                            .name
                        }
                      </strong>

                      <span className="tk-help-text">
                        {formatDate(
                          comment.createdAt
                        )}
                      </span>
                    </div>

                    <div className="tk-help-text">
                      {roleLabel(
                        comment.author
                          .role
                      )}
                    </div>

                    <p className="mb-0 mt-2">
                      {comment.content}
                    </p>
                  </article>
                )
              )}
            </div>
          )}

          <form
            className="mt-4"
            onSubmit={
              handleCommentSubmit
            }
          >
            <div className="tk-form-group">
              <label
                htmlFor="requester-comment"
                className="tk-label"
              >
                Add Public Comment
              </label>

              <textarea
                id="requester-comment"
                className="tk-textarea"
                value={content}
                maxLength={2000}
                disabled={submitting}
                onChange={(event) => {
                  setContent(
                    event.target.value
                  );

                  setCommentError("");
                  setCommentNotice("");
                }}
              />

              <p className="tk-help-text">
                {content.length}/2000
              </p>
            </div>

            {commentError && (
              <div
                className="tk-alert tk-alert-error"
                role="alert"
              >
                {commentError}
              </div>
            )}

            {commentNotice && (
              <div
                className="tk-alert tk-alert-success"
                role="status"
              >
                {commentNotice}
              </div>
            )}

            <div className="tk-button-row">
              <button
                type="submit"
                className="tk-button tk-button-primary"
                disabled={
                  submitting ||
                  !content.trim()
                }
              >
                {submitting
                  ? "Adding..."
                  : "Add Public Comment"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="tk-card mt-3">
        <div className="tk-card-body">
          <h2 className="tk-card-title">
            Problem Appears Resolved
          </h2>

          <p className="tk-page-description">
            Let the IT team know that
            the problem appears to be
            resolved. This does not
            directly close the Ticket.
          </p>

          {resolutionIndicatedAt ? (
            <div
              className="tk-alert tk-alert-success"
              role="status"
            >
              Resolution indication
              recorded{" "}
              {formatDate(
                resolutionIndicatedAt
              )}.
            </div>
          ) : (
            <>
              {resolutionError && (
                <div
                  className="tk-alert tk-alert-error"
                  role="alert"
                >
                  {resolutionError}
                </div>
              )}

              <div className="tk-button-row">
                <button
                  type="button"
                  className="tk-button tk-button-primary"
                  disabled={
                    recordingResolution
                  }
                  onClick={() =>
                    void handleResolution()
                  }
                >
                  {recordingResolution
                    ? "Recording..."
                    : "Problem Appears Resolved"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
