import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App.js";
import {
  getDevelopmentRequesters,
  type DevelopmentRequester,
} from "../../src/api.js";

vi.mock("../../src/api.js", () => ({
  checkSystem: vi.fn(),
  getDevelopmentRequesters: vi.fn(),
}));

const mockedGetDevelopmentRequesters = vi.mocked(
  getDevelopmentRequesters
);

const requesters: DevelopmentRequester[] = [
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

describe("Zen Green UI Foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedGetDevelopmentRequesters.mockResolvedValue(requesters);
  });

  it("renders the reusable Zen Green application structure", async () => {
    const { container } = render(<App />);

    await screen.findByText("Select Development Requester");

    expect(container.querySelector(".tk-app")).toBeInTheDocument();
    expect(container.querySelector(".tk-header")).toBeInTheDocument();
    expect(container.querySelector(".tk-card")).toBeInTheDocument();
    expect(container.querySelector(".tk-page")).toBeInTheDocument();
  });

  it("uses the reusable Zen Green form classes", async () => {
    render(<App />);

    const requesterSelect = await screen.findByLabelText(
      /development requester/i
    );

    expect(requesterSelect).toHaveClass("tk-select");
  });

  it("shows the required-field indicator", async () => {
    const { container } = render(<App />);

    await screen.findByLabelText(/development requester/i);

    expect(
      container.querySelector(".tk-required")
    ).toBeInTheDocument();
  });

  it("uses the primary button style and disabled state correctly", async () => {
    render(<App />);

    await screen.findByLabelText(/development requester/i);

    const continueButton = screen.getByRole("button", {
      name: /continue/i,
    });

    expect(continueButton).toHaveClass("tk-button");
    expect(continueButton).toHaveClass("tk-button-primary");
    expect(continueButton).toBeDisabled();
  });

  it("uses the reusable loading state while requester data loads", () => {
    mockedGetDevelopmentRequesters.mockReturnValue(
      new Promise(() => {})
    );

    const { container } = render(<App />);

    expect(container.querySelector(".tk-state")).toBeInTheDocument();
    expect(container.querySelector(".tk-spinner")).toBeInTheDocument();
  });

  it("uses the reusable error alert and retry button on API failure", async () => {
    mockedGetDevelopmentRequesters.mockRejectedValueOnce(
      new Error("Unable to load Development Requesters.")
    );

    const { container } = render(<App />);

    expect(
      await screen.findByText(
        "Unable to load Development Requesters."
      )
    ).toBeInTheDocument();

    expect(container.querySelector(".tk-alert-error")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", {
      name: /retry/i,
    });

    expect(retryButton).toHaveClass("tk-button");
  });
});