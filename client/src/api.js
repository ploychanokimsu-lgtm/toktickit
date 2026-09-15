const API_URL = import.meta.env.VITE_API_URL ??
    "http://localhost:3000";
async function getErrorMessage(response, fallback) {
    try {
        const data = (await response.json());
        return (data.error?.message ??
            fallback);
    }
    catch {
        return fallback;
    }
}
export async function checkSystem() {
    try {
        const healthResponse = await fetch(`${API_URL}/api/health`);
        if (!healthResponse.ok) {
            throw new Error();
        }
        const health = await healthResponse.json();
        if (health.status !==
            "ok") {
            throw new Error();
        }
        const categoriesResponse = await fetch(`${API_URL}/api/categories`);
        if (!categoriesResponse.ok) {
            throw new Error();
        }
        const categories = await categoriesResponse.json();
        return {
            online: true,
            categories,
        };
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
}
export async function getDevelopmentRequesters() {
    const response = await fetch(`${API_URL}/api/requesters`);
    if (!response.ok) {
        throw new Error("Unable to load Development Requesters.");
    }
    const data = await response.json();
    return data.requesters;
}
export async function getCategories() {
    const response = await fetch(`${API_URL}/api/categories`);
    if (!response.ok) {
        throw new Error("Unable to load Categories.");
    }
    return (await response.json());
}
export async function getRelatedSystems() {
    const response = await fetch(`${API_URL}/api/related-systems`);
    if (!response.ok) {
        throw new Error("Unable to load Related Systems.");
    }
    const data = await response.json();
    return data.relatedSystems;
}
export async function createTicket(payload) {
    const response = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const message = await getErrorMessage(response, "The Ticket could not be created. Please try again.");
        throw new Error(message);
    }
    const data = await response.json();
    return data.ticket;
}
export async function getMyTickets(requesterId, query = {}) {
    const params = new URLSearchParams();
    if (query.search?.trim()) {
        params.set("search", query.search.trim());
    }
    if (query.categoryId) {
        params.set("categoryId", String(query.categoryId));
    }
    if (query.relatedSystemId) {
        params.set("relatedSystemId", String(query.relatedSystemId));
    }
    if (query.requestedPriority) {
        params.set("requestedPriority", query.requestedPriority);
    }
    params.set("sortBy", query.sortBy ??
        "updatedAt");
    params.set("sortOrder", query.sortOrder ??
        "desc");
    params.set("page", String(query.page ?? 1));
    params.set("pageSize", String(query.pageSize ??
        10));
    const response = await fetch(`${API_URL}/api/tickets?${params.toString()}`, {
        headers: {
            "X-Development-Requester-Id": String(requesterId),
        },
    });
    if (!response.ok) {
        const message = await getErrorMessage(response, "Unable to load Tickets. Please try again.");
        throw new Error(message);
    }
    return (await response.json());
}
export async function getTicketDetail(requesterId, ticketId) {
    const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        headers: {
            "X-Development-Requester-Id": String(requesterId),
        },
    });
    if (!response.ok) {
        const message = await getErrorMessage(response, "Unable to load Ticket Detail. Please try again.");
        throw new Error(message);
    }
    const data = await response.json();
    return data.ticket;
}
export async function getTicketAttachments(requesterId, ticketId) {
    const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
        headers: {
            "X-Development-Requester-Id": String(requesterId),
        },
    });
    if (!response.ok) {
        const message = await getErrorMessage(response, "Unable to load Attachments. Please try again.");
        throw new Error(message);
    }
    const data = await response.json();
    return data.attachments;
}
export async function uploadAttachment(requesterId, ticketId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        headers: {
            "X-Development-Requester-Id": String(requesterId),
        },
        body: formData,
    });
    if (!response.ok) {
        const message = await getErrorMessage(response, "The Attachment could not be uploaded. Please try again.");
        throw new Error(message);
    }
    const data = await response.json();
    return data.attachment;
}
export async function removeAttachment(requesterId, attachmentId, reason) {
    const response = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "X-Development-Requester-Id": String(requesterId),
        },
        body: JSON.stringify({
            reason,
        }),
    });
    if (!response.ok) {
        const message = await getErrorMessage(response, "The Attachment could not be removed. Please try again.");
        throw new Error(message);
    }
    const data = await response.json();
    return data.attachment;
}
export async function downloadAttachment(requesterId, attachmentId) {
    const response = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
        headers: {
            "X-Development-Requester-Id": String(requesterId),
        },
    });
    if (!response.ok) {
        const message = await getErrorMessage(response, "The Attachment could not be downloaded. Please try again.");
        throw new Error(message);
    }
    return await response.blob();
}
