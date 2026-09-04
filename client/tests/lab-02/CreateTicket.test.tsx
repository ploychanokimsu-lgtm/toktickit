import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import App from "../../src/App";

const requesters = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.com",
  },
  {
    id: 2,
    name: "Michael Brown",
    email: "michael.brown@example.com",
  },
];

const categories = [
  {
    id: 1,
    name: "Account and Access",
  },
  {
    id: 2,
    name: "Hardware",
  },
  {
    id: 3,
    name: "Software",
  },
  {
    id: 4,
    name: "Network",
  },
];

const relatedSystems = [
  {
    id: 1,
    name: "Email",
  },
  {
    id: 2,
    name: "Campus Wi-Fi",
  },
  {
    id: 3,
    name: "VPN",
  },
];

function jsonResponse(
  data: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function installSuccessfulApiMock() {
  const fetchMock = vi.fn(
    async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url = String(input);

      if (url.endsWith("/api/requesters")) {
        return jsonResponse({
          requesters,
        });
      }

      if (url.endsWith("/api/categories")) {
        return jsonResponse(categories);
      }

      if (url.endsWith("/api/related-systems")) {
        return jsonResponse({
          relatedSystems,
        });
      }

      if (
        url.endsWith("/api/tickets") &&
        init?.method === "POST"
      ) {
        return jsonResponse(
          {
            ticket: {
              id: 10,
              ticketNumber: "TKT-2026-000010",
              clientSubmissionId:
                "test-submission-id",
              requesterId: 1,
              categoryId: 2,
              relatedSystemId: 1,
              summary:
                "Laptop battery drains quickly",
              requestedPriority: "MEDIUM",
              description:
                "Laptop battery drains within one hour of normal use.",
              currentStatus: "NEW",
              createdAt:
                "2026-09-01T08:00:00.000Z",
              updatedAt:
                "2026-09-01T08:00:00.000Z",
            },
          },
          201
        );
      }

      return jsonResponse(
        {
          error: {
            code: "NOT_FOUND",
            message: "Not found.",
          },
        },
        404
      );
    }
  );

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function installFailingTicketApiMock() {
  const fetchMock = vi.fn(
    async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url = String(input);

      if (url.endsWith("/api/requesters")) {
        return jsonResponse({
          requesters,
        });
      }

      if (url.endsWith("/api/categories")) {
        return jsonResponse(categories);
      }

      if (url.endsWith("/api/related-systems")) {
        return jsonResponse({
          relatedSystems,
        });
      }

      if (
        url.endsWith("/api/tickets") &&
        init?.method === "POST"
      ) {
        return jsonResponse(
          {
            error: {
              code: "INTERNAL_ERROR",
              message:
                "The Ticket could not be created. Please try again.",
            },
          },
          500
        );
      }

      return jsonResponse(
        {
          error: {
            code: "NOT_FOUND",
            message: "Not found.",
          },
        },
        404
      );
    }
  );

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

async function selectRequester() {
  const requesterSelect =
    await screen.findByLabelText(
      /development requester/i
    );

  fireEvent.change(requesterSelect, {
    target: {
      value: "1",
    },
  });

  const continueButton = screen.getByRole(
    "button",
    {
      name: /continue/i,
    }
  );

  expect(continueButton).not.toBeDisabled();

  fireEvent.click(continueButton);

  await screen.findByRole("heading", {
    name: /create ticket/i,
  });
}

async function waitForTicketFormReady() {
  await screen.findByRole("option", {
    name: "Hardware",
  });

  await screen.findByRole("option", {
    name: "Email",
  });

  const submitButton = screen.getByRole(
    "button",
    {
      name: /submit ticket/i,
    }
  );

  await waitFor(() => {
    expect(submitButton).not.toBeDisabled();
  });
}

async function fillValidTicketForm() {
  await waitForTicketFormReady();

  fireEvent.change(
    screen.getByLabelText(/^category/i),
    {
      target: {
        value: "2",
      },
    }
  );

  fireEvent.change(
    screen.getByLabelText(/related system/i),
    {
      target: {
        value: "1",
      },
    }
  );

  fireEvent.change(
    screen.getByLabelText(/ticket summary/i),
    {
      target: {
        value:
          "Laptop battery drains quickly",
      },
    }
  );

  fireEvent.change(
    screen.getByLabelText(/^description/i),
    {
      target: {
        value:
          "Laptop battery drains within one hour of normal use.",
      },
    }
  );

  expect(
    screen.getByLabelText(/^category/i)
  ).toHaveValue("2");

  expect(
    screen.getByLabelText(/related system/i)
  ).toHaveValue("1");

  expect(
    screen.getByLabelText(/ticket summary/i)
  ).toHaveValue(
    "Laptop battery drains quickly"
  );

  expect(
    screen.getByLabelText(/^description/i)
  ).toHaveValue(
    "Laptop battery drains within one hour of normal use."
  );
}

describe("Create Ticket", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it(
    "shows the Create Ticket screen after selecting a Requester",
    async () => {
      installSuccessfulApiMock();

      render(<App />);

      await selectRequester();

      expect(
        screen.getByRole("heading", {
          name: /create ticket/i,
        })
      ).toBeInTheDocument();

      expect(
        screen.getAllByText(
          "Jennifer Anderson"
        ).length
      ).toBeGreaterThan(0);
    }
  );

  it(
    "loads Category and Related System reference data",
    async () => {
      installSuccessfulApiMock();

      render(<App />);

      await selectRequester();
      await waitForTicketFormReady();

      expect(
        screen.getByLabelText(/^category/i)
      ).toBeInTheDocument();

      expect(
        screen.getByLabelText(
          /related system/i
        )
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", {
          name: "Hardware",
        })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", {
          name: "Email",
        })
      ).toBeInTheDocument();
    }
  );

  it(
    "uses MEDIUM as the default Requested Priority",
    async () => {
      installSuccessfulApiMock();

      render(<App />);

      await selectRequester();
      await waitForTicketFormReady();

      expect(
        screen.getByLabelText(
          /requested priority/i
        )
      ).toHaveValue("MEDIUM");
    }
  );

  it(
    "shows field-level validation and does not submit invalid data",
    async () => {
      const fetchMock =
        installSuccessfulApiMock();

      render(<App />);

      await selectRequester();
      await waitForTicketFormReady();

      fireEvent.click(
        screen.getByRole("button", {
          name: /submit ticket/i,
        })
      );

      expect(
        await screen.findByText(
          /category is required/i
        )
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          /related system is required/i
        )
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          /ticket summary must contain at least 5 characters/i
        )
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          /description must contain at least 10 characters/i
        )
      ).toBeInTheDocument();

      const ticketCalls =
        fetchMock.mock.calls.filter(
          ([input, init]) =>
            String(input).endsWith(
              "/api/tickets"
            ) &&
            init?.method === "POST"
        );

      expect(ticketCalls).toHaveLength(0);
    }
  );

  it(
    "creates a valid Ticket and displays the official Ticket Number",
    async () => {
      const fetchMock =
        installSuccessfulApiMock();

      render(<App />);

      await selectRequester();
      await fillValidTicketForm();

      fireEvent.click(
        screen.getByRole("button", {
          name: /submit ticket/i,
        })
      );

      await waitFor(() => {
        const ticketCalls =
          fetchMock.mock.calls.filter(
            ([input, init]) =>
              String(input).endsWith(
                "/api/tickets"
              ) &&
              init?.method === "POST"
          );

        expect(ticketCalls).toHaveLength(1);
      });

      expect(
        await screen.findByText(
          /ticket created successfully/i
        )
      ).toBeInTheDocument();

      expect(
        screen.getAllByText(
          /TKT-2026-000010/i
        ).length
      ).toBeGreaterThan(0);
    }
  );

  it(
    "preserves entered values when Ticket creation fails",
    async () => {
      const fetchMock =
        installFailingTicketApiMock();

      render(<App />);

      await selectRequester();
      await fillValidTicketForm();

      fireEvent.click(
        screen.getByRole("button", {
          name: /submit ticket/i,
        })
      );

      await waitFor(() => {
        const ticketCalls =
          fetchMock.mock.calls.filter(
            ([input, init]) =>
              String(input).endsWith(
                "/api/tickets"
              ) &&
              init?.method === "POST"
          );

        expect(ticketCalls).toHaveLength(1);
      });

      expect(
        await screen.findByText(
          /ticket could not be created/i
        )
      ).toBeInTheDocument();

      expect(
        screen.getByLabelText(
          /ticket summary/i
        )
      ).toHaveValue(
        "Laptop battery drains quickly"
      );

      expect(
        screen.getByLabelText(
          /^description/i
        )
      ).toHaveValue(
        "Laptop battery drains within one hour of normal use."
      );

      expect(
        screen.getByLabelText(/^category/i)
      ).toHaveValue("2");

      expect(
        screen.getByLabelText(
          /related system/i
        )
      ).toHaveValue("1");
    }
  );
});