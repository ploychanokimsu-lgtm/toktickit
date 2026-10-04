import "@testing-library/jest-dom/vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ActionsTaken from "../../src/ActionsTaken.js";

const daniel = { id: 7, name: "Daniel Wilson", role: "IT_STAFF" as const };
const sarah = { id: 9, name: "Sarah Johnson", role: "IT_STAFF" as const };

function action(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    ticketId: 42,
    status: "COMPLETED",
    actionAt: "2026-10-03T03:00:00.000Z",
    completedAt: "2026-10-03T03:05:00.000Z",
    description: "Reinstalled the VPN client.",
    result: "Connection stable.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    performedBy: daniel,
    assignee: daniel,
    updatedBy: null,
    version: 1,
    canEdit: true,
    createdAt: "2026-10-03T03:05:00.000Z",
    updatedAt: "2026-10-03T03:05:00.000Z",
    ...overrides,
  };
}

function json(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

let items: ReturnType<typeof action>[];
let fetchMock: ReturnType<typeof vi.fn>;
let nextResponse: ((url: string, init: RequestInit) => Response | Promise<Response>) | null;

beforeEach(() => {
  items = [];
  nextResponse = null;

  fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? "GET";

    if (method !== "GET" && nextResponse) {
      return nextResponse(url, init);
    }

    if (method === "GET" && url.endsWith("/actions-taken")) {
      return json({ items });
    }

    const single = url.match(/actions-taken\/(\d+)$/);
    if (method === "GET" && single) {
      return json(items.find((item) => item.id === Number(single[1])));
    }

    if (method === "POST") {
      const body = JSON.parse(String(init.body));
      const created = action({
        id: 100 + items.length,
        ...body,
        performedBy: daniel,
        assignee: daniel,
      });
      items = [...items, created];
      return json(created, 201);
    }

    return json({ error: { code: "NOT_FOUND", message: "Not found." } }, 404);
  });

  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderStaff(props: Partial<Parameters<typeof ActionsTaken>[0]> = {}) {
  return render(
    <ActionsTaken
      ticketId={42}
      mode="staff"
      ticketStatus="IN_PROGRESS"
      currentUser={{ id: daniel.id, name: daniel.name }}
      staffMembers={[daniel, sarah]}
      {...props}
    />
  );
}

function postCalls() {
  return fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === "POST");
}

