import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TicketWorkflowControl from "../../src/TicketWorkflowControl.js";

function json(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

let workflow: Record<string, unknown>;
let patchResponse: (body: Record<string, string>) => Response;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  workflow = {
    currentStatus: "IN_PROGRESS",
    allowedNextStatuses: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    resolutionGate: { satisfied: true, unmet: [] },
    requesterResolutionIndicatedAt: null,
  };
  patchResponse = (body) => json({ ticket: { id: 42, currentStatus: body.status } });

  fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);

    if (url === "/api/staff/tickets/42/workflow") {
      return json(workflow);
    }

    if (url === "/api/staff/tickets/42/status" && init.method === "PATCH") {
      return patchResponse(JSON.parse(String(init.body)));
    }

    return json({ error: { message: "Not found." } }, 404);
  });

  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderControl(onChanged = vi.fn(), currentStatus = "IN_PROGRESS") {
  render(
    <TicketWorkflowControl
      ticketId={42}
      currentStatus={currentStatus}
      refreshKey="2026-10-04T00:00:00.000Z"
      onChanged={onChanged}
    />
  );

  return onChanged;
}

function patchBodies() {
  return fetchMock.mock.calls
    .filter(([, init]) => (init as RequestInit)?.method === "PATCH")
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

async function optionLabels() {
  const select = await screen.findByLabelText("Status");
  await waitFor(() => expect(select).toBeEnabled());
  return within(select)
    .getAllByRole("option")
    .map((option) => option.textContent);
}

describe("Lab 4 Ticket workflow control", () => {
  it("UI-09: lists only the current status and permitted next statuses", async () => {
    renderControl();

    expect(await optionLabels()).toEqual([
      "In Progress (current)",
      "Waiting For Requester",
      "Resolved",
      "Cancelled",
    ]);
  });

  it("UI-10: disables Resolved and explains each unmet gate condition", async () => {
    workflow.resolutionGate = {
      satisfied: false,
      unmet: ["NO_ACTIONS_TAKEN", "PLANNED_ACTIONS_REMAIN"],
    };

    renderControl();
    await optionLabels();

    const resolved = screen.getByRole("option", { name: /Resolved/ });
    expect(resolved).toBeDisabled();
    expect(resolved).toHaveTextContent("not available yet");

    expect(screen.getByText("Record at least one completed Action Taken.")).toBeInTheDocument();
    expect(
      screen.getByText("Complete or cancel the planned Actions Taken.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveAttribute(
      "aria-describedby",
      "workflow-gate"
    );
  });

  it("UI-11: sends the expected status and refreshes the Ticket after a change", async () => {
    const onChanged = renderControl();
    await optionLabels();

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "WAITING_FOR_REQUESTER" },
    });

    expect(
      await screen.findByText("Status changed to Waiting For Requester.")
    ).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
    expect(patchBodies()).toEqual([
      { status: "WAITING_FOR_REQUESTER", expectedStatus: "IN_PROGRESS" },
    ]);
  });

  it("UI-12: shows a reload message when another user changed the Ticket", async () => {
    patchResponse = () =>
      json(
        {
          error: {
            code: "TICKET_CHANGED",
            message: "The Ticket was changed by another user. Reload and try again.",
          },
        },
        409
      );

    const onChanged = renderControl();
    await optionLabels();

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "WAITING_FOR_REQUESTER" },
    });

    expect(await screen.findByText(/updated by someone else/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onChanged).toHaveBeenCalled();
  });

  it("shows the gate error if the backend rejects resolution", async () => {
    patchResponse = () =>
      json(
        {
          error: {
            code: "RESOLUTION_GATE_NOT_MET",
            message: "This Ticket cannot be resolved yet.",
          },
        },
        409
      );

    renderControl();
    await optionLabels();

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "RESOLVED" } });

    expect(await screen.findByText("This Ticket cannot be resolved yet.")).toBeInTheDocument();
  });

  it("asks for confirmation before cancelling and can be dismissed with Escape", async () => {
    renderControl();
    await optionLabels();

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "CANCELLED" } });

    const dialog = screen.getByRole("dialog", { name: "Change status to Cancelled?" });
    expect(within(dialog).getByRole("button", { name: "Keep current status" })).toHaveFocus();
    expect(patchBodies()).toHaveLength(0);

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveFocus();
    expect(patchBodies()).toHaveLength(0);
  });

  it("changes the status after confirming", async () => {
    const onChanged = renderControl();
    await optionLabels();

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "CANCELLED" } });
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancelled" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(patchBodies()).toEqual([{ status: "CANCELLED", expectedStatus: "IN_PROGRESS" }]);
  });

  it("keeps keyboard focus inside the dialog", async () => {
    renderControl();
    await optionLabels();

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "CANCELLED" } });

    const dialog = screen.getByRole("dialog");
    const keep = within(dialog).getByRole("button", { name: "Keep current status" });
    const confirm = within(dialog).getByRole("button", { name: "Yes, cancelled" });

    confirm.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(keep).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
  });

  it("shows the Requester's advisory resolution indication", async () => {
    workflow.requesterResolutionIndicatedAt = "2026-10-04T02:00:00.000Z";

    renderControl();

    expect(
      await screen.findByText("Requester says problem appears resolved")
    ).toBeInTheDocument();
  });

  it("explains when no further changes are allowed", async () => {
    workflow = {
      ...workflow,
      currentStatus: "CLOSED",
      allowedNextStatuses: [],
    };

    renderControl(vi.fn(), "CLOSED");

    expect(
      await screen.findByText("No further status changes are allowed.")
    ).toBeInTheDocument();
  });

  it("shows a safe error with Retry when the workflow cannot load", async () => {
    fetchMock.mockImplementationOnce(async () =>
      json({ error: { message: "The Ticket workflow could not be loaded." } }, 500)
    );

    renderControl();

    expect(
      await screen.findByText("The Ticket workflow could not be loaded.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await optionLabels()).toContain("Resolved");
  });
});
