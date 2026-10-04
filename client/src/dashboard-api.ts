// Lab 4 dashboard API client (Issues #59 and #60).

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.MODE === "test" ? "" : "http://localhost:3000");

export interface DrillDown {
  screen: "my-tickets" | "staff-queue" | "user-management";
  query: Record<string, string>;
}

export interface DashboardMetric {
  key: string;
  label: string;
  count: number;
  drillDown: DrillDown | null;
}

export interface DashboardTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  updatedAt: string;
  itPriority?: string;
  owner?: { id: number; name: string } | null;
}

export interface RequesterDashboardData {
  generatedAt: string;
  timeZone: string;
  metrics: DashboardMetric[];
  recentlyUpdated: DashboardTicket[];
  recentlyResolved: DashboardTicket[];
}

export class DashboardError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function fetchDashboard<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new DashboardError(
      0,
      "The server could not be reached. Check your connection and try again."
    );
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new DashboardError(
      response.status,
      body?.error?.message ?? "The dashboard could not be loaded."
    );
  }

  return body as T;
}

export function getRequesterDashboard(): Promise<RequesterDashboardData> {
  return fetchDashboard<RequesterDashboardData>("/api/dashboard/requester");
}

export interface StaffDashboardData {
  generatedAt: string;
  timeZone: string;
  metrics: DashboardMetric[];
  byStatus: { status: string; count: number; drillDown: DrillDown }[];
  byItPriority: { itPriority: string; count: number; drillDown: DrillDown }[];
  urgent: DashboardTicket[];
  recentlyUpdated: DashboardTicket[];
  usersByRole: { REQUESTER: number; IT_STAFF: number; ADMINISTRATOR: number } | null;
}

export function getStaffDashboard(): Promise<StaffDashboardData> {
  return fetchDashboard<StaffDashboardData>("/api/dashboard/staff");
}
