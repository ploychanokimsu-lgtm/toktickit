import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import App from "../../src/App.js";
import {
  getDevelopmentRequesters,
  type DevelopmentRequester,
} from "../../src/api.js";

vi.mock("../../src/api.js", () => ({
  getDevelopmentRequesters: vi.fn(),
}));

const mockedGetDevelopmentRequesters = vi.mocked(
  getDevelopmentRequesters
);

const activeRequesters: DevelopmentRequester[] = [
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

describe("Development Requester Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("shows a loading state while Requesters are being loaded", () => {
    mockedGetDevelopmentRequesters.mockReturnValue(
      new Promise(() => {})
    );

    render(<App />);

    expect(
      screen.getByText("Loading Development Requesters…")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeDisabled();
  });

  it("shows the Lab 2 testing explanation", async () => {
    mockedGetDevelopmentRequesters.mockResolvedValue(
      activeRequesters
    );

    render(<App />);

    expect(
      await screen.findByText("Select Development Requester")
    ).toBeInTheDocument();

    expect(
      screen.getByText(/this is not a login screen/i)
    ).toBeInTheDocument();
  });

  it("shows all active Development Requesters", async () => {
    mockedGetDevelopmentRequesters.mockResolvedValue(
      activeRequesters
    );

    render(<App />);

    const dropdown = await screen.findByLabelText(
      /development requester/i
    );

    expect(dropdown).toBeInTheDocument();

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
    mockedGetDevelopmentRequesters.mockResolvedValue(
      activeRequesters
    );

    render(<App />);

    const continueButton = await screen.findByRole("button", {
      name: /continue/i,
    });

    expect(continueButton).toBeDisabled();

    fireEvent.change(
      screen.getByLabelText(/development requester/i),
      {
        target: { value: "4" },
      }
    );

    expect(continueButton).toBeEnabled();
  });

  it("stores the selected Requester and displays the current Requester", async () => {
    mockedGetDevelopmentRequesters.mockResolvedValue(
      activeRequesters
    );

    render(<App />);

    fireEvent.change(
      await screen.findByLabelText(/development requester/i),
      {
        target: { value: "4" },
      }
    );

    fireEvent.click(
      screen.getByRole("button", { name: /continue/i })
    );

    expect(
      screen.getAllByText("Ploy Srisuk").length
    ).toBeGreaterThan(0);

    expect(
      screen.getByText("ploy.srisuk@example.com")
    ).toBeInTheDocument();

    expect(
      sessionStorage.getItem("developmentRequesterId")
    ).toBe("4");
  });

  it("restores a previously selected Requester from sessionStorage", async () => {
    sessionStorage.setItem(
      "developmentRequesterId",
      "2"
    );

    mockedGetDevelopmentRequesters.mockResolvedValue(
      activeRequesters
    );

    render(<App />);

    await screen.findByText("michael.brown@example.com");

    expect(
      screen.getAllByText("Michael Brown").length
    ).toBeGreaterThan(0);

    expect(
      screen.getByText("michael.brown@example.com")
    ).toBeInTheDocument();

    expect(
      sessionStorage.getItem("developmentRequesterId")
    ).toBe("2");
  });

  it("clears Requester context when Change Requester is clicked", async () => {
    sessionStorage.setItem(
      "developmentRequesterId",
      "4"
    );

    mockedGetDevelopmentRequesters.mockResolvedValue(
      activeRequesters
    );

    render(<App />);

    const changeButton = await screen.findByRole("button", {
      name: /change requester/i,
    });

    fireEvent.click(changeButton);

    expect(
      sessionStorage.getItem("developmentRequesterId")
    ).toBeNull();

    expect(
      screen.getByText("Select Development Requester")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeDisabled();
  });

  it("removes an invalid stored Requester ID", async () => {
    sessionStorage.setItem(
      "developmentRequesterId",
      "999"
    );

    mockedGetDevelopmentRequesters.mockResolvedValue(
      activeRequesters
    );

    render(<App />);

    await screen.findByText("Select Development Requester");

    expect(
      sessionStorage.getItem("developmentRequesterId")
    ).toBeNull();
  });

  it("shows an empty state when no active Requesters exist", async () => {
    mockedGetDevelopmentRequesters.mockResolvedValue([]);

    render(<App />);

    expect(
      await screen.findByText(
        "No active Development Requesters are available."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeDisabled();
  });

  it("shows a safe failure state and allows retrying", async () => {
    mockedGetDevelopmentRequesters
      .mockRejectedValueOnce(
        new Error("Unable to load Development Requesters.")
      )
      .mockResolvedValueOnce(activeRequesters);

    render(<App />);

    expect(
      await screen.findByText(
        "Unable to load Development Requesters."
      )
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", {
      name: /retry/i,
    });

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(
        mockedGetDevelopmentRequesters
      ).toHaveBeenCalledTimes(2);
    });

    expect(
      await screen.findByLabelText(/development requester/i)
    ).toBeInTheDocument();
  });
});