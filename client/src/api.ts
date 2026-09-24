const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export type RequestedPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface CreateTicketRequest {
  clientSubmissionId: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
}

export interface CreatedTicket {
  id: number;
  ticketNumber: string;

  clientSubmissionId?:
    string;

  requesterId: number;
  categoryId: number;
  relatedSystemId: number;

  summary: string;

  requestedPriority:
    RequestedPriority;

  description: string;

  currentStatus:
    "NEW";

  createdAt: string;
  updatedAt: string;
}

export interface TicketListItem {
  id: number;

  ticketNumber:
    string;

  requesterId:
    number;

  categoryId:
    number;

  relatedSystemId:
    number;

  summary: string;

  requestedPriority:
    RequestedPriority;

  currentStatus:
    "NEW";

  createdAt: string;
  updatedAt: string;

  category: {
    id: number;
    name: string;
  };

  relatedSystem: {
    id: number;
    name: string;
  };
}

export interface TicketPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TicketListResponse {
  tickets:
    TicketListItem[];

  pagination:
    TicketPagination;
}

export interface TicketListQuery {
  search?: string;

  categoryId?: number;

  relatedSystemId?:
    number;

  requestedPriority?:
    | RequestedPriority
    | "";

  sortBy?:
    | "updatedAt"
    | "createdAt"
    | "ticketNumber"
    | "summary"
    | "requestedPriority";

  sortOrder?:
    | "asc"
    | "desc";

  page?: number;

  pageSize?:
    | 10
    | 20
    | 50;
}

export interface TicketAttachmentMetadata {
  id: number;

  originalFilename:
    string;

  mimeType:
    string;

  sizeBytes:
    number;

  isRemoved:
    boolean;

  uploadedAt:
    string;

  removedAt:
    | string
    | null;

  removalReason:
    | string
    | null;
}

export interface TicketDetail {
  id: number;

  ticketNumber:
    string;

  requesterId:
    number;

  categoryId:
    number;

  relatedSystemId:
    number;

  summary: string;

  description:
    string;

  requestedPriority:
    RequestedPriority;

  currentStatus:
    "NEW";

  itPriority:
    | RequestedPriority
    | null;

  createdAt:
    string;

  updatedAt:
    string;

  requester: {
    id: number;
    name: string;
    email: string;
  };

  category: {
    id: number;
    name: string;
  };

  relatedSystem: {
    id: number;
    name: string;
  };

  attachments:
    TicketAttachmentMetadata[];
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;

    fields?: Record<
      string,
      string
    >;
  };
}

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data =
      (await response.json()) as ApiErrorResponse;

    return (
      data.error?.message ??
      fallback
    );
  } catch {
    return fallback;
  }
}

export async function checkSystem(): Promise<SystemStatus> {
  try {
    const healthResponse =
      await fetch(
        `${API_URL}/api/health`
      );

    if (
      !healthResponse.ok
    ) {
      throw new Error();
    }

    const health =
      await healthResponse.json();

    if (
      health.status !==
      "ok"
    ) {
      throw new Error();
    }

    const categoriesResponse =
      await fetch(
        `${API_URL}/api/categories`
      );

    if (
      !categoriesResponse.ok
    ) {
      throw new Error();
    }

    const categories:
      Category[] =
      await categoriesResponse.json();

    return {
      online: true,
      categories,
    };
  } catch {
    throw new Error(
      "Unable to connect to TokTickIT API"
    );
  }
}

export async function getDevelopmentRequesters(): Promise<
  DevelopmentRequester[]
> {
  const response =
    await fetch(
      `${API_URL}/api/requesters`
    );

  if (!response.ok) {
    throw new Error(
      "Unable to load Development Requesters."
    );
  }

  const data: {
    requesters:
      DevelopmentRequester[];
  } =
    await response.json();

  return data.requesters;
}

export async function getCategories(): Promise<
  Category[]
> {
  const response =
    await fetch(
      `${API_URL}/api/categories`
    );

  if (!response.ok) {
    throw new Error(
      "Unable to load Categories."
    );
  }

  return (
    await response.json()
  ) as Category[];
}

export async function getRelatedSystems(): Promise<
  RelatedSystem[]
