import type {
  AuthenticatedRole,
} from "./auth-api.js";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000";

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: AuthenticatedRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface UserFilters {
  search?: string;
  role?: AuthenticatedRole | "";
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: AuthenticatedRole;
  isActive: boolean;
  initialPassword: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: AuthenticatedRole;
  isActive?: boolean;
}

interface ApiErrorBody {
  error?:
    | string
    | {
        code?: string;
        message?: string;
      };
  message?: string;
}

async function failureMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const body = (await response
    .json()
    .catch(() => null)) as ApiErrorBody | null;

  if (body?.message) {
    return body.message;
  }

  if (
    typeof body?.error === "object" &&
    body.error?.message
  ) {
    return body.error.message;
  }

  return fallback;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  fallback = "The request could not be completed."
): Promise<T> {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
        ...options.headers,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      await failureMessage(
        response,
        fallback
      )
    );
  }

  return (await response.json()) as T;
}

export async function listUsers(
  filters: UserFilters = {}
): Promise<ManagedUser[]> {
  const query =
    new URLSearchParams();

  const search =
    filters.search?.trim();

  if (search) {
    query.set("search", search);
  }

  if (filters.role) {
    query.set("role", filters.role);
  }

  const suffix =
    query.size > 0
      ? `?${query.toString()}`
      : "";

  const body = await request<{
    items: ManagedUser[];
  }>(
    `/api/admin/users${suffix}`,
    {},
    "Unable to load users."
  );

  return body.items;
}

export async function createUser(
  input: CreateUserInput
): Promise<ManagedUser> {
  const body = await request<{
    user: ManagedUser;
  }>(
    "/api/admin/users",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    "Unable to create the user."
  );

  return body.user;
}

export async function updateUser(
  userId: number,
  input: UpdateUserInput
): Promise<ManagedUser> {
  const body = await request<{
    user: ManagedUser;
  }>(
    `/api/admin/users/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
    "Unable to update the user."
  );

  return body.user;
}

export async function setInitialPassword(
  userId: number,
  initialPassword: string
): Promise<string> {
  const body = await request<{
    message: string;
    mustChangePassword: boolean;
  }>(
    `/api/admin/users/${userId}/initial-password`,
    {
      method: "POST",
      body: JSON.stringify({
        initialPassword,
      }),
    },
    "Unable to set the initial password."
  );

  return body.message;
}
