const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000";

export type AuthenticatedRole =
  | "REQUESTER"
  | "IT_STAFF"
  | "ADMINISTRATOR";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: AuthenticatedRole;
  mustChangePassword: boolean;
}

interface LoginResponse {
  user: SessionUser;
  requiresPasswordChange: boolean;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

async function failureMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const body = (await response
    .json()
    .catch(() => null)) as ApiErrorBody | null;

  return body?.error?.message ?? fallback;
}

export async function getSessionUser():
  Promise<SessionUser | null> {
  const response = await fetch(
    `${API_URL}/api/auth/me`,
    {
      credentials: "include",
    }
  );

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      await failureMessage(
        response,
        "Unable to check your session."
      )
    );
  }

  const body = (await response.json()) as {
    user: SessionUser;
  };

  return body.user;
}

export async function signIn(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await failureMessage(
        response,
        "Unable to sign in."
      )
    );
  }

  return (await response.json()) as LoginResponse;
}

export async function signOut(): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/auth/logout`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      await failureMessage(
        response,
        "Unable to sign out."
      )
    );
  }
}

export async function changeInitialPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/auth/change-password`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await failureMessage(
        response,
        "Unable to change your password."
      )
    );
  }
}
