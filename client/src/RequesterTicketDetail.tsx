import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  downloadAttachment,
  getTicketDetail,
  removeAttachment,
  uploadAttachment,
  type DevelopmentRequester,
  type TicketAttachmentMetadata,
  type TicketDetail,
} from "./api.js";

interface RequesterTicketDetailProps {
  requester: DevelopmentRequester;
  ticketId: number;
  onBack: () => void;
}

const MAX_ATTACHMENT_BYTES =
  5 * 1024 * 1024;

const MAX_ACTIVE_ATTACHMENTS = 5;

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
];

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function formatDate(
  value: string
): string {
  return new Date(
    value
  ).toLocaleString();
}

function formatFileSize(
  bytes: number
): string {
  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
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

function fileExtension(
  filename: string
): string {
  const index =
    filename.lastIndexOf(".");

  if (index < 0) {
    return "";
  }

  return filename
    .slice(index)
    .toLowerCase();
}

function validateFile(
  file: File
): string | null {
  const extension =
    fileExtension(file.name);

  if (
    !ALLOWED_EXTENSIONS.includes(
      extension
    ) ||
    !ALLOWED_MIME_TYPES.includes(
      file.type
    )
  ) {
    return "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.";
  }

  if (
    file.size >
    MAX_ATTACHMENT_BYTES
  ) {
    return "Attachment size must not exceed 5 MB.";
  }

  return null;
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

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    fileInputKey,
    setFileInputKey,
  ] = useState(0);

  const [
    uploadError,
    setUploadError,
  ] = useState("");

  const [
    uploadSuccess,
    setUploadSuccess,
  ] = useState("");

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    removingAttachmentId,
    setRemovingAttachmentId,
  ] =
    useState<number | null>(
      null
    );

  const [
    removalReason,
    setRemovalReason,
  ] = useState("");

  const [
    removalError,
    setRemovalError,
  ] = useState("");

  const [
    removing,
    setRemoving,
  ] = useState(false);

  const [
    downloadingAttachmentId,
    setDownloadingAttachmentId,
  ] =
    useState<number | null>(
      null
    );

  const [
    downloadError,
    setDownloadError,
  ] = useState("");

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

        setTicket(
          loadedTicket
        );
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

  const activeAttachments =
    useMemo(
      () =>
        ticket?.attachments.filter(
          (attachment) =>
            !attachment.isRemoved
        ) ?? [],
      [ticket]
    );

  const removedAttachments =
    useMemo(
      () =>
        ticket?.attachments.filter(
          (attachment) =>
            attachment.isRemoved
        ) ?? [],
      [ticket]
    );

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    setUploadError("");
    setUploadSuccess("");

    const file =
      event.target.files?.[0] ??
      null;

    setSelectedFile(file);

    if (file) {
      const validation =
        validateFile(file);

      if (validation) {
        setUploadError(
          validation
        );
      }
    }
  }

  async function handleUpload() {
    setUploadError("");
    setUploadSuccess("");

    if (!ticket) {
      return;
    }

    if (!selectedFile) {
      setUploadError(
        "Select a file to upload."
      );

      return;
    }

    if (
      activeAttachments.length >=
      MAX_ACTIVE_ATTACHMENTS
    ) {
      setUploadError(
        "A Ticket may have a maximum of five active Attachments."
      );

      return;
    }

    const validation =
      validateFile(
        selectedFile
      );

    if (validation) {
      setUploadError(
        validation
      );

      return;
    }

    setUploading(true);

    try {
      const uploaded =
        await uploadAttachment(
          requester.id,
          ticket.id,
          selectedFile
        );

      setTicket(
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,

            attachments: [
              ...current.attachments,
              uploaded,
            ],
          };
        }
      );

      setSelectedFile(null);

      setFileInputKey(
        (current) =>
          current + 1
      );

      setUploadSuccess(
        "Attachment uploaded successfully."
      );
    } catch (
      uploadFailure
    ) {
      setUploadError(
        uploadFailure instanceof
          Error
          ? uploadFailure.message
          : "The Attachment could not be uploaded. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  function startRemoval(
    attachment:
      TicketAttachmentMetadata
  ) {
    setRemovingAttachmentId(
      attachment.id
    );

    setRemovalReason("");
    setRemovalError("");
  }

  function cancelRemoval() {
    setRemovingAttachmentId(
      null
    );

    setRemovalReason("");
    setRemovalError("");
  }

  async function confirmRemoval() {
    if (
      removingAttachmentId ===
      null
    ) {
      return;
    }

    const reason =
      removalReason.trim();

    if (
      reason.length < 3
    ) {
      setRemovalError(
        "Removal reason must contain at least 3 characters."
      );

      return;
    }

    if (
      reason.length > 200
    ) {
      setRemovalError(
        "Removal reason must not exceed 200 characters."
      );

      return;
    }

    setRemoving(true);
    setRemovalError("");

    try {
      const removed =
        await removeAttachment(
          requester.id,
          removingAttachmentId,
          reason
        );

      setTicket(
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,

            attachments:
              current.attachments.map(
                (attachment) =>
                  attachment.id ===
                  removed.id
                    ? removed
                    : attachment
              ),
          };
        }
      );

      setRemovingAttachmentId(
        null
      );

      setRemovalReason("");
    } catch (
      removeFailure
    ) {
      setRemovalError(
        removeFailure instanceof
          Error
          ? removeFailure.message
          : "The Attachment could not be removed. Please try again."
      );
    } finally {
      setRemoving(false);
    }
  }

  async function handleDownload(
    attachment:
      TicketAttachmentMetadata
  ) {
    if (
      attachment.isRemoved
    ) {
      return;
    }

    setDownloadError("");

    setDownloadingAttachmentId(
      attachment.id
    );

    try {
      const blob =
        await downloadAttachment(
          requester.id,
          attachment.id
        );

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        objectUrl;

      link.download =
        attachment.originalFilename;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        objectUrl
      );
    } catch (
      downloadFailure
    ) {
      setDownloadError(
        downloadFailure instanceof
          Error
          ? downloadFailure.message
          : "The Attachment could not be downloaded. Please try again."
      );
    } finally {
      setDownloadingAttachmentId(
        null
      );
    }
  }

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
                            ticket
                              .requester
                              .name
                          }
                        </strong>

                        {" — "}

                        {
                          ticket
                            .requester
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
                          ticket
                            .category
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
                          ticket
                            .relatedSystem
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
                        {
                          ticket.summary
                        }
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
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                  <div>
                    <h2 className="tk-card-title">
                      Attachments
                    </h2>

                    <p className="tk-help-text">
                      JPG, JPEG, PNG,
                      WEBP or PDF.
                      Maximum 5 MB per
                      file and 5 active
                      Attachments.
                    </p>
                  </div>

                  <span className="tk-help-text">
                    {
                      activeAttachments.length
                    }
                    /5 active
                  </span>
                </div>

                {uploadError && (
                  <div
                    className="tk-alert tk-alert-error"
                    role="alert"
                  >
                    {
                      uploadError
                    }
                  </div>
                )}

                {uploadSuccess && (
                  <div
                    className="tk-alert tk-alert-success"
                    role="status"
                  >
                    {
                      uploadSuccess
                    }
                  </div>
                )}

                <div className="tk-form-group">
                  <label
                    htmlFor="attachment-file"
                    className="tk-label"
                  >
                    Add Attachment
                  </label>

                  <input
                    key={
                      fileInputKey
                    }
                    id="attachment-file"
                    className="tk-input"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    disabled={
                      uploading ||
                      activeAttachments.length >=
                        MAX_ACTIVE_ATTACHMENTS
                    }
                    onChange={
                      handleFileChange
                    }
                  />

                  {selectedFile && (
                    <p className="tk-help-text">
                      Selected:{" "}
                      {
                        selectedFile.name
                      }{" "}
                      (
                      {formatFileSize(
                        selectedFile.size
                      )}
                      )
                    </p>
                  )}
                </div>

                <div className="tk-button-row">
                  <button
                    type="button"
                    className="tk-button tk-button-primary"
                    disabled={
                      uploading ||
                      !selectedFile ||
                      activeAttachments.length >=
                        MAX_ACTIVE_ATTACHMENTS
                    }
                    onClick={() =>
                      void handleUpload()
                    }
                  >
                    {uploading
                      ? "Uploading..."
                      : "Upload Attachment"}
                  </button>
                </div>

                {activeAttachments.length ===
                0 ? (
                  <div className="tk-alert tk-alert-info">
                    No active
                    Attachments.
                  </div>
                ) : (
                  <div className="d-grid gap-3 mt-3">
                    {activeAttachments.map(
                      (attachment) => (
                        <article
                          key={
                            attachment.id
                          }
                          className="tk-readonly"
                        >
                          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                            <div>
                              <strong>
                                {
                                  attachment.originalFilename
                                }
                              </strong>

                              <div className="tk-help-text">
                                {formatFileSize(
                                  attachment.sizeBytes
                                )}
                                {" · "}
                                {
                                  attachment.mimeType
                                }
                                {" · Uploaded "}
                                {formatDate(
                                  attachment.uploadedAt
                                )}
                              </div>
                            </div>

                            <div className="tk-button-row m-0">
                              <button
                                type="button"
                                className="tk-button tk-button-secondary tk-button-sm"
                                aria-label={`Download ${attachment.originalFilename}`}
                                disabled={
                                  downloadingAttachmentId ===
                                  attachment.id
                                }
                                onClick={() =>
                                  void handleDownload(
                                    attachment
                                  )
                                }
                              >
                                {downloadingAttachmentId ===
                                attachment.id
                                  ? "Downloading..."
                                  : "Download"}
                              </button>

                              <button
                                type="button"
                                className="tk-button tk-button-danger tk-button-sm"
                                aria-label={`Remove ${attachment.originalFilename}`}
                                disabled={
                                  removing
                                }
                                onClick={() =>
                                  startRemoval(
                                    attachment
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {removingAttachmentId ===
                            attachment.id && (
                            <div className="mt-3">
                              <div className="tk-form-group">
                                <label
                                  htmlFor={`removal-reason-${attachment.id}`}
                                  className="tk-label"
                                >
                                  Removal Reason
                                </label>

                                <input
                                  id={`removal-reason-${attachment.id}`}
                                  className="tk-input"
                                  value={
                                    removalReason
                                  }
                                  maxLength={
                                    200
                                  }
                                  disabled={
                                    removing
                                  }
                                  onChange={(
                                    event
                                  ) => {
                                    setRemovalReason(
                                      event
                                        .target
                                        .value
                                    );

                                    setRemovalError(
                                      ""
                                    );
                                  }}
                                  placeholder="Why should this Attachment be removed?"
                                />
                              </div>

                              {removalError && (
                                <div
                                  className="tk-alert tk-alert-error"
                                  role="alert"
                                >
                                  {
                                    removalError
                                  }
                                </div>
                              )}

                              <div className="tk-button-row">
                                <button
                                  type="button"
                                  className="tk-button tk-button-danger"
                                  disabled={
                                    removing
                                  }
                                  onClick={() =>
                                    void confirmRemoval()
                                  }
                                >
                                  {removing
                                    ? "Removing..."
                                    : "Confirm Remove"}
                                </button>

                                <button
                                  type="button"
                                  className="tk-button tk-button-secondary"
                                  disabled={
                                    removing
                                  }
                                  onClick={
                                    cancelRemoval
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      )
                    )}
                  </div>
                )}

                {downloadError && (
                  <div
                    className="tk-alert tk-alert-error mt-3"
                    role="alert"
                  >
                    {
                      downloadError
                    }
                  </div>
                )}

                {removedAttachments.length >
                  0 && (
                  <div className="mt-4">
                    <h3 className="h6">
                      Removed
                      Attachments
                    </h3>

                    <div className="d-grid gap-2">
                      {removedAttachments.map(
                        (attachment) => (
                          <article
                            key={
                              attachment.id
                            }
                            className="tk-readonly"
                          >
                            <div className="d-flex flex-wrap gap-2 align-items-center">
                              <strong>
                                {
                                  attachment.originalFilename
                                }
                              </strong>

                              <span className="tk-badge">
                                Removed
                              </span>
                            </div>

                            <div className="tk-help-text mt-2">
                              Removed{" "}
                              {attachment.removedAt
                                ? formatDate(
                                    attachment.removedAt
                                  )
                                : ""}
                            </div>

                            <div className="tk-help-text">
                              Reason:{" "}
                              {attachment.removalReason ??
                                "Not provided"}
                            </div>
                          </article>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
    </main>
  );
}