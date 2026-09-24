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

import Lab3App from "../../src/Lab3App.js";

import {
  changeInitialPassword,
  getSessionUser,
  signIn,
  signOut,
} from "../../src/auth-api.js";

vi.mock("../../src/auth-api.js", () => ({
  getSessionUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  changeInitialPassword: vi.fn(),
}));

vi.mock(
  "../../src/StaffTicketQueue.js",
  () => ({
    default: ({
      onOpenTicket,
    }: {
      onOpenTicket: (
        ticketId: number
      ) => void;
    }) => (
      <section>
        <h1>Mock Staff Ticket Queue</h1>

        <button
          type="button"
          onClick={() =>
            onOpenTicket(42)
          }
        >
          Open mock ticket
        </button>
      </section>
    ),
  })
);

vi.mock("../../src/App.js", () => ({
  default: () => (
    <div>Mock Requester Workspace</div>
  ),
}));

const mockedGetSessionUser =
  vi.mocked(getSessionUser);

const mockedSignIn = vi.mocked(signIn);
const mockedSignOut = vi.mocked(signOut);

const mockedChangeInitialPassword =
  vi.mocked(changeInitialPassword);

const staffUser = {
  id: 10,
  name: "IT Staff User",
  email: "staff@example.com",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const administratorUser = {
  id: 11,
  name: "Administrator User",
  email: "admin@example.com",
  role: "ADMINISTRATOR" as const,
  mustChangePassword: false,
};

const requesterUser = {
  id: 12,
  name: "Requester User",
  email: "requester@example.com",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

describe("Lab3App", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetSessionUser.mockResolvedValue(
      null
    );

    mockedSignOut.mockResolvedValue();

    mockedChangeInitialPassword.mockResolvedValue();
  });

  it("shows the sign-in screen when there is no session", async () => {
    render(<Lab3App />);

    expect(
      screen.getByText(
        "Checking your session..."
      )
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", {
        name: "Sign in",
      })
    ).toBeInTheDocument();
  });

  it("signs in IT Staff and displays the Staff Ticket Queue", async () => {
    mockedSignIn.mockResolvedValue({
      user: staffUser,
      requiresPasswordChange: false,
    });

    render(<Lab3App />);

    await screen.findByRole("heading", {
      name: "Sign in",
    });

    fireEvent.change(
      screen.getByLabelText("Email"),
      {
        target: {
          value: staffUser.email,
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Password"),
      {
        target: {
          value: "ValidPassword1!",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Sign in",
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: "Mock Staff Ticket Queue",
      })
    ).toBeInTheDocument();

    expect(mockedSignIn).toHaveBeenCalledWith(
      staffUser.email,
      "ValidPassword1!"
    );
  });

  it("allows Administrators to access the Staff Ticket Queue", async () => {
    mockedGetSessionUser.mockResolvedValue(
      administratorUser
    );

    render(<Lab3App />);

    expect(
      await screen.findByRole("heading", {
        name: "Mock Staff Ticket Queue",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Administrator")
    ).toBeInTheDocument();
  });

  it("does not show the Staff Queue to Requesters", async () => {
    mockedGetSessionUser.mockResolvedValue(
      requesterUser
    );

    render(<Lab3App />);

    expect(
      await screen.findByText(
        "Mock Requester Workspace"
      )
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: "Mock Staff Ticket Queue",
      })
    ).not.toBeInTheDocument();
  });

  it("requires an initial password change before showing the queue", async () => {
    mockedGetSessionUser.mockResolvedValue({
      ...staffUser,
      mustChangePassword: true,
    });

    render(<Lab3App />);

    await screen.findByRole("heading", {
      name: "Change initial password",
    });

    fireEvent.change(
      screen.getByLabelText(
        "Current password"
      ),
      {
        target: {
          value: "InitialPassword1!",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("New password"),
      {
        target: {
          value: "NewPassword2!",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        "Confirm new password"
      ),
      {
        target: {
          value: "NewPassword2!",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Change password",
      })
    );

    await waitFor(() => {
      expect(
        mockedChangeInitialPassword
      ).toHaveBeenCalledWith(
        "InitialPassword1!",
        "NewPassword2!",
        "NewPassword2!"
      );
    });

    expect(
      await screen.findByRole("heading", {
        name: "Sign in",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Password changed successfully. Sign in with your new password."
      )
    ).toBeInTheDocument();
  });

  it("opens a selected queue ticket and returns to the queue", async () => {
    mockedGetSessionUser.mockResolvedValue(
      staffUser
    );

    render(<Lab3App />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open mock ticket",
      })
    );

    expect(
      screen.getByRole("status")
    ).toHaveTextContent(
      "Loading Ticket Detail..."
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Staff Ticket Queue",
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Mock Staff Ticket Queue",
      })
    ).toBeInTheDocument();
  });
  it("signs the authenticated user out", async () => {
    mockedGetSessionUser.mockResolvedValue(
      staffUser
    );

    render(<Lab3App />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Sign out",
      })
    );

    await waitFor(() => {
      expect(
        mockedSignOut
      ).toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByRole("heading", {
        name: "Sign in",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "You have signed out successfully."
      )
    ).toBeInTheDocument();
  });
});
