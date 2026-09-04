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

const requester = {
  id: 1,
  name: "Jennifer Anderson",
  email:
    "jennifer.anderson@example.com",
};

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

function installApiMock(
  detailFails = false
) {
  const fetchMock = vi.fn(
    async (
      input: RequestInfo | URL,
      _init?: RequestInit
    ): Promise<Response> => {
      const url = String(input);

      if (
        url.endsWith(
          "/api/requesters"
        )
      ) {
        return jsonResponse({
          requesters: [
            requester,
          ],
        });
      }

      if (
        url.endsWith(
          "/api/categories"
        )
      ) {
        return jsonResponse([
          {
            id: 1,
            name: "Hardware",
          },
        ]);
      }

      if (
        url.endsWith(
          "/api/related-systems"
        )
      ) {
        return jsonResponse({
          relatedSystems: [
            {
              id: 1,
              name:
                "Corporate Laptop",
            },
          ],
        });
      }

      if (
        url.includes(
          "/api/tickets?"
        )
      ) {
        return jsonResponse({
          tickets: [
            {
              id: 10,

              ticketNumber:
                "TKT-2026-000010",

              requesterId: 1,

              categoryId: 1,

              relatedSystemId: 1,

              summary:
                "Laptop battery drains quickly",

              requestedPriority:
                "HIGH",

              currentStatus:
                "NEW",

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
                name:
                  "Corporate Laptop",
              },
            },
          ],

          pagination: {
            page: 1,
            pageSize: 10,
            totalItems: 1,
            totalPages: 1,
          },
        });
      }

      if (
        url.endsWith(
          "/api/tickets/10"
        )
      ) {
        if (detailFails) {
          return jsonResponse(
            {
              error: {
                code:
                  "TICKET_NOT_FOUND",

                message:
                  "Ticket not found.",
              },
            },
            404
          );
        }

        return jsonResponse({
          ticket: {
            id: 10,

            ticketNumber:
              "TKT-2026-000010",

            requesterId: 1,

            categoryId: 1,

            relatedSystemId: 1,

            summary:
              "Laptop battery drains quickly",

            description:
              "Laptop battery loses charge within one hour of normal use.",

            requestedPriority:
              "HIGH",

            currentStatus:
              "NEW",

            itPriority: null,

            createdAt:
              "2026-09-01T08:00:00.000Z",

            updatedAt:
              "2026-09-01T09:00:00.000Z",

            requester,

            category: {
              id: 1,
              name: "Hardware",
            },

            relatedSystem: {
              id: 1,
              name:
                "Corporate Laptop",
            },

            attachments: [],
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

async function enterApplication() {
  const requesterSelect =
    await screen.findByLabelText(
      /development requester/i
    );

  fireEvent.change(
    requesterSelect,
    {
      target: {
        value: "1",
      },
    }
  );

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
      name:
        /create ticket/i,
    }
  );

  fireEvent.click(
    screen.getByRole(
      "button",
      {
        name:
          /^my tickets$/i,
      }
    )
  );

  await screen.findByRole(
    "heading",
    {
      name:
        /^my tickets$/i,
    }
  );
}

async function openTicket() {
  await screen.findAllByText(
    "TKT-2026-000010"
  );

  fireEvent.click(
    screen.getByRole(
      "button",
      {
        name: /^view$/i,
      }
    )
  );
}

describe(
  "Requester Ticket Detail",
  () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      sessionStorage.clear();
    });

    it(
      "opens an owned Ticket from My Tickets",
      async () => {
        installApiMock();

        render(<App />);

        await enterApplication();
        await openTicket();

        expect(
          await screen.findByRole(
            "heading",
            {
              name:
                /ticket detail/i,
            }
          )
        ).toBeInTheDocument();

        expect(
          screen.getAllByText(
            "TKT-2026-000010"
          ).length
        ).toBeGreaterThan(0);
      }
    );

    it(
      "shows Requester-facing Ticket fields as read-only information",
      async () => {
        installApiMock();

        render(<App />);

        await enterApplication();
        await openTicket();

        expect(
          await screen.findByText(
            "Laptop battery loses charge within one hour of normal use."
          )
        ).toBeInTheDocument();

        expect(
          screen.getAllByText(
            "Hardware"
          ).length
        ).toBeGreaterThan(0);

        expect(
          screen.getAllByText(
            "Corporate Laptop"
          ).length
        ).toBeGreaterThan(0);

        expect(
          screen.getAllByText(
            "Jennifer Anderson"
          ).length
        ).toBeGreaterThan(0);

        expect(
          screen.getAllByText(
            "HIGH"
          ).length
        ).toBeGreaterThan(0);
      }
    );

    it(
      "sends the selected Requester context when retrieving detail",
      async () => {
        const fetchMock =
          installApiMock();

        render(<App />);

        await enterApplication();
        await openTicket();

        await screen.findByRole(
          "heading",
          {
            name:
              /ticket detail/i,
          }
        );

        await waitFor(() => {
          const call =
            fetchMock.mock.calls.find(
              ([input]) =>
                String(
                  input
                ).endsWith(
                  "/api/tickets/10"
                )
            );

          expect(
            call
          ).toBeDefined();

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
      }
    );

    it(
      "returns to My Tickets",
      async () => {
        installApiMock();

        render(<App />);

        await enterApplication();
        await openTicket();

        await screen.findByRole(
          "heading",
          {
            name:
              /ticket detail/i,
          }
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                /back to my tickets/i,
            }
          )
        );

        expect(
          await screen.findByRole(
            "heading",
            {
              name:
                /^my tickets$/i,
            }
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "shows a safe error when Ticket Detail cannot be retrieved",
      async () => {
        installApiMock(true);

        render(<App />);

        await enterApplication();
        await openTicket();

        expect(
          await screen.findByText(
            /ticket not found/i
          )
        ).toBeInTheDocument();
      }
    );
  }
);