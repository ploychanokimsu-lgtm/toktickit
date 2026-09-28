const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000";

export interface RequesterPublicComment {
  id: number;
  ticketId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role:
      | "REQUESTER"
      | "IT_STAFF"
      | "ADMINISTRATOR";
  };
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
    .catch(() => null)) as
    | ApiErrorBody
    | null;

  return (
    body?.error?.message ??
    fallback
  );
}

export async function getRequesterComments(
  ticketId: number
): Promise<RequesterPublicComment[]> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/comments`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      await failureMessage(
        response,
        "Unable to load Public Comments."
      )
    );
  }

  const body = (await response.json()) as {
    comments: RequesterPublicComment[];
  };

  return body.comments;
}

export async function addRequesterComment(
  ticketId: number,
  content: string
): Promise<RequesterPublicComment> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/comments`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        content,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await failureMessage(
        response,
        "The Public Comment could not be added."
      )
    );
  }

  const body = (await response.json()) as {
    comment: RequesterPublicComment;
  };

  return body.comment;
}

export async function indicateProblemResolved(
  ticketId: number
): Promise<string> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/problem-appears-resolved`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      await failureMessage(
        response,
        "The resolution indication could not be recorded."
      )
    );
  }

  const body = (await response.json()) as {
    requesterResolutionIndicatedAt:
      string;
  };

  return body
    .requesterResolutionIndicatedAt;
}
