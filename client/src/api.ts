const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ------------------------------------------------------------
// Shared Types
// ------------------------------------------------------------

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

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";

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
  clientSubmissionId?: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
  currentStatus: "NEW";
  createdAt: string;
  updatedAt: string;
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = (await response.json()) as ApiErrorResponse;

    return data.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

// ------------------------------------------------------------
// Lab 1 System Check
// ------------------------------------------------------------

export async function checkSystem(): Promise<SystemStatus> {
  try {
    const healthResponse = await fetch(`${API_URL}/api/health`);

    if (!healthResponse.ok) {
      throw new Error();
    }

    const health = await healthResponse.json();

    if (health.status !== "ok") {
      throw new Error();
    }

    const categoriesResponse = await fetch(
      `${API_URL}/api/categories`
    );

    if (!categoriesResponse.ok) {
      throw new Error();
    }

    const categories: Category[] =
      await categoriesResponse.json();

    return {
      online: true,
      categories,
    };
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
}

// ------------------------------------------------------------
// Development Requesters
// ------------------------------------------------------------

export async function getDevelopmentRequesters(): Promise<
  DevelopmentRequester[]
> {
  const response = await fetch(`${API_URL}/api/requesters`);

  if (!response.ok) {
    throw new Error(
      "Unable to load Development Requesters."
    );
  }

  const data: {
    requesters: DevelopmentRequester[];
  } = await response.json();

  return data.requesters;
}

// ------------------------------------------------------------
// Categories
// ------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/api/categories`);

  if (!response.ok) {
    throw new Error("Unable to load Categories.");
  }

  return (await response.json()) as Category[];
}

// ------------------------------------------------------------
// Related Systems
// ------------------------------------------------------------

export async function getRelatedSystems(): Promise<
  RelatedSystem[]
> {
  const response = await fetch(
    `${API_URL}/api/related-systems`
  );

  if (!response.ok) {
    throw new Error("Unable to load Related Systems.");
  }

  const data: {
    relatedSystems: RelatedSystem[];
  } = await response.json();

  return data.relatedSystems;
}

// ------------------------------------------------------------
// Create Ticket
// ------------------------------------------------------------

export async function createTicket(
  payload: CreateTicketRequest
): Promise<CreatedTicket> {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      "The Ticket could not be created. Please try again."
    );

    throw new Error(message);
  }

  const data: {
    ticket: CreatedTicket;
  } = await response.json();

  return data.ticket;
}