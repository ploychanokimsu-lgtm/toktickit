import "@testing-library/jest-dom/vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import StaffTicketDetail from "../../src/StaffTicketDetail.js";

const staff = {
  id: 7,
  name: "Daniel Wilson",
  email: "daniel.wilson@example.com",
  role: "IT_STAFF",
};

const administrator = {
  id: 8,
  name: "Alex Thompson",
  email: "admin@example.com",
  role: "ADMINISTRATOR",
};

let ticket: any;
let fetchMock: ReturnType<typeof vi.fn>;

function response(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  ticket = {
    id: 42,
    ticketNumber: "INC-000042",
    summary: "Unable to access email",
    description:
      "The requester cannot access their mailbox.",
    requestedPriority: "HIGH",
    itPriority: "MEDIUM",
    currentStatus: "NEW",
    createdAt: "2026-09-24T08:00:00.000Z",
    updatedAt: "2026-09-24T08:00:00.000Z",
    requester: {
      id: 2,
      name: "Test Requester",
      email: "requester@example.com",
      role: "REQUESTER",
    },
    owner: null,
    category: {
      id: 1,
      name: "Access",
    },
    relatedSystem: {
      id: 1,
      name: "Email",
    },
    attachments: [],
    publicComments: [],
    internalNotes: [],
  };

  fetchMock = vi.fn(
    async (
      input: RequestInfo | URL,
      options: RequestInit = {}
    ) => {
      const url = String(input);
      const method =
        options.method?.toUpperCase() ?? "GET";

      if (
        url ===
          "/api/staff/tickets/staff-members" &&
        method === "GET"
      ) {
        return response({
          staffMembers: [
            staff,
            administrator,
          ],
        });
      }

      if (
        url === "/api/staff/tickets/42" &&
        method === "GET"
      ) {
        return response({
          ticket: {
            ...ticket,
          },
        });
      }

      if (
        url ===
          "/api/staff/tickets/42/claim" &&
        method === "POST"
      ) {
        ticket.owner = staff;

        return response({
          ticket: {
            id: 42,
            ownerId: staff.id,
            owner: staff,
          },
        });
      }

      if (
        url ===
          "/api/staff/tickets/42/assignment" &&
        method === "PATCH"
      ) {
        const body = JSON.parse(
          String(options.body)
        );

        ticket.owner =
          body.ownerId === administrator.id
            ? administrator
            : staff;

        return response({
          ticket: {
            id: 42,
            ownerId: ticket.owner.id,
            owner: ticket.owner,
          },
        });
      }

      if (
        url ===
          "/api/staff/tickets/42/priority" &&
        method === "PATCH"
      ) {
        const body = JSON.parse(
          String(options.body)
        );

        ticket.itPriority = body.itPriority;

        return response({
          ticket: {
            id: 42,
            itPriority: ticket.itPriority,
          },
        });
      }

      if (
        url ===
          "/api/staff/tickets/42/status" &&
        method === "PATCH"
      ) {
        const body = JSON.parse(
          String(options.body)
        );

        ticket.currentStatus = body.status;

        return response({
          ticket: {
            id: 42,
            currentStatus:
              ticket.currentStatus,
          },
        });
      }

      if (
        url ===
          "/api/staff/tickets/42/comments" &&
        method === "POST"
      ) {
        const body = JSON.parse(
          String(options.body)
        );

        ticket.publicComments.push({
          id: 1,
          content: body.content,
          createdAt:
            "2026-09-24T09:00:00.000Z",
          author: staff,
        });

        return response({
          comment:
            ticket.publicComments[0],
        });
      }

      if (
        url ===
          "/api/staff/tickets/42/internal-notes" &&
        method === "POST"
      ) {
        const body = JSON.parse(
          String(options.body)
        );

        ticket.internalNotes.push({
          id: 1,
          content: body.content,
          createdAt:
            "2026-09-24T09:05:00.000Z",
          author: staff,
        });

        return response({
          note: ticket.internalNotes[0],
        });
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            message: "Not found.",
          },
        }),
      } as Response;
    }
  );

  vi.stubGlobal("fetch", fetchMock);
});

