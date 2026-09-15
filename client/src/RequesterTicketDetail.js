import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState, } from "react";
import { downloadAttachment, getTicketDetail, removeAttachment, uploadAttachment, } from "./api.js";
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
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
function formatDate(value) {
    return new Date(value).toLocaleString();
}
function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes /
        (1024 * 1024)).toFixed(2)} MB`;
}
function priorityClass(priority) {
    if (priority === "HIGH") {
        return "tk-badge-high";
    }
    if (priority === "LOW") {
        return "tk-badge-low";
    }
    return "tk-badge-medium";
}
function fileExtension(filename) {
    const index = filename.lastIndexOf(".");
    if (index < 0) {
        return "";
    }
    return filename
        .slice(index)
        .toLowerCase();
}
function validateFile(file) {
    const extension = fileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(extension) ||
        !ALLOWED_MIME_TYPES.includes(file.type)) {
        return "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.";
    }
    if (file.size >
        MAX_ATTACHMENT_BYTES) {
        return "Attachment size must not exceed 5 MB.";
    }
    return null;
}
export default function RequesterTicketDetail({ requester, ticketId, onBack, }) {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedFile, setSelectedFile,] = useState(null);
    const [fileInputKey, setFileInputKey,] = useState(0);
    const [uploadError, setUploadError,] = useState("");
    const [uploadSuccess, setUploadSuccess,] = useState("");
    const [uploading, setUploading,] = useState(false);
    const [removingAttachmentId, setRemovingAttachmentId,] = useState(null);
    const [removalReason, setRemovalReason,] = useState("");
    const [removalError, setRemovalError,] = useState("");
    const [removing, setRemoving,] = useState(false);
    const [downloadingAttachmentId, setDownloadingAttachmentId,] = useState(null);
    const [downloadError, setDownloadError,] = useState("");
    const loadTicket = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const loadedTicket = await getTicketDetail(requester.id, ticketId);
            setTicket(loadedTicket);
        }
        catch (loadError) {
            setTicket(null);
            setError(loadError instanceof Error
                ? loadError.message
                : "Unable to load Ticket Detail. Please try again.");
        }
        finally {
            setLoading(false);
        }
    }, [
        requester.id,
        ticketId,
    ]);
    useEffect(() => {
        void loadTicket();
    }, [loadTicket]);
    const activeAttachments = useMemo(() => ticket?.attachments.filter((attachment) => !attachment.isRemoved) ?? [], [ticket]);
    const removedAttachments = useMemo(() => ticket?.attachments.filter((attachment) => attachment.isRemoved) ?? [], [ticket]);
    function handleFileChange(event) {
        setUploadError("");
        setUploadSuccess("");
        const file = event.target.files?.[0] ??
            null;
        setSelectedFile(file);
        if (file) {
            const validation = validateFile(file);
            if (validation) {
                setUploadError(validation);
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
            setUploadError("Select a file to upload.");
            return;
        }
        if (activeAttachments.length >=
            MAX_ACTIVE_ATTACHMENTS) {
            setUploadError("A Ticket may have a maximum of five active Attachments.");
            return;
        }
        const validation = validateFile(selectedFile);
        if (validation) {
            setUploadError(validation);
            return;
        }
        setUploading(true);
        try {
            const uploaded = await uploadAttachment(requester.id, ticket.id, selectedFile);
            setTicket((current) => {
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
            });
            setSelectedFile(null);
            setFileInputKey((current) => current + 1);
            setUploadSuccess("Attachment uploaded successfully.");
        }
        catch (uploadFailure) {
            setUploadError(uploadFailure instanceof
                Error
                ? uploadFailure.message
                : "The Attachment could not be uploaded. Please try again.");
        }
        finally {
            setUploading(false);
        }
    }
    function startRemoval(attachment) {
        setRemovingAttachmentId(attachment.id);
        setRemovalReason("");
        setRemovalError("");
    }
    function cancelRemoval() {
        setRemovingAttachmentId(null);
        setRemovalReason("");
        setRemovalError("");
    }
    async function confirmRemoval() {
        if (removingAttachmentId ===
            null) {
            return;
        }
        const reason = removalReason.trim();
        if (reason.length < 3) {
            setRemovalError("Removal reason must contain at least 3 characters.");
            return;
        }
        if (reason.length > 200) {
            setRemovalError("Removal reason must not exceed 200 characters.");
            return;
        }
        setRemoving(true);
        setRemovalError("");
        try {
            const removed = await removeAttachment(requester.id, removingAttachmentId, reason);
            setTicket((current) => {
                if (!current) {
                    return current;
                }
                return {
                    ...current,
                    attachments: current.attachments.map((attachment) => attachment.id ===
                        removed.id
                        ? removed
                        : attachment),
                };
            });
            setRemovingAttachmentId(null);
            setRemovalReason("");
        }
        catch (removeFailure) {
            setRemovalError(removeFailure instanceof
                Error
                ? removeFailure.message
                : "The Attachment could not be removed. Please try again.");
        }
        finally {
            setRemoving(false);
        }
    }
    async function handleDownload(attachment) {
        if (attachment.isRemoved) {
            return;
        }
        setDownloadError("");
        setDownloadingAttachmentId(attachment.id);
        try {
            const blob = await downloadAttachment(requester.id, attachment.id);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href =
                objectUrl;
            link.download =
                attachment.originalFilename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        }
        catch (downloadFailure) {
            setDownloadError(downloadFailure instanceof
                Error
                ? downloadFailure.message
                : "The Attachment could not be downloaded. Please try again.");
        }
        finally {
            setDownloadingAttachmentId(null);
        }
    }
    return (_jsxs("main", { className: "tk-page tk-page-medium", children: [_jsxs("div", { className: "tk-page-header", children: [_jsxs("div", { children: [_jsx("h1", { className: "tk-page-title", children: "Ticket Detail" }), _jsx("p", { className: "tk-page-description", children: "Review the current Requester-facing Ticket information." })] }), _jsx("button", { type: "button", className: "tk-button tk-button-secondary", onClick: onBack, children: "Back to My Tickets" })] }), loading && (_jsxs("div", { className: "tk-state", role: "status", children: [_jsx("span", { className: "tk-spinner", "aria-hidden": "true" }), "Loading Ticket Detail..."] })), error && (_jsxs("div", { className: "tk-alert tk-alert-error", role: "alert", children: [_jsx("div", { children: error }), _jsxs("div", { className: "tk-button-row", children: [_jsx("button", { type: "button", className: "tk-button tk-button-secondary", onClick: () => void loadTicket(), children: "Retry" }), _jsx("button", { type: "button", className: "tk-button tk-button-tertiary", onClick: onBack, children: "Back to My Tickets" })] })] })), !loading &&
                !error &&
                ticket && (_jsxs(_Fragment, { children: [_jsx("section", { className: "tk-card", children: _jsxs("div", { className: "tk-card-body", children: [_jsx("h2", { className: "tk-card-title", children: "Ticket Information" }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Ticket Number" }), _jsx("div", { className: "tk-readonly", children: _jsx("strong", { children: ticket.ticketNumber }) })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Ticket Date" }), _jsx("div", { className: "tk-readonly", children: formatDate(ticket.createdAt) })] }) }), _jsx("div", { className: "col-md-12", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Requester" }), _jsxs("div", { className: "tk-readonly", children: [_jsx("strong", { children: ticket
                                                                    .requester
                                                                    .name }), " — ", ticket
                                                                .requester
                                                                .email] })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Category" }), _jsx("div", { className: "tk-readonly", children: ticket
                                                            .category
                                                            .name })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Related System" }), _jsx("div", { className: "tk-readonly", children: ticket
                                                            .relatedSystem
                                                            .name })] }) }), _jsx("div", { className: "col-md-12", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Ticket Summary" }), _jsx("div", { className: "tk-readonly", children: ticket.summary })] }) }), _jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Requested Priority" }), _jsx("div", { className: "tk-readonly", children: _jsx("span", { className: `tk-badge ${priorityClass(ticket.requestedPriority)}`, children: ticket.requestedPriority }) })] }) }), _jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "IT Priority" }), _jsx("div", { className: "tk-readonly", children: ticket.itPriority ? (_jsx("span", { className: `tk-badge ${priorityClass(ticket.itPriority)}`, children: ticket.itPriority })) : ("Not assigned") })] }) }), _jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Current Status" }), _jsx("div", { className: "tk-readonly", children: _jsx("span", { className: "tk-badge tk-badge-new", children: "New" }) })] }) }), _jsx("div", { className: "col-md-12", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Description" }), _jsx("div", { className: "tk-readonly", children: ticket.description })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Created" }), _jsx("div", { className: "tk-readonly", children: formatDate(ticket.createdAt) })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Last Updated" }), _jsx("div", { className: "tk-readonly", children: formatDate(ticket.updatedAt) })] }) })] })] }) }), _jsx("section", { className: "tk-card mt-3", children: _jsxs("div", { className: "tk-card-body", children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-start gap-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "tk-card-title", children: "Attachments" }), _jsx("p", { className: "tk-help-text", children: "JPG, JPEG, PNG, WEBP or PDF. Maximum 5 MB per file and 5 active Attachments." })] }), _jsxs("span", { className: "tk-help-text", children: [activeAttachments.length, "/5 active"] })] }), uploadError && (_jsx("div", { className: "tk-alert tk-alert-error", role: "alert", children: uploadError })), uploadSuccess && (_jsx("div", { className: "tk-alert tk-alert-success", role: "status", children: uploadSuccess })), _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { htmlFor: "attachment-file", className: "tk-label", children: "Add Attachment" }), _jsx("input", { id: "attachment-file", className: "tk-input", type: "file", accept: ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf", disabled: uploading ||
                                                activeAttachments.length >=
                                                    MAX_ACTIVE_ATTACHMENTS, onChange: handleFileChange }, fileInputKey), selectedFile && (_jsxs("p", { className: "tk-help-text", children: ["Selected:", " ", selectedFile.name, " ", "(", formatFileSize(selectedFile.size), ")"] }))] }), _jsx("div", { className: "tk-button-row", children: _jsx("button", { type: "button", className: "tk-button tk-button-primary", disabled: uploading ||
                                            !selectedFile ||
                                            activeAttachments.length >=
                                                MAX_ACTIVE_ATTACHMENTS, onClick: () => void handleUpload(), children: uploading
                                            ? "Uploading..."
                                            : "Upload Attachment" }) }), activeAttachments.length ===
                                    0 ? (_jsx("div", { className: "tk-alert tk-alert-info", children: "No active Attachments." })) : (_jsx("div", { className: "d-grid gap-3 mt-3", children: activeAttachments.map((attachment) => (_jsxs("article", { className: "tk-readonly", children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-start gap-3", children: [_jsxs("div", { children: [_jsx("strong", { children: attachment.originalFilename }), _jsxs("div", { className: "tk-help-text", children: [formatFileSize(attachment.sizeBytes), " · ", attachment.mimeType, " · Uploaded ", formatDate(attachment.uploadedAt)] })] }), _jsxs("div", { className: "tk-button-row m-0", children: [_jsx("button", { type: "button", className: "tk-button tk-button-secondary tk-button-sm", "aria-label": `Download ${attachment.originalFilename}`, disabled: downloadingAttachmentId ===
                                                                    attachment.id, onClick: () => void handleDownload(attachment), children: downloadingAttachmentId ===
                                                                    attachment.id
                                                                    ? "Downloading..."
                                                                    : "Download" }), _jsx("button", { type: "button", className: "tk-button tk-button-danger tk-button-sm", "aria-label": `Remove ${attachment.originalFilename}`, disabled: removing, onClick: () => startRemoval(attachment), children: "Remove" })] })] }), removingAttachmentId ===
                                                attachment.id && (_jsxs("div", { className: "mt-3", children: [_jsxs("div", { className: "tk-form-group", children: [_jsx("label", { htmlFor: `removal-reason-${attachment.id}`, className: "tk-label", children: "Removal Reason" }), _jsx("input", { id: `removal-reason-${attachment.id}`, className: "tk-input", value: removalReason, maxLength: 200, disabled: removing, onChange: (event) => {
                                                                    setRemovalReason(event
                                                                        .target
                                                                        .value);
                                                                    setRemovalError("");
                                                                }, placeholder: "Why should this Attachment be removed?" })] }), removalError && (_jsx("div", { className: "tk-alert tk-alert-error", role: "alert", children: removalError })), _jsxs("div", { className: "tk-button-row", children: [_jsx("button", { type: "button", className: "tk-button tk-button-danger", disabled: removing, onClick: () => void confirmRemoval(), children: removing
                                                                    ? "Removing..."
                                                                    : "Confirm Remove" }), _jsx("button", { type: "button", className: "tk-button tk-button-secondary", disabled: removing, onClick: cancelRemoval, children: "Cancel" })] })] }))] }, attachment.id))) })), downloadError && (_jsx("div", { className: "tk-alert tk-alert-error mt-3", role: "alert", children: downloadError })), removedAttachments.length >
                                    0 && (_jsxs("div", { className: "mt-4", children: [_jsx("h3", { className: "h6", children: "Removed Attachments" }), _jsx("div", { className: "d-grid gap-2", children: removedAttachments.map((attachment) => (_jsxs("article", { className: "tk-readonly", children: [_jsxs("div", { className: "d-flex flex-wrap gap-2 align-items-center", children: [_jsx("strong", { children: attachment.originalFilename }), _jsx("span", { className: "tk-badge", children: "Removed" })] }), _jsxs("div", { className: "tk-help-text mt-2", children: ["Removed", " ", attachment.removedAt
                                                                ? formatDate(attachment.removedAt)
                                                                : ""] }), _jsxs("div", { className: "tk-help-text", children: ["Reason:", " ", attachment.removalReason ??
                                                                "Not provided"] })] }, attachment.id))) })] }))] }) })] }))] }));
}
