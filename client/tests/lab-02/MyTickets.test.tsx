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
    email:
      "jennifer.anderson@example.com",
  },
  {
    id: 2,
    name: "Michael Brown",
    email:
      "michael.brown@example.com",
  },
];

const categories = [
  {
    id: 1,
    name: "Hardware",
  },
  {
    id: 2,
    name: "Network",
  },
];

const relatedSystems = [
  {
    id: 1,
    name: "Corporate Laptop",
  },
  {
    id: 2,
    name: "VPN",
  },
];

const tickets = [
  {
    id: 11,
    ticketNumber:
      "TKT-2026-000011",
    requesterId: 1,
    categoryId: 1,
    relatedSystemId: 1,
    summary:
      "Laptop battery drains quickly",
    requestedPriority:
      "HIGH",
    currentStatus: "NEW",
    createdAt:
      "2026-09-01T08:00:00.000Z",
    updatedAt:
      "2026-09-01T09:00:00.000Z",
    category: {
      id: 1,
      name: "Hardware",
    },
    relatedSystem: {
      id: 1,
      name: "Corporate Laptop",
    },
  },
  {
    id: 12,
    ticketNumber:
      "TKT-2026-000012",
    requesterId: 1,
    categoryId: 2,
    relatedSystemId: 2,
    summary:
      "VPN disconnects frequently",
    requestedPriority:
      "MEDIUM",
    currentStatus: "NEW",
    createdAt:
      "2026-09-01T10:00:00.000Z",
    updatedAt:
      "2026-09-01T11:00:00.000Z",
    category: {
      id: 2,
      name: "Network",
    },
    relatedSystem: {
      id: 2,
      name: "VPN",
    },
  },
];

function jsonResponse(
  data: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
}

function installApiMock() {
  let ticketFailureCount = 0;

  const fetchMock = vi.fn(
    async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url =
        String(input);

      if (
        url.endsWith(
          "/api/requesters"
        )
      ) {
        return jsonResponse({
          requesters,
        });
      }

      if (
        url.endsWith(
          "/api/categories"
        )
      ) {
        return jsonResponse(
          categories
        );
      }

      if (
        url.endsWith(
          "/api/related-systems"
        )
      ) {
        return jsonResponse({
          relatedSystems,
        });
      }

      if (
        url.includes(
          "/api/tickets?"
        ) &&
        init?.method !==
          "POST"
      ) {
        const parsed =
          new URL(url);

        const search =
          parsed.searchParams.get(
            "search"
          );

        if (
          search ===
          "nomatch"
        ) {
          return jsonResponse({
            tickets: [],
            pagination: {
              page: 1,
              pageSize: 10,
              totalItems: 0,
              totalPages: 0,
            },
          });
        }

        if (
          search ===
          "force-error"
        ) {
          ticketFailureCount += 1;

          if (
            ticketFailureCount ===
            1
          ) {
            return jsonResponse(
              {
                error: {
                  code:
                    "INTERNAL_ERROR",
                  message:
                    "Unable to load Tickets. Please try again.",
                },
              },
              500
            );
          }
        }

        const page =
          Number(
            parsed.searchParams.get(
              "page"
            ) ?? "1"
          );

        return jsonResponse({
          tickets,
          pagination: {
            page,
            pageSize: 10,
            totalItems: 12,
            totalPages: 2,
          },
        });
      }

      return jsonResponse(
        {
          error: {
            code:
              "NOT_FOUND",
            message:
              "Not found.",
          },
        },
        404
      );
    }
  );

  vi.stubGlobal(
    "fetch",
    fetchMock
  );

  return fetchMock;
}

async function selectRequester() {
  const select =
    await screen.findByLabelText(
      /development requester/i
    );

  fireEvent.change(select, {
    target: {
      value: "1",
    },
  });

  fireEvent.click(
    screen.getByRole(
      "button",
      {
        name: /continue/i,
      }
    )
  );

  await screen.findByRole(
    "heading",
    {
      name: /create ticket/i,
    }
  );
}

