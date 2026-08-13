const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 — check whether the TokTickIT API is online.
// Issue 4 will later extend this function to also fetch /api/categories.
export async function checkSystem(): Promise<SystemStatus> {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const data = await response.json();

  if (data.status !== "ok") {
    throw new Error("TokTickIT API returned an invalid status");
  }

  return {
    online: true,
    categories: [],
  };
}