import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../src/App.js";
import RequesterDashboard from "../../src/RequesterDashboard.js";

const ACTIVE = "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED";

function json(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

function dashboard(overrides: Record<string, unknown> = {}) {
  const metric = (key: string, label: string, count: number, status: string) => ({
    key,
    label,
    count,
    drillDown: { screen: "my-tickets", query: { status } },
  });

  return {
    generatedAt: "2026-10-04T03:00:00.000Z",
    timeZone: "Asia/Bangkok",
    metrics: [
      metric("openTickets", "My Open Tickets", 3, ACTIVE),
      metric("waitingForMe", "Waiting for Me", 1, "WAITING_FOR_REQUESTER"),
      metric("resolved", "Resolved", 5, "RESOLVED"),
      metric("closed", "Closed", 12, "CLOSED"),
    ],
    recentlyUpdated: [
      {
        id: 7,
        ticketNumber: "TKT-2026-000007",
        summary: "Laptop battery drains quickly",
        currentStatus: "IN_PROGRESS",
        updatedAt: "2026-10-04T02:00:00.000Z",
      },
    ],
    recentlyResolved: [],
    ...overrides,
  };
}

let dashboardBody: unknown;
let dashboardStatus: number;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  dashboardBody = dashboard();
  dashboardStatus = 200;

  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/api/dashboard/requester")) {
      return json(dashboardBody, dashboardStatus);
    }

    if (url.endsWith("/api/categories")) {
      return json([{ id: 1, name: "Hardware" }]);
    }

    if (url.endsWith("/api/related-systems")) {
      return json({ relatedSystems: [{ id: 1, name: "Corporate Laptop" }] });
    }

    if (url.includes("/api/tickets?")) {
      return json({
        tickets: [
          {
            id: 7,
            ticketNumber: "TKT-2026-000007",
            requesterId: 1,
            categoryId: 1,
            relatedSystemId: 1,
            summary: "Laptop battery drains quickly",
            requestedPriority: "HIGH",
            currentStatus: "WAITING_FOR_REQUESTER",
            category: { id: 1, name: "Hardware" },
            relatedSystem: { id: 1, name: "Corporate Laptop" },
            createdAt: "2026-10-01T02:00:00.000Z",
            updatedAt: "2026-10-04T02:00:00.000Z",
          },
        ],
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      });
    }

    return json({ error: { message: "Not found." } }, 404);
  });

  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderDashboard(handlers: Partial<Parameters<typeof RequesterDashboard>[0]> = {}) {
  const props = {
    requesterName: "Jennifer Anderson",
    onDrillDown: vi.fn(),
    onOpenTicket: vi.fn(),
    onCreateTicket: vi.fn(),
    onViewMyTickets: vi.fn(),
    ...handlers,
  };

  render(<RequesterDashboard {...props} />);
  return props;
}

describe("Lab 4 Requester Dashboard", () => {
  it("UI-13: shows metric cards, recent Tickets and quick actions", async () => {
    const props = renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Welcome, Jennifer Anderson!" })
    ).toBeInTheDocument();

    for (const [label, value] of [
      ["My Open Tickets", "3"],
      ["Waiting for Me", "1"],
      ["Resolved", "5"],
      ["Closed", "12"],
    ]) {
      const card = screen.getByRole("region", { name: label });
      expect(within(card).getByText(value)).toBeInTheDocument();
    }

    // Attention is shown with text, not only colour.
    expect(screen.getByText("Needs your reply")).toBeInTheDocument();

    const recent = screen.getByRole("region", { name: "Recently Updated" });
    expect(within(recent).getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(within(recent).getByText("In Progress")).toBeInTheDocument();

    fireEvent.click(within(recent).getByRole("button", { name: "TKT-2026-000007" }));
    expect(props.onOpenTicket).toHaveBeenCalledWith(7);

    fireEvent.click(screen.getByRole("button", { name: "Create Ticket" }));
    expect(props.onCreateTicket).toHaveBeenCalled();
  });

  it("UI-14: shows zeros and empty messages", async () => {
    dashboardBody = dashboard({
      metrics: dashboard().metrics.map((metric) => ({ ...metric, count: 0 })),
      recentlyUpdated: [],
      recentlyResolved: [],
    });

    renderDashboard();

    expect(
      await screen.findByText("No tickets updated in the last 7 days.")
    ).toBeInTheDocument();
    expect(screen.getByText("No recently resolved tickets.")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(4);
    expect(screen.queryByText("Needs your reply")).not.toBeInTheDocument();
  });

  it("UI-15: shows loading, then a safe error with Retry", async () => {
    dashboardStatus = 500;
    dashboardBody = { error: { message: "The dashboard could not be loaded." } };

    renderDashboard();

    expect(screen.getByRole("status")).toHaveTextContent("Loading your dashboard...");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The dashboard could not be loaded."
    );

    dashboardStatus = 200;
    dashboardBody = dashboard();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("region", { name: "My Open Tickets" })).toBeInTheDocument();
  });

  it("UI-16: each View all link drills down with the metric's statuses", async () => {
    const props = renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: "View all: Waiting for Me" }));
    fireEvent.click(screen.getByRole("button", { name: "View all: My Open Tickets" }));

    expect(props.onDrillDown).toHaveBeenNthCalledWith(1, "WAITING_FOR_REQUESTER");
    expect(props.onDrillDown).toHaveBeenNthCalledWith(2, ACTIVE);
  });

  it("FR-20/FR-21: a signed-in Requester lands on the Dashboard and drills into filtered My Tickets", async () => {
    render(
      <App
        authenticatedRequester={{
          id: 1,
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
        }}
        onLogout={async () => undefined}
      />
    );

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getByRole("button", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    fireEvent.click(await screen.findByRole("button", { name: "View all: Waiting for Me" }));

    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("WAITING_FOR_REQUESTER");

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("status=WAITING_FOR_REQUESTER")
        )
      ).toBe(true)
    );

    // The list shows the real status rather than a fixed "New" badge.
    expect((await screen.findAllByText("Waiting For Requester")).length).toBeGreaterThan(0);
    expect(within(nav).getByRole("button", { name: "My Tickets" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
