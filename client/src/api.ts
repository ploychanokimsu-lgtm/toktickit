const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ------------------------------------------------------------
// Lab 1 Types
// ------------------------------------------------------------

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// ------------------------------------------------------------
// Lab 2 Types
// ------------------------------------------------------------

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

// ------------------------------------------------------------
// Lab 1 API
// Check backend health and retrieve supported categories.
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

    const categoriesResponse = await fetch(`${API_URL}/api/categories`);

    if (!categoriesResponse.ok) {
      throw new Error();
    }

    const categories: Category[] = await categoriesResponse.json();

    return {
      online: true,
      categories,
    };
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
}

// ------------------------------------------------------------
// Lab 2 API
// Retrieve active Development Requesters.
// This is a temporary testing context, NOT authentication.
// ------------------------------------------------------------

export async function getDevelopmentRequesters(): Promise<
  DevelopmentRequester[]
> {
  const response = await fetch(`${API_URL}/api/requesters`);

  if (!response.ok) {
    throw new Error("Unable to load Development Requesters.");
  }

  const data: {
    requesters: DevelopmentRequester[];
  } = await response.json();

  return data.requesters;
}