async function openMyTickets() {
  fireEvent.click(
    screen.getByRole(
      "button",
      {
        name: /^my tickets$/i,
      }
    )
  );

  await screen.findByRole(
    "heading",
    {
      name: /^my tickets$/i,
    }
  );
}

describe("My Tickets", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("shows the selected Requester's Tickets", async () => {
    installApiMock();

    render(<App />);

    await selectRequester();
    await openMyTickets();

    expect(
      await screen.findAllByText(
        "TKT-2026-000011"
      )
    ).not.toHaveLength(0);

    expect(
      screen.getAllByText(
        "Laptop battery drains quickly"
      ).length
    ).toBeGreaterThan(0);

    expect(
      screen.getByText(
        /12 total/i
      )
    ).toBeInTheDocument();
  });

  it("sends the selected Requester ID in the ownership header", async () => {
    const fetchMock =
      installApiMock();

    render(<App />);

    await selectRequester();
    await openMyTickets();

    await waitFor(() => {
      const call =
        fetchMock.mock.calls.find(
          ([input]) =>
            String(
              input
            ).includes(
              "/api/tickets?"
            )
        );

      expect(call).toBeDefined();

      const init =
        call?.[1];

      expect(
        (
          init?.headers as Record<
            string,
            string
          >
        )[
          "X-Development-Requester-Id"
        ]
      ).toBe("1");
    });
  });

  it("supports search, Category, Priority, and sorting", async () => {
    const fetchMock =
      installApiMock();

    render(<App />);

    await selectRequester();
    await openMyTickets();

    await screen.findAllByText(
      "TKT-2026-000011"
    );

    fireEvent.change(
      screen.getByLabelText(
        /^search$/i
      ),
      {
        target: {
          value: "battery",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        /^category$/i
      ),
      {
        target: {
          value: "1",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        /^priority$/i
      ),
      {
        target: {
          value: "HIGH",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        /^sort$/i
      ),
      {
        target: {
          value:
            "updatedAt:asc",
        },
      }
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /^search$/i,
        }
      )
    );

    await waitFor(() => {
      const urls =
        fetchMock.mock.calls
          .map(([input]) =>
            String(input)
          )
          .filter((url) =>
            url.includes(
              "/api/tickets?"
            )
          );

      expect(
        urls.some(
          (url) =>
            url.includes(
              "search=battery"
            ) &&
            url.includes(
              "categoryId=1"
            ) &&
            url.includes(
              "requestedPriority=HIGH"
            ) &&
            url.includes(
              "sortOrder=asc"
            )
        )
      ).toBe(true);
    });
  });

  it("shows a no-results state for active search criteria", async () => {
    installApiMock();

    render(<App />);

    await selectRequester();
    await openMyTickets();

    fireEvent.change(
      screen.getByLabelText(
        /^search$/i
      ),
      {
        target: {
          value: "nomatch",
        },
      }
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /^search$/i,
        }
      )
    );

    expect(
      await screen.findByText(
        /no tickets match your current search or filters/i
      )
    ).toBeInTheDocument();
  });

  it("supports pagination", async () => {
    const fetchMock =
      installApiMock();

    render(<App />);

    await selectRequester();
    await openMyTickets();

    await screen.findByText(
      /page 1 of 2/i
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /^next$/i,
        }
      )
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input]) =>
            String(
              input
            ).includes(
              "page=2"
            )
        )
      ).toBe(true);
    });
  });

  it("shows a safe failure state and Retry action", async () => {
    installApiMock();

    render(<App />);

    await selectRequester();
    await openMyTickets();

    fireEvent.change(
      screen.getByLabelText(
        /^search$/i
      ),
      {
        target: {
          value:
            "force-error",
        },
      }
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /^search$/i,
        }
      )
    );

    expect(
      await screen.findByText(
        /unable to load tickets/i
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: /^retry$/i,
        }
      )
    );

    expect(
      await screen.findAllByText(
        "TKT-2026-000011"
      )
    ).not.toHaveLength(0);
  });
});