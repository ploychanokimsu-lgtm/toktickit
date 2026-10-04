// Lab 4 Actions Taken API client (Issue #57).

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.MODE === "test" ? "" : "http://localhost:3000");

export type ActionTakenStatus = "PLANNED" | "COMPLETED" | "CANCELLED";

export interface ActionUser {
  id: number;
  name: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
}

export interface ActionTaken {
  id: number;
  ticketId: number;
  status: ActionTakenStatus;
  actionAt: string;
  completedAt: string | null;
  description: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  performedBy: ActionUser;
  assignee: ActionUser | null;
  createdAt: string;
  updatedAt: string;
  // Staff representation only.
  updatedBy?: ActionUser | null;
  version?: number;
  canEdit?: boolean;
}

export interface ActionTakenFields {
  status: ActionTakenStatus;
  actionAt: string;
  description: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  assigneeId: number | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, string> = {}
  ) {
    super(message);
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "The server could not be reached. Check your connection and try again."
    );
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "The request could not be completed.",
      body?.error?.details ?? {}
    );
  }

  return body as T;
}

export async function listStaffActionsTaken(
  ticketId: number
): Promise<ActionTaken[]> {
  const body = await requestJson<{ items: ActionTaken[] }>(
    `/api/staff/tickets/${ticketId}/actions-taken`
  );

  return body.items;
}

export async function getStaffActionTaken(
  ticketId: number,
  actionId: number
): Promise<ActionTaken> {
  return requestJson<ActionTaken>(
    `/api/staff/tickets/${ticketId}/actions-taken/${actionId}`
  );
}

export async function listRequesterActionsTaken(
  ticketId: number
): Promise<ActionTaken[]> {
  const body = await requestJson<{ items: ActionTaken[] }>(
    `/api/tickets/${ticketId}/actions-taken`
  );

  return body.items;
}

export async function createActionTaken(
  ticketId: number,
  fields: ActionTakenFields,
  clientRequestId: string
): Promise<ActionTaken> {
  return requestJson<ActionTaken>(
    `/api/staff/tickets/${ticketId}/actions-taken`,
    {
      method: "POST",
      body: JSON.stringify({ ...fields, clientRequestId }),
    }
  );
}

export async function updateActionTaken(
  ticketId: number,
  actionId: number,
  version: number,
  fields: Partial<ActionTakenFields>
): Promise<ActionTaken> {
  return requestJson<ActionTaken>(
    `/api/staff/tickets/${ticketId}/actions-taken/${actionId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ version, ...fields }),
    }
  );
}
