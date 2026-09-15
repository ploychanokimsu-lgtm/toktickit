import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, } from "react";
import RequesterTicketDetail from "./RequesterTicketDetail.js";
import { createTicket, getCategories, getDevelopmentRequesters, getMyTickets, getRelatedSystems, } from "./api.js";
const REQUESTER_STORAGE_KEY = "developmentRequesterId";
function createSubmissionId() {
    if (typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
}
function formatDate(value) {
    return new Date(value).toLocaleString();
}
// ============================================================
// Create Ticket
// ============================================================
function CreateTicketScreen({ requester, }) {
    const [categories, setCategories] = useState([]);
    const [relatedSystems, setRelatedSystems,] = useState([]);
    const [referenceLoading, setReferenceLoading,] = useState(true);
    const [referenceError, setReferenceError,] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [relatedSystemId, setRelatedSystemId,] = useState("");
    const [summary, setSummary] = useState("");
    const [description, setDescription] = useState("");
    const [requestedPriority, setRequestedPriority,] = useState("MEDIUM");
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError,] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [createdTicket, setCreatedTicket,] = useState(null);
    const submissionIdRef = useRef(createSubmissionId());
    const loadReferenceData = useCallback(async () => {
        setReferenceLoading(true);
        setReferenceError("");
        try {
            const [loadedCategories, loadedSystems,] = await Promise.all([
                getCategories(),
                getRelatedSystems(),
            ]);
            setCategories(loadedCategories);
            setRelatedSystems(loadedSystems);
        }
        catch (error) {
            setReferenceError(error instanceof Error
                ? error.message
                : "Unable to load Ticket reference data.");
        }
        finally {
            setReferenceLoading(false);
        }
    }, []);
    useEffect(() => {
        void loadReferenceData();
    }, [loadReferenceData]);
    function validateForm() {
        const nextErrors = {};
        if (!categoryId) {
            nextErrors.categoryId =
                "Category is required.";
        }
        if (!relatedSystemId) {
            nextErrors.relatedSystemId =
                "Related System is required.";
        }
        const trimmedSummary = summary.trim();
        if (trimmedSummary.length < 5) {
            nextErrors.summary =
                "Ticket Summary must contain at least 5 characters.";
        }
        else if (trimmedSummary.length > 150) {
            nextErrors.summary =
                "Ticket Summary must not exceed 150 characters.";
        }
        const trimmedDescription = description.trim();
        if (trimmedDescription.length < 10) {
            nextErrors.description =
                "Description must contain at least 10 characters.";
        }
        else if (trimmedDescription.length > 5000) {
            nextErrors.description =
                "Description must not exceed 5000 characters.";
        }
        return nextErrors;
    }
    async function handleSubmit(event) {
        event.preventDefault();
        const nextErrors = validateForm();
        setErrors(nextErrors);
        setSubmitError("");
        setCreatedTicket(null);
        if (Object.keys(nextErrors).length >
            0) {
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
            submissionIdRef.current =
                createSubmissionId();
        }
        catch (error) {
            setSubmitError(error instanceof Error
                ? error.message
                : "The Ticket could not be created. Please try again.");
        }
        finally {
            setSubmitting(false);
        }
    }
    const ticketDate = createdTicket
        ? formatDate(createdTicket.createdAt)
        : "Generated when submitted";
    return (_jsxs("main", { className: "tk-page tk-page-medium", children: [_jsx("div", { className: "tk-page-header", children: _jsxs("div", { children: [_jsx("h1", { className: "tk-page-title", children: "Create Ticket" }), _jsx("p", { className: "tk-page-description", children: "Submit a new IT support request." })] }) }), createdTicket && (_jsxs("div", { className: "tk-alert tk-alert-success", role: "status", children: [_jsx("strong", { children: "Ticket created successfully." }), _jsxs("div", { children: ["Official Ticket Number:", " ", _jsx("strong", { children: createdTicket.ticketNumber })] })] })), submitError && (_jsx("div", { className: "tk-alert tk-alert-error", role: "alert", children: submitError })), referenceError && (_jsxs("div", { className: "tk-alert tk-alert-error", role: "alert", children: [_jsx("div", { children: referenceError }), _jsx("div", { className: "tk-button-row", children: _jsx("button", { type: "button", className: "tk-button tk-button-secondary", onClick: () => void loadReferenceData(), children: "Retry" }) })] })), _jsx("section", { className: "tk-card", children: _jsxs("div", { className: "tk-card-body", children: [_jsx("h2", { className: "tk-card-title", children: "Ticket Information" }), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Ticket Number" }), _jsx("div", { className: "tk-readonly", children: createdTicket
                                                            ?.ticketNumber ??
                                                            "Generated after successful submission" })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Ticket Date" }), _jsx("div", { className: "tk-readonly", children: ticketDate })] }) }), _jsx("div", { className: "col-md-12", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Requester" }), _jsxs("div", { className: "tk-readonly", children: [_jsx("strong", { children: requester.name }), " — ", requester.email] }), _jsx("p", { className: "tk-help-text", children: "Populated from the selected Development Requester." })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsxs("label", { htmlFor: "ticket-category", className: "tk-label", children: ["Category", " ", _jsx("span", { className: "tk-required", "aria-hidden": "true", children: "*" })] }), _jsxs("select", { id: "ticket-category", className: `tk-select ${errors.categoryId
                                                            ? "tk-input-invalid"
                                                            : ""}`, value: categoryId, onChange: (event) => {
                                                            setCategoryId(event.target.value);
                                                            if (errors.categoryId) {
                                                                setErrors((current) => ({
                                                                    ...current,
                                                                    categoryId: undefined,
                                                                }));
                                                            }
                                                        }, disabled: referenceLoading ||
                                                            Boolean(referenceError) ||
                                                            submitting, "aria-invalid": Boolean(errors.categoryId), children: [_jsx("option", { value: "", children: "Select a category" }), categories.map((category) => (_jsx("option", { value: category.id, children: category.name }, category.id)))] }), errors.categoryId && (_jsx("div", { className: "tk-field-error", children: errors.categoryId }))] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsxs("label", { htmlFor: "ticket-related-system", className: "tk-label", children: ["Related System", " ", _jsx("span", { className: "tk-required", "aria-hidden": "true", children: "*" })] }), _jsxs("select", { id: "ticket-related-system", className: `tk-select ${errors.relatedSystemId
                                                            ? "tk-input-invalid"
                                                            : ""}`, value: relatedSystemId, onChange: (event) => {
                                                            setRelatedSystemId(event.target.value);
                                                            if (errors.relatedSystemId) {
                                                                setErrors((current) => ({
                                                                    ...current,
                                                                    relatedSystemId: undefined,
                                                                }));
                                                            }
                                                        }, disabled: referenceLoading ||
                                                            Boolean(referenceError) ||
                                                            submitting, "aria-invalid": Boolean(errors.relatedSystemId), children: [_jsx("option", { value: "", children: "Select a related system" }), relatedSystems.map((system) => (_jsx("option", { value: system.id, children: system.name }, system.id)))] }), errors.relatedSystemId && (_jsx("div", { className: "tk-field-error", children: errors.relatedSystemId }))] }) }), _jsx("div", { className: "col-md-12", children: _jsxs("div", { className: "tk-form-group", children: [_jsxs("label", { htmlFor: "ticket-summary", className: "tk-label", children: ["Ticket Summary", " ", _jsx("span", { className: "tk-required", "aria-hidden": "true", children: "*" })] }), _jsx("input", { id: "ticket-summary", className: `tk-input ${errors.summary
                                                            ? "tk-input-invalid"
                                                            : ""}`, type: "text", value: summary, maxLength: 150, disabled: submitting, "aria-invalid": Boolean(errors.summary), onChange: (event) => {
                                                            setSummary(event.target.value);
                                                            if (errors.summary) {
                                                                setErrors((current) => ({
                                                                    ...current,
                                                                    summary: undefined,
                                                                }));
                                                            }
                                                        } }), _jsx("p", { className: "tk-help-text", children: "5\u2013150 characters." }), errors.summary && (_jsx("div", { className: "tk-field-error", children: errors.summary }))] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsxs("label", { htmlFor: "requested-priority", className: "tk-label", children: ["Requested Priority", " ", _jsx("span", { className: "tk-required", "aria-hidden": "true", children: "*" })] }), _jsxs("select", { id: "requested-priority", className: "tk-select", value: requestedPriority, disabled: submitting, onChange: (event) => setRequestedPriority(event.target
                                                            .value), children: [_jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" })] })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { className: "tk-label", children: "Current Status" }), _jsx("div", { className: "tk-readonly", children: _jsx("span", { className: "tk-badge tk-badge-new", children: "New" }) })] }) }), _jsx("div", { className: "col-md-12", children: _jsxs("div", { className: "tk-form-group", children: [_jsxs("label", { htmlFor: "ticket-description", className: "tk-label", children: ["Description", " ", _jsx("span", { className: "tk-required", "aria-hidden": "true", children: "*" })] }), _jsx("textarea", { id: "ticket-description", className: `tk-textarea ${errors.description
                                                            ? "tk-input-invalid"
                                                            : ""}`, rows: 6, value: description, maxLength: 5000, disabled: submitting, "aria-invalid": Boolean(errors.description), onChange: (event) => {
                                                            setDescription(event.target.value);
                                                            if (errors.description) {
                                                                setErrors((current) => ({
                                                                    ...current,
                                                                    description: undefined,
                                                                }));
                                                            }
                                                        } }), _jsx("p", { className: "tk-help-text", children: "10\u20135000 characters." }), errors.description && (_jsx("div", { className: "tk-field-error", children: errors.description }))] }) })] }), referenceLoading && (_jsxs("div", { className: "tk-state", role: "status", children: [_jsx("span", { className: "tk-spinner", "aria-hidden": "true" }), "Loading Ticket reference data..."] })), _jsx("div", { className: "tk-button-row", children: _jsx("button", { type: "submit", className: "tk-button tk-button-primary", disabled: submitting ||
                                            referenceLoading ||
                                            Boolean(referenceError), children: submitting
                                            ? "Submitting..."
                                            : "Submit Ticket" }) })] })] }) })] }));
}
// ============================================================
// My Tickets
// ============================================================
function MyTicketsScreen({ requester, onOpenTicket, }) {
    const [tickets, setTickets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [relatedSystems, setRelatedSystems,] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchInput, setSearchInput,] = useState("");
    const [appliedSearch, setAppliedSearch,] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [relatedSystemId, setRelatedSystemId,] = useState("");
    const [requestedPriority, setRequestedPriority,] = useState("");
    const [sortValue, setSortValue] = useState("updatedAt:desc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems,] = useState(0);
    const [totalPages, setTotalPages,] = useState(0);
    const [retryVersion, setRetryVersion,] = useState(0);
    useEffect(() => {
        let active = true;
        async function loadReferences() {
            try {
                const [loadedCategories, loadedSystems,] = await Promise.all([
                    getCategories(),
                    getRelatedSystems(),
                ]);
                if (!active) {
                    return;
                }
                setCategories(loadedCategories);
                setRelatedSystems(loadedSystems);
            }
            catch {
                // My Tickets API error
                // remains the main screen error.
            }
        }
        void loadReferences();
        return () => {
            active = false;
        };
    }, []);
    const loadTickets = useCallback(async () => {
        setLoading(true);
        setError("");
        const [sortBy, sortOrder,] = sortValue.split(":");
        try {
            const result = await getMyTickets(requester.id, {
                search: appliedSearch,
                categoryId: categoryId
                    ? Number(categoryId)
                    : undefined,
                relatedSystemId: relatedSystemId
                    ? Number(relatedSystemId)
                    : undefined,
                requestedPriority,
                sortBy,
                sortOrder,
                page,
                pageSize,
            });
            setTickets(result.tickets);
            setTotalItems(result.pagination
                .totalItems);
            setTotalPages(result.pagination
                .totalPages);
            if (result.pagination
                .totalPages > 0 &&
                page >
                    result.pagination
                        .totalPages) {
                setPage(result.pagination
                    .totalPages);
            }
        }
        catch (loadError) {
            setTickets([]);
            setError(loadError instanceof Error
                ? loadError.message
                : "Unable to load Tickets. Please try again.");
        }
        finally {
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
    function handleSearch(event) {
        event.preventDefault();
        setPage(1);
        const nextSearch = searchInput.trim();
        if (nextSearch ===
            appliedSearch) {
            setRetryVersion((current) => current + 1);
        }
        else {
            setAppliedSearch(nextSearch);
        }
    }
    function clearFilters() {
        setSearchInput("");
        setAppliedSearch("");
        setCategoryId("");
        setRelatedSystemId("");
        setRequestedPriority("");
        setSortValue("updatedAt:desc");
        setPageSize(10);
        setPage(1);
    }
    const hasSearchOrFilters = Boolean(appliedSearch) ||
        Boolean(categoryId) ||
        Boolean(relatedSystemId) ||
        Boolean(requestedPriority);
    return (_jsxs("main", { className: "tk-page", children: [_jsx("div", { className: "tk-page-header", children: _jsxs("div", { children: [_jsx("h1", { className: "tk-page-title", children: "My Tickets" }), _jsxs("p", { className: "tk-page-description", children: ["Search and review tickets belonging to", " ", _jsx("strong", { children: requester.name }), "."] })] }) }), _jsx("section", { className: "tk-card mb-3", children: _jsx("div", { className: "tk-card-body", children: _jsxs("form", { onSubmit: handleSearch, children: [_jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-lg-4", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { htmlFor: "ticket-search", className: "tk-label", children: "Search" }), _jsx("input", { id: "ticket-search", className: "tk-input", value: searchInput, onChange: (event) => setSearchInput(event.target
                                                        .value), placeholder: "Ticket Number or Summary" })] }) }), _jsx("div", { className: "col-md-6 col-lg-2", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { htmlFor: "filter-category", className: "tk-label", children: "Category" }), _jsxs("select", { id: "filter-category", className: "tk-select", value: categoryId, onChange: (event) => {
                                                        setCategoryId(event.target
                                                            .value);
                                                        setPage(1);
                                                    }, children: [_jsx("option", { value: "", children: "All" }), categories.map((category) => (_jsx("option", { value: category.id, children: category.name }, category.id)))] })] }) }), _jsx("div", { className: "col-md-6 col-lg-2", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { htmlFor: "filter-system", className: "tk-label", children: "Related System" }), _jsxs("select", { id: "filter-system", className: "tk-select", value: relatedSystemId, onChange: (event) => {
                                                        setRelatedSystemId(event.target
                                                            .value);
                                                        setPage(1);
                                                    }, children: [_jsx("option", { value: "", children: "All" }), relatedSystems.map((system) => (_jsx("option", { value: system.id, children: system.name }, system.id)))] })] }) }), _jsx("div", { className: "col-md-6 col-lg-2", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { htmlFor: "filter-priority", className: "tk-label", children: "Priority" }), _jsxs("select", { id: "filter-priority", className: "tk-select", value: requestedPriority, onChange: (event) => {
                                                        setRequestedPriority(event.target
                                                            .value);
                                                        setPage(1);
                                                    }, children: [_jsx("option", { value: "", children: "All" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" })] })] }) }), _jsx("div", { className: "col-md-6 col-lg-2", children: _jsxs("div", { className: "tk-form-group", children: [_jsx("label", { htmlFor: "ticket-sort", className: "tk-label", children: "Sort" }), _jsxs("select", { id: "ticket-sort", className: "tk-select", value: sortValue, onChange: (event) => {
                                                        setSortValue(event.target
                                                            .value);
                                                        setPage(1);
                                                    }, children: [_jsx("option", { value: "updatedAt:desc", children: "Last Updated \u2014 Newest" }), _jsx("option", { value: "updatedAt:asc", children: "Last Updated \u2014 Oldest" }), _jsx("option", { value: "createdAt:desc", children: "Created \u2014 Newest" }), _jsx("option", { value: "ticketNumber:asc", children: "Ticket Number \u2014 A-Z" }), _jsx("option", { value: "summary:asc", children: "Summary \u2014 A-Z" }), _jsx("option", { value: "requestedPriority:asc", children: "Priority" })] })] }) })] }), _jsxs("div", { className: "tk-button-row", children: [_jsx("button", { type: "submit", className: "tk-button tk-button-primary", children: "Search" }), _jsx("button", { type: "button", className: "tk-button tk-button-secondary", onClick: clearFilters, children: "Clear Filters" })] })] }) }) }), error && (_jsxs("div", { className: "tk-alert tk-alert-error", role: "alert", children: [_jsx("div", { children: error }), _jsx("div", { className: "tk-button-row", children: _jsx("button", { type: "button", className: "tk-button tk-button-secondary", onClick: () => setRetryVersion((current) => current + 1), children: "Retry" }) })] })), loading && (_jsxs("div", { className: "tk-state", role: "status", children: [_jsx("span", { className: "tk-spinner", "aria-hidden": "true" }), "Loading your Tickets..."] })), !loading &&
                !error &&
                tickets.length === 0 &&
                !hasSearchOrFilters && (_jsx("div", { className: "tk-alert tk-alert-info", children: "You do not have any tickets yet." })), !loading &&
                !error &&
                tickets.length === 0 &&
                hasSearchOrFilters && (_jsx("div", { className: "tk-alert tk-alert-info", children: "No tickets match your current search or filters." })), !loading &&
                !error &&
                tickets.length > 0 && (_jsxs(_Fragment, { children: [_jsx("section", { className: "tk-card", children: _jsxs("div", { className: "tk-card-body", children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3", children: [_jsx("h2", { className: "tk-card-title mb-0", children: "Tickets" }), _jsxs("span", { className: "tk-help-text", children: [totalItems, " total"] })] }), _jsx("div", { className: "d-none d-md-block", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table align-middle", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Ticket Number" }), _jsx("th", { children: "Summary" }), _jsx("th", { children: "Category" }), _jsx("th", { children: "Related System" }), _jsx("th", { children: "Priority" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Last Updated" }), _jsx("th", { children: "Action" })] }) }), _jsx("tbody", { children: tickets.map((ticket) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: ticket.ticketNumber }) }), _jsx("td", { children: ticket.summary }), _jsx("td", { children: ticket.category
                                                                    .name }), _jsx("td", { children: ticket.relatedSystem
                                                                    .name }), _jsx("td", { children: _jsx("span", { className: `tk-badge ${ticket.requestedPriority ===
                                                                        "HIGH"
                                                                        ? "tk-badge-high"
                                                                        : ticket.requestedPriority ===
                                                                            "LOW"
                                                                            ? "tk-badge-low"
                                                                            : "tk-badge-medium"}`, children: ticket.requestedPriority }) }), _jsx("td", { children: _jsx("span", { className: "tk-badge tk-badge-new", children: "New" }) }), _jsx("td", { children: formatDate(ticket.updatedAt) }), _jsx("td", { children: _jsx("button", { type: "button", className: "tk-button tk-button-secondary tk-button-sm", onClick: () => onOpenTicket(ticket.id), children: "View" }) })] }, ticket.id))) })] }) }) }), _jsx("div", { className: "d-md-none", children: _jsx("div", { className: "d-grid gap-3", children: tickets.map((ticket) => (_jsx("article", { className: "tk-card", children: _jsxs("div", { className: "tk-card-body", children: [_jsx("strong", { children: ticket.ticketNumber }), _jsx("h3", { className: "h6 mt-2", children: ticket.summary }), _jsxs("div", { className: "tk-help-text", children: [ticket.category
                                                                .name, " ", "\u00B7", " ", ticket.relatedSystem
                                                                .name] }), _jsxs("div", { className: "d-flex gap-2 flex-wrap mt-2", children: [_jsx("span", { className: `tk-badge ${ticket.requestedPriority ===
                                                                    "HIGH"
                                                                    ? "tk-badge-high"
                                                                    : ticket.requestedPriority ===
                                                                        "LOW"
                                                                        ? "tk-badge-low"
                                                                        : "tk-badge-medium"}`, children: ticket.requestedPriority }), _jsx("span", { className: "tk-badge tk-badge-new", children: "New" })] }), _jsxs("p", { className: "tk-help-text mt-2 mb-0", children: ["Updated", " ", formatDate(ticket.updatedAt)] }), _jsx("div", { className: "tk-button-row", children: _jsx("button", { type: "button", className: "tk-button tk-button-secondary tk-button-sm", onClick: () => onOpenTicket(ticket.id), children: "View Ticket" }) })] }) }, ticket.id))) }) })] }) }), _jsx("section", { className: "tk-card mt-3", children: _jsx("div", { className: "tk-card-body", children: _jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-center gap-3", children: [_jsxs("div", { className: "tk-help-text", children: ["Page ", page, totalPages > 0
                                                ? ` of ${totalPages}`
                                                : ""] }), _jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("label", { htmlFor: "page-size", className: "tk-label mb-0", children: "Per page" }), _jsxs("select", { id: "page-size", className: "tk-select", value: pageSize, onChange: (event) => {
                                                    setPageSize(Number(event.target
                                                        .value));
                                                    setPage(1);
                                                }, children: [_jsx("option", { value: "10", children: "10" }), _jsx("option", { value: "20", children: "20" }), _jsx("option", { value: "50", children: "50" })] })] }), _jsxs("div", { className: "tk-button-row m-0", children: [_jsx("button", { type: "button", className: "tk-button tk-button-secondary", disabled: page <= 1, onClick: () => setPage((current) => Math.max(1, current -
                                                    1)), children: "Previous" }), _jsx("button", { type: "button", className: "tk-button tk-button-secondary", disabled: totalPages ===
                                                    0 ||
                                                    page >=
                                                        totalPages, onClick: () => setPage((current) => current +
                                                    1), children: "Next" })] })] }) }) })] }))] }));
}
// ============================================================
// Main App
// ============================================================
export default function App() {
    const [requesters, setRequesters] = useState([]);
    const [selectedId, setSelectedId,] = useState("");
    const [currentRequester, setCurrentRequester,] = useState(null);
    const [viewState, setViewState,] = useState("loading");
    const [errorMessage, setErrorMessage,] = useState("");
    const [activeScreen, setActiveScreen,] = useState("create");
    const [selectedTicketId, setSelectedTicketId,] = useState(null);
    const loadRequesters = useCallback(async () => {
        setViewState("loading");
        setErrorMessage("");
        try {
            const loaded = await getDevelopmentRequesters();
            setRequesters(loaded);
            if (loaded.length === 0) {
                setCurrentRequester(null);
                setSelectedId("");
                setViewState("empty");
                return;
            }
            const storedId = sessionStorage.getItem(REQUESTER_STORAGE_KEY);
            if (storedId) {
                const storedRequester = loaded.find((requester) => requester.id ===
                    Number(storedId));
                if (storedRequester) {
                    setSelectedId(String(storedRequester.id));
                    setCurrentRequester(storedRequester);
                }
                else {
                    sessionStorage.removeItem(REQUESTER_STORAGE_KEY);
                    setSelectedId("");
                    setCurrentRequester(null);
                }
            }
            setViewState("ready");
        }
        catch (error) {
            setCurrentRequester(null);
            setErrorMessage(error instanceof Error
                ? error.message
                : "Unable to load Development Requesters.");
            setViewState("error");
        }
    }, []);
    useEffect(() => {
        void loadRequesters();
    }, [loadRequesters]);
    function handleContinue() {
        const requester = requesters.find((item) => item.id ===
            Number(selectedId));
        if (!requester) {
            return;
        }
        sessionStorage.setItem(REQUESTER_STORAGE_KEY, String(requester.id));
        setCurrentRequester(requester);
        setSelectedTicketId(null);
        setActiveScreen("create");
    }
    function handleChangeRequester() {
        sessionStorage.removeItem(REQUESTER_STORAGE_KEY);
        setSelectedId("");
        setCurrentRequester(null);
        setSelectedTicketId(null);
        setActiveScreen("create");
    }
    if (currentRequester) {
        return (_jsxs("div", { className: "tk-app", children: [_jsx("header", { className: "tk-header", children: _jsxs("div", { className: "tk-header-inner", children: [_jsx("span", { className: "tk-brand", children: "TokTickIT" }), _jsxs("div", { className: "tk-header-actions", children: [_jsxs("span", { className: "tk-requester-display", children: ["Requester:", " ", _jsx("strong", { children: currentRequester.name })] }), _jsx("button", { type: "button", className: "tk-button tk-button-secondary tk-button-sm", onClick: handleChangeRequester, children: "Change Requester" })] })] }) }), _jsxs("nav", { className: "tk-nav", "aria-label": "Main navigation", children: [_jsx("button", { type: "button", className: `tk-nav-link ${activeScreen ===
                                "myTickets" ||
                                activeScreen ===
                                    "ticketDetail"
                                ? "active"
                                : ""}`, "aria-current": activeScreen ===
                                "myTickets" ||
                                activeScreen ===
                                    "ticketDetail"
                                ? "page"
                                : undefined, onClick: () => {
                                setSelectedTicketId(null);
                                setActiveScreen("myTickets");
                            }, children: "My Tickets" }), _jsx("button", { type: "button", className: `tk-nav-link ${activeScreen ===
                                "create"
                                ? "active"
                                : ""}`, "aria-current": activeScreen ===
                                "create"
                                ? "page"
                                : undefined, onClick: () => {
                                setSelectedTicketId(null);
                                setActiveScreen("create");
                            }, children: "Create Ticket" })] }), activeScreen ===
                    "create" && (_jsx(CreateTicketScreen, { requester: currentRequester })), activeScreen ===
                    "myTickets" && (_jsx(MyTicketsScreen, { requester: currentRequester, onOpenTicket: (ticketId) => {
                        setSelectedTicketId(ticketId);
                        setActiveScreen("ticketDetail");
                    } })), activeScreen ===
                    "ticketDetail" &&
                    selectedTicketId !==
                        null && (_jsx(RequesterTicketDetail, { requester: currentRequester, ticketId: selectedTicketId, onBack: () => {
                        setSelectedTicketId(null);
                        setActiveScreen("myTickets");
                    } }))] }));
    }
    return (_jsxs("div", { className: "tk-app", children: [_jsx("header", { className: "tk-header", children: _jsx("div", { className: "tk-header-inner", children: _jsx("span", { className: "tk-brand", children: "TokTickIT" }) }) }), _jsx("main", { className: "tk-page tk-page-narrow", children: _jsx("section", { className: "tk-card tk-requester-card", children: _jsxs("div", { className: "tk-card-body", children: [_jsxs("div", { className: "tk-requester-intro", children: [_jsx("h1", { className: "tk-card-title", children: "Select Development Requester" }), _jsx("p", { className: "tk-page-description", children: "Select a Development Requester to test requester-specific ticket behavior." }), _jsx("p", { className: "tk-page-description", children: "This is not a login screen. Authentication and role-based access will be introduced in Lab 3." })] }), viewState ===
                                "loading" && (_jsxs("div", { className: "tk-state", role: "status", children: [_jsx("span", { className: "tk-spinner", "aria-hidden": "true" }), "Loading Development Requesters..."] })), viewState ===
                                "error" && (_jsxs("div", { className: "tk-alert tk-alert-error", children: [_jsx("div", { children: errorMessage }), _jsx("div", { className: "tk-button-row", children: _jsx("button", { type: "button", className: "tk-button tk-button-secondary", onClick: () => void loadRequesters(), children: "Retry" }) })] })), viewState ===
                                "empty" && (_jsx("div", { className: "tk-alert tk-alert-warning", role: "status", children: "No active Development Requesters are available." })), viewState ===
                                "ready" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "tk-form-group", children: [_jsxs("label", { htmlFor: "development-requester", className: "tk-label", children: ["Development Requester", " ", _jsx("span", { className: "tk-required", "aria-hidden": "true", children: "*" })] }), _jsxs("select", { id: "development-requester", className: "tk-select", value: selectedId, onChange: (event) => setSelectedId(event.target
                                                    .value), children: [_jsx("option", { value: "", children: "Select a requester" }), requesters.map((requester) => (_jsx("option", { value: requester.id, children: requester.name }, requester.id)))] }), _jsx("p", { className: "tk-help-text", children: "Only active Development Requesters are shown." })] }), _jsx("div", { className: "tk-button-row", children: _jsx("button", { type: "button", className: "tk-button tk-button-primary", disabled: !selectedId, onClick: handleContinue, children: "Continue" }) })] }))] }) }) })] }));
}
