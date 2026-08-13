const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

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