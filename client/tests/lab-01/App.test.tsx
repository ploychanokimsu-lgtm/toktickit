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
];

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    mockedGetDevelopmentRequesters.mockResolvedValue(
      requesters
    );
  });

  it("renders the TokTickIT application heading", async () => {
    render(<App />);

    expect(
      screen.getByText("TokTickIT")
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Select Development Requester")
    ).toBeInTheDocument();
  });

  it("renders the current Lab 2 Requester entry screen", async () => {
    render(<App />);

    expect(
      await screen.findByLabelText(/development requester/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /continue/i,
      })
    ).toBeDisabled();
  });

  it("shows a safe error when the Requester API is unavailable", async () => {
    mockedGetDevelopmentRequesters.mockRejectedValueOnce(
      new Error("Unable to load Development Requesters.")
    );

    render(<App />);

    expect(
      await screen.findByText(
        "Unable to load Development Requesters."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /retry/i,
      })
    ).toBeInTheDocument();
  });
});