describe("StaffTicketDetail", () => {
  it(
    "loads the Ticket Detail and required controls",
    async () => {
      render(
        <StaffTicketDetail
          ticketId={42}
          currentUserId={staff.id}
          onBack={() => undefined}
        />
      );

      expect(
        await screen.findByRole("heading", {
          name: "INC-000042",
        })
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          "Unable to access email"
        )
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", {
          name: "Claim Ticket",
        })
      ).toBeInTheDocument();

      expect(
        screen.getByLabelText("Ticket Owner")
      ).toBeInTheDocument();

      expect(
        screen.getByLabelText("IT Priority")
      ).toBeInTheDocument();

      expect(
        screen.getByLabelText("Status")
      ).toBeInTheDocument();

      expect(
        screen.getByLabelText(
          "Add Public Comment"
        )
      ).toBeInTheDocument();

      expect(
        screen.getByLabelText(
          "Add Internal Note"
        )
      ).toBeInTheDocument();
    }
  );

  it(
    "performs claim, assignment, priority and status operations",
    async () => {
      render(
        <StaffTicketDetail
          ticketId={42}
          currentUserId={staff.id}
          onBack={() => undefined}
        />
      );

      await screen.findByRole("heading", {
        name: "INC-000042",
      });

      fireEvent.click(
        screen.getByRole("button", {
          name: "Claim Ticket",
        })
      );

      await waitFor(() =>
        expect(
          screen.getByLabelText(
            "Ticket Owner"
          )
        ).toHaveValue(String(staff.id))
      );

      fireEvent.change(
        screen.getByLabelText("Ticket Owner"),
        {
          target: {
            value: String(
              administrator.id
            ),
          },
        }
      );

      await waitFor(() =>
        expect(
          screen.getByLabelText(
            "Ticket Owner"
          )
        ).toHaveValue(
          String(administrator.id)
        )
      );

      fireEvent.change(
        screen.getByLabelText("IT Priority"),
        {
          target: {
            value: "HIGH",
          },
        }
      );

      await waitFor(() =>
        expect(
          screen.getByLabelText(
            "IT Priority"
          )
        ).toHaveValue("HIGH")
      );

      fireEvent.change(
        screen.getByLabelText("Status"),
        {
          target: {
            value: "OPEN",
          },
        }
      );

      await waitFor(() =>
        expect(
          screen.getByLabelText("Status")
        ).toHaveValue("OPEN")
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/staff/tickets/42/claim",
        expect.objectContaining({
          method: "POST",
        })
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/staff/tickets/42/assignment",
        expect.objectContaining({
          method: "PATCH",
        })
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/staff/tickets/42/priority",
        expect.objectContaining({
          method: "PATCH",
        })
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/staff/tickets/42/status",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    }
  );

  it(
    "adds a Public Comment and Internal Note",
    async () => {
      render(
        <StaffTicketDetail
          ticketId={42}
          currentUserId={staff.id}
          onBack={() => undefined}
        />
      );

      await screen.findByRole("heading", {
        name: "INC-000042",
      });

      fireEvent.change(
        screen.getByLabelText(
          "Add Public Comment"
        ),
        {
          target: {
            value: "Requester update",
          },
        }
      );

      fireEvent.click(
        screen.getByRole("button", {
          name: "Add Public Comment",
        })
      );

      expect(
        await screen.findByText(
          "Requester update"
        )
      ).toBeInTheDocument();

      fireEvent.change(
        screen.getByLabelText(
          "Add Internal Note"
        ),
        {
          target: {
            value: "Staff investigation",
          },
        }
      );

      fireEvent.click(
        screen.getByRole("button", {
          name: "Add Internal Note",
        })
      );

      expect(
        await screen.findByText(
          "Staff investigation"
        )
      ).toBeInTheDocument();
    }
  );
});
