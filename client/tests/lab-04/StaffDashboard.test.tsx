import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import StaffDashboard from "../../src/StaffDashboard.js";
import StaffTicketQueue from "../../src/StaffTicketQueue.js";

const ACTIVE = "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED";
const STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

function json(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

function dashboard(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: "2026-10-04T03:00:00.000Z",
    timeZone: "Asia/Bangkok",
    metrics: [
      {
        key: "unassigned",
        label: "Unassigned",
        count: 4,
        drillDown: {
          screen: "staff-queue",
          query: { assignment: "unassigned", status: ACTIVE },
        },
      },
      {
        key: "myAssigned",
        label: "My Assigned",
        count: 6,
        drillDown: { screen: "staff-queue", query: { assignment: "mine", status: ACTIVE } },
      },
      { key: "myActionsLast7Days", label: "My Actions (7 days)", count: 9, drillDown: null },
    ],
    byStatus: STATUSES.map((status, index) => ({
      status,
      count: index,
      drillDown: { screen: "staff-queue", query: { status } },
    })),
    byItPriority: ["LOW", "MEDIUM", "HIGH"].map((itPriority, index) => ({
      itPriority,
      count: index + 1,
      drillDown: { screen: "staff-queue", query: { itPriority, status: ACTIVE } },
    })),
    urgent: [
      {
        id: 11,
        ticketNumber: "TKT-2026-000011",
        summary: "No network in the exam hall",
        currentStatus: "OPEN",
        itPriority: "HIGH",
        owner: null,
        updatedAt: "2026-10-02T03:00:00.000Z",
      },
    ],
    recentlyUpdated: [],
    usersByRole: null,
    ...overrides,
  };
}

let body: unknown;
let status: number;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  body = dashboard();
  status = 200;
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/api/dashboard/staff")) {
      return json(body, status);
    }

    if (url.includes("/api/staff/tickets?")) {
      return json({
        tickets: [],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    }

    if (url.includes("/api/categories")) {
      return json([]);
    }

    return json({ error: { message: "Not found." } }, 404);
  });

  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderDashboard(overrides: Partial<Parameters<typeof StaffDashboard>[0]> = {}) {
  const props = {
    userName: "Daniel Wilson",
    isAdministrator: false,
    onDrillDown: vi.fn(),
    onOpenTicket: vi.fn(),
    onOpenQueue: vi.fn(),
    onOpenUsers: vi.fn(),
    ...overrides,
  };

  render(<StaffDashboard {...props} />);
  return props;
}

describe("Lab 4 IT Staff Dashboard", () => {
  it("UI-17: shows metric cards, breakdowns and Ticket lists", async () => {
    const props = renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Welcome back, Daniel Wilson!" })
    ).toBeInTheDocument();

    for (const [label, value] of [
      ["Unassigned", "4"],
      ["My Assigned", "6"],
      ["My Actions (7 days)", "9"],
    ]) {
      expect(
        within(screen.getByRole("region", { name: label })).getByText(value)
      ).toBeInTheDocument();
    }

    expect(screen.getByText("Needs an owner")).toBeInTheDocument();

    const byStatus = screen.getByRole("region", { name: "Tickets by Status" });
    expect(within(byStatus).getAllByRole("button")).toHaveLength(8);

    const urgent = screen.getByRole("region", {
      name: "Urgent (High IT Priority, oldest first)",
    });
    expect(within(urgent).getByText("Unassigned")).toBeInTheDocument();
    expect(within(urgent).getByText(/Updated/)).toBeInTheDocument();

    fireEvent.click(within(urgent).getByRole("button", { name: "TKT-2026-000011" }));
    expect(props.onOpenTicket).toHaveBeenCalledWith(11);

    expect(screen.getByText("No Tickets yet.")).toBeInTheDocument();
  });

  it("UI-17: drill-downs pass the documented queue filters", async () => {
    const props = renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: "View in queue: Unassigned" }));
    fireEvent.click(screen.getByRole("button", { name: /^Resolved: 4\./ }));
    fireEvent.click(screen.getByRole("button", { name: /^High: 3\./ }));
    fireEvent.click(screen.getByRole("button", { name: "My Queue" }));

    expect(vi.mocked(props.onDrillDown).mock.calls).toEqual([
      [{ assignment: "unassigned", status: ACTIVE }],
      [{ status: "RESOLVED" }],
      [{ itPriority: "HIGH", status: ACTIVE }],
      [{ assignment: "mine" }],
    ]);

    // A count without a drill-down has no link.
    expect(
      within(screen.getByRole("region", { name: "My Actions (7 days)" })).queryByRole("button")
    ).not.toBeInTheDocument();
  });

  it("UI-18: Administrators see active user counts; IT Staff do not", async () => {
    body = dashboard({ usersByRole: { REQUESTER: 5, IT_STAFF: 4, ADMINISTRATOR: 1 } });
    const props = renderDashboard({ isAdministrator: true, userName: "Alex Thompson" });

    const users = await screen.findByRole("region", { name: "Active Users" });
    expect(within(users).getByText("5")).toBeInTheDocument();

    fireEvent.click(within(users).getByRole("button", { name: /Manage users/ }));
    expect(props.onOpenUsers).toHaveBeenCalled();
  });

  it("UI-18: IT Staff do not see the Active Users card", async () => {
    renderDashboard();

    await screen.findByRole("region", { name: "Unassigned" });
    expect(screen.queryByRole("region", { name: "Active Users" })).not.toBeInTheDocument();
  });

  it("UI-19: shows loading, then a safe error with Retry", async () => {
    status = 500;
    body = { error: { message: "The dashboard could not be loaded." } };

    renderDashboard();

    expect(screen.getByRole("status")).toHaveTextContent("Loading the dashboard...");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The dashboard could not be loaded."
    );

    status = 200;
    body = dashboard();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("region", { name: "Unassigned" })).toBeInTheDocument();
  });

  it("UI-19: shows a forbidden message on 403", async () => {
    status = 403;
    body = { error: { message: "You do not have permission to view this dashboard." } };

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have access to the IT Staff dashboard."
    );
  });

  it("UI-19: shows empty messages when there is nothing to list", async () => {
    body = dashboard({ urgent: [], recentlyUpdated: [] });

    renderDashboard();

    expect(await screen.findByText("No active High priority Tickets.")).toBeInTheDocument();
    expect(screen.getByText("No Tickets yet.")).toBeInTheDocument();
  });

  it("FR-22: the Ticket Queue starts with drill-down filters applied", async () => {
    render(
      <StaffTicketQueue
        onOpenTicket={() => undefined}
        initialFilters={{ assignment: "unassigned", status: ACTIVE }}
      />
    );

    expect(await screen.findByLabelText("Status")).toHaveValue(ACTIVE);
    expect(screen.getByRole("option", { name: "Open (all active)" })).toBeInTheDocument();

    const queueCall = fetchMock.mock.calls
      .map(([input]) => String(input))
      .find((url) => url.includes("/api/staff/tickets?"));

    expect(queueCall).toContain(`status=${encodeURIComponent(ACTIVE)}`);
    expect(queueCall).toContain("assignment=unassigned");
  });
});