describe("Lab 4 Actions Taken section", () => {
  it("UI-01: lists actions oldest first with all summary fields and a Latest label", async () => {
    items = [
      action({ id: 1, description: "First visit", performedBy: daniel }),
      action({
        id: 2,
        actionAt: "2026-10-04T03:00:00.000Z",
        description: "Second visit",
        performedBy: sarah,
        followUpRequired: true,
        followUpNote: "Call back",
      }),
    ];

    renderStaff();

    expect(await screen.findByRole("heading", { name: "Actions Taken (2)" })).toBeInTheDocument();

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("First visit")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Second visit")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Sarah Johnson")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Latest")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Follow-up needed")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Completed")).toBeInTheDocument();
  });

  it("UI-02: shows the empty state", async () => {
    renderStaff();

    expect(
      await screen.findByText(/No actions recorded yet/)
    ).toBeInTheDocument();
  });

  it("UI-03: reveals a required Follow-up Note and validates it before sending", async () => {
    renderStaff();
    fireEvent.click(await screen.findByRole("button", { name: "Add Action" }));

    expect(screen.queryByLabelText(/Follow-up Note/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Action Description/), {
      target: { value: "Replaced toner" },
    });
    fireEvent.change(screen.getByLabelText(/^Result/), {
      target: { value: "Printed" },
    });
    fireEvent.click(screen.getByLabelText("Follow-Up Required?"));

    const note = screen.getByLabelText(/Follow-up Note/);
    expect(note).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(
      await screen.findByText("Follow-up Note is required when follow-up is needed.")
    ).toBeInTheDocument();
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(postCalls()).toHaveLength(0);
  });

  it("creates an action and refreshes the list", async () => {
    const onChanged = vi.fn();
    renderStaff({ onChanged });
    fireEvent.click(await screen.findByRole("button", { name: "Add Action" }));

    fireEvent.change(screen.getByLabelText(/Action Description/), {
      target: { value: "Reset the router" },
    });
    fireEvent.change(screen.getByLabelText(/^Result/), {
      target: { value: "Network restored" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByText("Action recorded.")).toBeInTheDocument();
    expect(await screen.findByText("Reset the router")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();

    const body = JSON.parse(String((postCalls()[0][1] as RequestInit).body));
    expect(body).toMatchObject({
      description: "Reset the router",
      result: "Network restored",
      status: "COMPLETED",
      assigneeId: daniel.id,
      followUpNote: null,
    });
    expect(body.clientRequestId).toEqual(expect.any(String));
    expect(body).not.toHaveProperty("performedById");
  });

  it("UI-04: disables Save while saving so a double click sends one request", async () => {
    let release: (value: Response) => void = () => undefined;
    nextResponse = () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      });

    renderStaff();
    fireEvent.click(await screen.findByRole("button", { name: "Add Action" }));
    fireEvent.change(screen.getByLabelText(/Action Description/), {
      target: { value: "Swap cable" },
    });
    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: "Fixed" } });

    const save = screen.getByRole("button", { name: "Save Action" });
    fireEvent.click(save);
    fireEvent.click(save);

    expect(await screen.findByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(postCalls()).toHaveLength(1);

    release(json(action({ id: 5 }), 201));
    await screen.findByText("Action recorded.");
  });

  it("UI-05: keeps entered values and shows server field errors after a failure", async () => {
    nextResponse = () =>
      json(
        {
          error: {
            code: "INVALID_ASSIGNEE",
            message: "The selected assignee is not an active IT Staff member.",
            details: { assigneeId: "Choose an active IT Staff member or Administrator." },
          },
        },
        400
      );

    renderStaff();
    fireEvent.click(await screen.findByRole("button", { name: "Add Action" }));
    fireEvent.change(screen.getByLabelText(/Action Description/), {
      target: { value: "Keep me" },
    });
    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: "Still here" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(
      await screen.findByText("Choose an active IT Staff member or Administrator.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Action Description/)).toHaveValue("Keep me");
    expect(screen.getByLabelText(/^Result/)).toHaveValue("Still here");
  });

  it("UI-06: shows a conflict on stale edit, keeps edits, and reloads the latest version", async () => {
    items = [action({ id: 1, version: 1 })];
    nextResponse = () =>
      json(
        {
          error: {
            code: "ACTION_TAKEN_CHANGED",
            message: "This Action Taken was changed by another user. Reload and try again.",
          },
        },
        409
      );

    renderStaff();
    fireEvent.click(await screen.findByRole("button", { name: /View action/ }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: "My edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByText(/changed by someone else/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Result/)).toHaveValue("My edit");

    const patch = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "PATCH"
    );
    expect(JSON.parse(String((patch![1] as RequestInit).body)).version).toBe(1);

    items = [action({ id: 1, version: 2, result: "Their edit" })];
    nextResponse = null;
    fireEvent.click(screen.getByRole("button", { name: "Reload latest" }));

    await waitFor(() =>
      expect(screen.getByLabelText(/^Result/)).toHaveValue("Their edit")
    );
  });

  it("UI-07: Requester mode is read-only", async () => {
    items = [action({ id: 1 })];

    render(<ActionsTaken ticketId={42} mode="requester" ticketStatus="IN_PROGRESS" />);

    expect(await screen.findByText("Reinstalled the VPN client.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Action" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /View action/ }));

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/tickets/42/actions-taken");
  });

  it("shows the Requester empty state", async () => {
    render(<ActionsTaken ticketId={42} mode="requester" ticketStatus="NEW" />);

    expect(
      await screen.findByText("IT Staff have not recorded any actions yet.")
    ).toBeInTheDocument();
  });

  it("UI-08: shows Edit only when the backend allows it", async () => {
    items = [action({ id: 1, canEdit: false })];

    renderStaff();
    fireEvent.click(await screen.findByRole("button", { name: /View action/ }));

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("hides write controls on a Closed Ticket", async () => {
    items = [action({ id: 1 })];

    renderStaff({ ticketStatus: "CLOSED" });

    expect(await screen.findByText(/Actions Taken are read-only/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Action" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /View action/ }));
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("completes a planned action through Mark Completed", async () => {
    items = [action({ id: 3, status: "PLANNED", result: null, completedAt: null })];
    nextResponse = (_url, init) => {
      const body = JSON.parse(String(init.body));
      return json(action({ id: 3, version: 2, ...body }));
    };

    renderStaff();
    fireEvent.click(await screen.findByRole("button", { name: /View action/ }));
    fireEvent.click(screen.getByRole("button", { name: "Mark Completed" }));

    expect(screen.getByLabelText("Status")).toHaveValue("COMPLETED");

    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    expect(
      await screen.findByText("Result is required for completed work.")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Result/), { target: { value: "Done" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByText("Action updated.")).toBeInTheDocument();
  });

  it("cancels a planned action after confirmation", async () => {
    items = [action({ id: 4, status: "PLANNED", result: null })];
    nextResponse = () => json(action({ id: 4, status: "CANCELLED", canEdit: false, version: 2 }));

    renderStaff();
    fireEvent.click(await screen.findByRole("button", { name: /View action/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Action" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel action" }));

    expect(await screen.findByText("Action cancelled.")).toBeInTheDocument();
    expect(
      JSON.parse(
        String(
          (fetchMock.mock.calls.find(([, i]) => (i as RequestInit)?.method === "PATCH")![1] as RequestInit)
            .body
        )
      )
    ).toEqual({ version: 1, status: "CANCELLED" });
  });

  it("shows a safe load error with Retry", async () => {
    fetchMock.mockImplementationOnce(async () =>
      json({ error: { code: "INTERNAL_ERROR", message: "Actions Taken could not be loaded." } }, 500)
    );

    renderStaff();

    expect(await screen.findByText("Actions Taken could not be loaded.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/No actions recorded yet/)).toBeInTheDocument();
  });

  it("A11Y-01: labels every form control and links errors with aria-describedby", async () => {
    renderStaff();
    fireEvent.click(await screen.findByRole("button", { name: "Add Action" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    const description = screen.getByLabelText(/Action Description/);
    const error = await screen.findByText("Action Description is required.");

    expect(description.getAttribute("aria-describedby")).toContain(error.id);
    expect(description).toHaveFocus();

    for (const label of ["Status", /Action Date\/Time/, "Assignee", /^Result/, "Attachment Notes"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });
});