> {
  const response =
    await fetch(
      `${API_URL}/api/related-systems`
    );

  if (!response.ok) {
    throw new Error(
      "Unable to load Related Systems."
    );
  }

  const data: {
    relatedSystems:
      RelatedSystem[];
  } =
    await response.json();

  return data.relatedSystems;
}

export async function createTicket(
  payload:
    CreateTicketRequest
): Promise<CreatedTicket> {
  const response =
    await fetch(
      `${API_URL}/api/tickets`,

      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,

        "The Ticket could not be created. Please try again."
      );

    throw new Error(
      message
    );
  }

  const data: {
    ticket:
      CreatedTicket;
  } =
    await response.json();

  return data.ticket;
}

export async function getMyTickets(
  requesterId: number,

  query:
    TicketListQuery = {}
): Promise<TicketListResponse> {
  const params =
    new URLSearchParams();

  if (
    query.search?.trim()
  ) {
    params.set(
      "search",
      query.search.trim()
    );
  }

  if (
    query.categoryId
  ) {
    params.set(
      "categoryId",

      String(
        query.categoryId
      )
    );
  }

  if (
    query.relatedSystemId
  ) {
    params.set(
      "relatedSystemId",

      String(
        query.relatedSystemId
      )
    );
  }

  if (
    query.requestedPriority
  ) {
    params.set(
      "requestedPriority",
      query.requestedPriority
    );
  }

  params.set(
    "sortBy",

    query.sortBy ??
      "updatedAt"
  );

  params.set(
    "sortOrder",

    query.sortOrder ??
      "desc"
  );

  params.set(
    "page",

    String(
      query.page ?? 1
    )
  );

  params.set(
    "pageSize",

    String(
      query.pageSize ??
        10
    )
  );

  const response =
    await fetch(
      `${API_URL}/api/tickets?${params.toString()}`,

      {
        headers: {
          "X-Development-Requester-Id":
            String(
              requesterId
            ),
        },
      }
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,

        "Unable to load Tickets. Please try again."
      );

    throw new Error(
      message
    );
  }

  return (
    await response.json()
  ) as TicketListResponse;
}

export async function getTicketDetail(
  requesterId: number,
  ticketId: number
): Promise<TicketDetail> {
  const response =
    await fetch(
      `${API_URL}/api/tickets/${ticketId}`,

      {
        headers: {
          "X-Development-Requester-Id":
            String(
              requesterId
            ),
        },
      }
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,

        "Unable to load Ticket Detail. Please try again."
      );

    throw new Error(
      message
    );
  }

  const data: {
    ticket:
      TicketDetail;
  } =
    await response.json();

  return data.ticket;
}

export async function getTicketAttachments(
  requesterId: number,
  ticketId: number
): Promise<
  TicketAttachmentMetadata[]
> {
  const response =
    await fetch(
      `${API_URL}/api/tickets/${ticketId}/attachments`,

      {
        headers: {
          "X-Development-Requester-Id":
            String(
              requesterId
            ),
        },
      }
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,

        "Unable to load Attachments. Please try again."
      );

    throw new Error(
      message
    );
  }

  const data: {
    attachments:
      TicketAttachmentMetadata[];
  } =
    await response.json();

  return data.attachments;
}

export async function uploadAttachment(
  requesterId: number,
  ticketId: number,
  file: File
): Promise<TicketAttachmentMetadata> {
  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  const response =
    await fetch(
      `${API_URL}/api/tickets/${ticketId}/attachments`,

      {
        method: "POST",

        headers: {
          "X-Development-Requester-Id":
            String(
              requesterId
            ),
        },

        body:
          formData,
      }
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,

        "The Attachment could not be uploaded. Please try again."
      );

    throw new Error(
      message
    );
  }

  const data: {
    attachment:
      TicketAttachmentMetadata;
  } =
    await response.json();

  return data.attachment;
}

