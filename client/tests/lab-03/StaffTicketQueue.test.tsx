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

import {
  ApiRequestError,
  getStaffQueueCategories,
  getStaffTicketQueue,
  type StaffQueueResponse,
} from "../../src/api.js";

import StaffTicketQueue from "../../src/StaffTicketQueue.js";

vi.mock("../../src/api.js", async () => {
  const actual =
    await vi.importActual<
      typeof import("../../src/api.js")
    >("../../src/api.js");

  return {
    ...actual,
    getStaffQueueCategories: vi.fn(),
    getStaffTicketQueue: vi.fn(),
  };
});

const mockedCategories = vi.mocked(
  getStaffQueueCategories
);

const mockedQueue = vi.mocked(
  getStaffTicketQueue
);

const emptyResponse: StaffQueueResponse = {
  tickets: [],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

const resultsResponse: StaffQueueResponse = {
  tickets: [
    {
      id: 101,
      ticketNumber: "TKT-2026-0101",
      summary: "Unable to access company VPN",
      requestedPriority: "HIGH",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      ownerId: 55,
      createdAt: "2026-09-20T08:00:00.000Z",
      updatedAt: "2026-09-21T09:30:00.000Z",
      category: {
        id: 1,
        name: "Access",
      },
      owner: {
        id: 55,
        name: "IT Staff User",
      },
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-0102",
      summary: "Printer is unavailable",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "NEW",
      ownerId: null,
      createdAt: "2026-09-21T08:00:00.000Z",
      updatedAt: "2026-09-21T08:00:00.000Z",
      category: {
        id: 2,
        name: "Hardware",
      },
      owner: null,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 2,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

describe("StaffTicketQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedCategories.mockResolvedValue([
      {
        id: 1,
        name: "Access",
      },
      {
        id: 2,
        name: "Hardware",
      },
    ]);
  });

  it("displays loading feedback", () => {
    mockedQueue.mockImplementation(
      () =>
        new Promise<StaffQueueResponse>(
          () => undefined
        )
    );

    render(
      <StaffTicketQueue
        onOpenTicket={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "Loading Ticket Queue..."
      )
    ).toBeInTheDocument();
  });

  it("displays Ticket results without an unreadable table", async () => {
    mockedQueue.mockResolvedValue(
      resultsResponse
    );

    render(
      <StaffTicketQueue
        onOpenTicket={vi.fn()}
      />
    );

    expect(
      await screen.findByText(
        "Unable to access company VPN"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Printer is unavailable"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("IT Staff User")
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("Unassigned")
    ).toHaveLength(2);

    expect(
      screen.queryByRole("table")
    ).not.toBeInTheDocument();
  });

  it("opens the selected Ticket", async () => {
    mockedQueue.mockResolvedValue(
      resultsResponse
    );

    const onOpenTicket = vi.fn();

    render(
      <StaffTicketQueue
        onOpenTicket={onOpenTicket}
      />
    );

    const buttons =
      await screen.findAllByRole(
        "button",
        {
          name: "Open Ticket",
        }
      );

    fireEvent.click(buttons[0]);

    expect(onOpenTicket).toHaveBeenCalledWith(
      101
    );
  });

  it("displays the empty-queue state", async () => {
    mockedQueue.mockResolvedValue(
      emptyResponse
    );

    render(
      <StaffTicketQueue
        onOpenTicket={vi.fn()}
      />
    );

    expect(
      await screen.findByText(
        "The Ticket Queue is empty"
      )
    ).toBeInTheDocument();
  });

  it("displays a separate no-search-results state", async () => {
    mockedQueue.mockResolvedValue(
      emptyResponse
    );

    render(
      <StaffTicketQueue
        onOpenTicket={vi.fn()}
      />
    );

    await screen.findByText(
      "The Ticket Queue is empty"
    );

    fireEvent.change(
      screen.getByLabelText("Search"),
      {
        target: {
          value: "missing ticket",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Search",
      })
    );

    expect(
      await screen.findByText(
        "No matching Tickets"
      )
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: "missing ticket",
          page: 1,
        })
      );
    });
  });

  it("displays forbidden feedback", async () => {
    mockedQueue.mockRejectedValue(
      new ApiRequestError(
        "Forbidden",
        403,
        "FORBIDDEN"
      )
    );

    render(
      <StaffTicketQueue
        onOpenTicket={vi.fn()}
      />
    );

    expect(
      await screen.findByText(
        "You do not have permission to access the IT Staff Ticket Queue."
      )
    ).toBeInTheDocument();
  });

  it("displays safe failure feedback and retries", async () => {
    mockedQueue
      .mockRejectedValueOnce(
        new ApiRequestError(
          "Unable to load the IT Staff Ticket Queue.",
          500,
          "INTERNAL_ERROR"
        )
      )
      .mockResolvedValueOnce(
        emptyResponse
      );

    render(
      <StaffTicketQueue
        onOpenTicket={vi.fn()}
      />
    );

    expect(
      await screen.findByText(
        "Unable to load the IT Staff Ticket Queue."
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Retry",
      })
    );

    expect(
      await screen.findByText(
        "The Ticket Queue is empty"
      )
    ).toBeInTheDocument();

    expect(mockedQueue).toHaveBeenCalledTimes(
      2
    );
  });

  it("sends selected filters to the API", async () => {
    mockedQueue.mockResolvedValue(
      resultsResponse
    );

    render(
      <StaffTicketQueue
        onOpenTicket={vi.fn()}
      />
    );

    await screen.findByText(
      "Unable to access company VPN"
    );

    fireEvent.change(
      screen.getByLabelText("Status"),
      {
        target: {
          value: "IN_PROGRESS",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Assignment"),
      {
        target: {
          value: "mine",
        },
      }
    );

    await waitFor(() => {
      expect(mockedQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: "IN_PROGRESS",
          assignment: "mine",
          page: 1,
        })
      );
    });
  });
});



