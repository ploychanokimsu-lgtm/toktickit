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

import {
  createTicket,
  getCategories,
  getDevelopmentRequesters,
  getRelatedSystems,
} from "../../src/api";

vi.mock("../../src/api", () => ({
  checkSystem: vi.fn(),
  getDevelopmentRequesters: vi.fn(),
  getCategories: vi.fn(),
  getRelatedSystems: vi.fn(),
  createTicket: vi.fn(),
}));

const mockedGetDevelopmentRequesters =
  vi.mocked(getDevelopmentRequesters);

const mockedGetCategories =
  vi.mocked(getCategories);

const mockedGetRelatedSystems =
  vi.mocked(getRelatedSystems);

const mockedCreateTicket =
  vi.mocked(createTicket);

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
  {
    id: 3,
    name: "Narin Chaiyasit",
    email: "narin.chaiyasit@example.com",
  },
  {
    id: 4,
    name: "Ploy Srisuk",
    email: "ploy.srisuk@example.com",
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
];

describe("Development Requester Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    mockedGetDevelopmentRequesters.mockResolvedValue(
      requesters
    );

    mockedGetCategories.mockResolvedValue(
      categories
    );

    mockedGetRelatedSystems.mockResolvedValue(
      relatedSystems
    );

    mockedCreateTicket.mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Test Ticket",
      requestedPriority: "MEDIUM",
      description:
        "This is a valid test description.",
      currentStatus: "NEW",
      createdAt:
        "2026-09-01T08:00:00.000Z",
      updatedAt:
        "2026-09-01T08:00:00.000Z",
    });
  });

  it("shows a loading state while Requesters are loading", () => {
    mockedGetDevelopmentRequesters.mockReturnValue(
      new Promise(() => {})
    );

    render(<App />);

    expect(
      screen.getByText(
        /loading development requesters/i
      )
    ).toBeInTheDocument();
  });

  it("explains that the selector is not authentication", async () => {
    render(<App />);

    expect(
      await screen.findByText(
        /this is not a login screen/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /authentication and role-based access will be introduced in lab 3/i
      )
    ).toBeInTheDocument();
  });

  it("shows all active Development Requesters", async () => {
    render(<App />);

    await screen.findByLabelText(
      /development requester/i
    );

    expect(
      screen.getByRole("option", {
        name: "Jennifer Anderson",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: "Michael Brown",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: "Narin Chaiyasit",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: "Ploy Srisuk",
      })
    ).toBeInTheDocument();
  });

  it("keeps Continue disabled until a Requester is selected", async () => {
    render(<App />);

    const requesterSelect =
      await screen.findByLabelText(
        /development requester/i
      );

    const continueButton =
      screen.getByRole("button", {
        name: /continue/i,
      });

    expect(continueButton).toBeDisabled();

    fireEvent.change(requesterSelect, {
      target: {
        value: "4",
      },
    });

    expect(
      continueButton
    ).not.toBeDisabled();
  });

  it("stores the selected Requester and opens the application", async () => {
    render(<App />);

    const requesterSelect =
      await screen.findByLabelText(
        /development requester/i
      );

    fireEvent.change(requesterSelect, {
      target: {
        value: "4",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /continue/i,
      })
    );

    expect(
      sessionStorage.getItem(
        "developmentRequesterId"
      )
    ).toBe("4");

    expect(
      await screen.findByRole("heading", {
        name: /create ticket/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("Ploy Srisuk")
        .length
    ).toBeGreaterThan(0);
  });

  it("restores a valid Requester from sessionStorage", async () => {
    sessionStorage.setItem(
      "developmentRequesterId",
      "2"
    );

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: /create ticket/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(
        "Michael Brown"
      ).length
    ).toBeGreaterThan(0);
  });

  it("clears the Requester when Change Requester is clicked", async () => {
    sessionStorage.setItem(
      "developmentRequesterId",
      "2"
    );

    render(<App />);

    const changeButton =
      await screen.findByRole("button", {
        name: /change requester/i,
      });

    fireEvent.click(changeButton);

    expect(
      sessionStorage.getItem(
        "developmentRequesterId"
      )
    ).toBeNull();

    expect(
      await screen.findByText(
        "Select Development Requester"
      )
    ).toBeInTheDocument();
  });

  it("removes an invalid stored Requester ID", async () => {
    sessionStorage.setItem(
      "developmentRequesterId",
      "999"
    );

    render(<App />);

    expect(
      await screen.findByText(
        "Select Development Requester"
      )
    ).toBeInTheDocument();

    expect(
      sessionStorage.getItem(
        "developmentRequesterId"
      )
    ).toBeNull();
  });

  it("shows an empty state when no active Requesters exist", async () => {
    mockedGetDevelopmentRequesters.mockResolvedValueOnce(
      []
    );

    render(<App />);

    expect(
      await screen.findByText(
        /no active development requesters are available/i
      )
    ).toBeInTheDocument();
  });

  it("shows a safe API failure state and allows retry", async () => {
    mockedGetDevelopmentRequesters
      .mockRejectedValueOnce(
        new Error(
          "Unable to load Development Requesters."
        )
      )
      .mockResolvedValueOnce(requesters);

    render(<App />);

    expect(
      await screen.findByText(
        "Unable to load Development Requesters."
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /retry/i,
      })
    );

    await waitFor(() => {
      expect(
        mockedGetDevelopmentRequesters
      ).toHaveBeenCalledTimes(2);
    });

    expect(
      await screen.findByLabelText(
        /development requester/i
      )
    ).toBeInTheDocument();
  });
});