export async function removeAttachment(
  requesterId: number,
  attachmentId: number,
  reason: string
): Promise<TicketAttachmentMetadata> {
  const response =
    await fetch(
      `${API_URL}/api/attachments/${attachmentId}`,

      {
        method: "DELETE",

        headers: {
          "Content-Type":
            "application/json",

          "X-Development-Requester-Id":
            String(
              requesterId
            ),
        },

        body:
          JSON.stringify({
            reason,
          }),
      }
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,

        "The Attachment could not be removed. Please try again."
      );

    throw new Error(
      message
    );
  }

  const data: {
    attachment:
      TicketAttachmentMetadata;
  } =
    await response.json();

  return data.attachment;
}

export async function downloadAttachment(
  requesterId: number,
  attachmentId: number
): Promise<Blob> {
  const response =
    await fetch(
      `${API_URL}/api/attachments/${attachmentId}/download`,

      {
        headers: {
          "X-Development-Requester-Id":
            String(
              requesterId
            ),
        },
      }
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,

        "The Attachment could not be downloaded. Please try again."
      );

    throw new Error(
      message
    );
  }

  return await response.blob();
}

// ============================================================
// Lab 3 IT Staff Ticket Queue
// ============================================================

export type UserRole =
  | "REQUESTER"
  | "IT_STAFF"
  | "ADMINISTRATOR";

export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface StaffQueueTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  currentStatus: TicketStatus;
  ownerId: number | null;
  createdAt: string;
  updatedAt: string;

  category: {
    id: number;
    name: string;
  };

  owner: {
    id: number;
    name: string;
  } | null;
}

export interface StaffQueuePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface StaffQueueResponse {
  tickets: StaffQueueTicket[];
  pagination: StaffQueuePagination;
}

export interface StaffQueueQuery {
  search?: string;
  categoryId?: number;
  requestedPriority?: RequestedPriority | "";
  itPriority?: RequestedPriority | "";
  status?: TicketStatus | "";
  assignment?:
    | "all"
    | "assigned"
    | "unassigned"
    | "mine";
  ownerId?: number;
  sort?:
    | "updatedAt"
    | "createdAt"
    | "ticketNumber"
    | "requestedPriority"
    | "itPriority"
    | "status";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(
    message: string,
    status: number,
    code?: string
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function readApiFailure(
  response: Response,
  fallback: string
): Promise<ApiRequestError> {
  try {
    const data = (await response.json()) as {
      error?: {
        code?: string;
        message?: string;
      };
    };

    return new ApiRequestError(
      data.error?.message ?? fallback,
      response.status,
      data.error?.code
    );
  } catch {
    return new ApiRequestError(
      fallback,
      response.status
    );
  }
}

export async function getCurrentUser(): Promise<
  AuthenticatedUser
> {
  const response = await fetch(
    `${API_URL}/api/auth/me`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw await readApiFailure(
      response,
      "Unable to verify the current user."
    );
  }

  const data = (await response.json()) as {
    user: AuthenticatedUser;
  };

  return data.user;
}

export async function getStaffQueueCategories(): Promise<
  Category[]
> {
  const response = await fetch(
    `${API_URL}/api/categories`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw await readApiFailure(
      response,
      "Unable to load Categories."
    );
  }

  return (await response.json()) as Category[];
}

export async function getStaffTicketQueue(
  query: StaffQueueQuery = {}
): Promise<StaffQueueResponse> {
  const params = new URLSearchParams();

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.categoryId) {
    params.set(
      "categoryId",
      String(query.categoryId)
    );
  }

  if (query.requestedPriority) {
    params.set(
      "requestedPriority",
      query.requestedPriority
    );
  }

  if (query.itPriority) {
    params.set(
      "itPriority",
      query.itPriority
    );
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.assignment) {
    params.set(
      "assignment",
      query.assignment
    );
  }

  if (query.ownerId) {
    params.set(
      "ownerId",
      String(query.ownerId)
    );
  }

  params.set(
    "sort",
    query.sort ?? "updatedAt"
  );

  params.set(
    "direction",
    query.direction ?? "desc"
  );

  params.set(
    "page",
    String(query.page ?? 1)
  );

  params.set(
    "pageSize",
    String(query.pageSize ?? 10)
  );

  const response = await fetch(
    `${API_URL}/api/staff/tickets?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw await readApiFailure(
      response,
      "Unable to load the IT Staff Ticket Queue."
    );
  }

  return (await response.json()) as StaffQueueResponse;
}