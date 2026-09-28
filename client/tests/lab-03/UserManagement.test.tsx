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

import UserManagement from "../../src/UserManagement.js";

import {
  createUser,
  listUsers,
  setInitialPassword,
  updateUser,
} from "../../src/admin-api.js";

vi.mock("../../src/admin-api.js", () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  setInitialPassword: vi.fn(),
}));

const mockedListUsers =
  vi.mocked(listUsers);

const mockedCreateUser =
  vi.mocked(createUser);

const mockedUpdateUser =
  vi.mocked(updateUser);

const mockedSetInitialPassword =
  vi.mocked(setInitialPassword);

const administrator = {
  id: 1,
  name: "Alex Thompson",
  email: "admin@example.com",
  role: "ADMINISTRATOR" as const,
  isActive: true,
  mustChangePassword: false,
};

const requester = {
  id: 2,
  name: "Jennifer Anderson",
  email: "jennifer@example.com",
  role: "REQUESTER" as const,
  isActive: true,
  mustChangePassword: false,
};

describe("UserManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedListUsers.mockResolvedValue([
      administrator,
      requester,
    ]);

    mockedCreateUser.mockResolvedValue({
      id: 3,
      name: "Emily Davis",
      email: "emily@example.com",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
    });

    mockedUpdateUser.mockResolvedValue({
      ...requester,
      name: "Jennifer Wilson",
      role: "IT_STAFF",
    });

    mockedSetInitialPassword.mockResolvedValue(
      "New initial password set successfully."
    );
  });

  it("loads users and applies search and role filters", async () => {
    render(
      <UserManagement
        currentUserId={administrator.id}
      />
    );

    expect(
      await screen.findByText(
        "Jennifer Anderson"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("Alex Thompson")
    ).toBeInTheDocument();

    expect(
      screen.getByText("(You)")
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText("Search"),
      {
        target: {
          value: "Jennifer",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Role"),
      {
        target: {
          value: "REQUESTER",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Search",
      })
    );

    await waitFor(() => {
      expect(
        mockedListUsers
      ).toHaveBeenLastCalledWith({
        search: "Jennifer",
        role: "REQUESTER",
      });
    });
  });

  it("creates a user account", async () => {
    render(
      <UserManagement
        currentUserId={administrator.id}
      />
    );

    await screen.findByText(
      "Jennifer Anderson"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create User",
      })
    );

    fireEvent.change(
      screen.getByLabelText("Name"),
      {
        target: {
          value: "Emily Davis",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Email"),
      {
        target: {
          value: "emily@example.com",
        },
      }
    );

    fireEvent.change(
      screen.getAllByLabelText("Role")[1],
      {
        target: {
          value: "IT_STAFF",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        "Initial Password"
      ),
      {
        target: {
          value: "Initial1!",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create User",
      })
    );

    await waitFor(() => {
      expect(
        mockedCreateUser
      ).toHaveBeenCalledWith({
        name: "Emily Davis",
        email: "emily@example.com",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "Initial1!",
      });
    });

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent(
      "User Emily Davis created successfully."
    );
  });

  it("updates an existing user", async () => {
    render(
      <UserManagement
        currentUserId={administrator.id}
      />
    );

    await screen.findByText(
      "Jennifer Anderson"
    );

    const editButtons =
      screen.getAllByRole("button", {
        name: "Edit",
      });

    fireEvent.click(editButtons[1]);

    fireEvent.change(
      screen.getByLabelText("Name"),
      {
        target: {
          value: "Jennifer Wilson",
        },
      }
    );

    fireEvent.change(
      screen.getAllByLabelText("Role")[1],
      {
        target: {
          value: "IT_STAFF",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Save Changes",
      })
    );

    await waitFor(() => {
      expect(
        mockedUpdateUser
      ).toHaveBeenCalledWith(
        requester.id,
        {
          name: "Jennifer Wilson",
          email: requester.email,
          role: "IT_STAFF",
          isActive: true,
        }
      );
    });

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent(
      "User Jennifer Wilson updated successfully."
    );
  });

  it("sets a new initial password", async () => {
    render(
      <UserManagement
        currentUserId={administrator.id}
      />
    );

    await screen.findByText(
      "Jennifer Anderson"
    );

    const passwordButtons =
      screen.getAllByRole("button", {
        name: "Set Password",
      });

    fireEvent.click(
      passwordButtons[1]
    );

    fireEvent.change(
      screen.getByLabelText(
        "New Initial Password"
      ),
      {
        target: {
          value: "NewInitial1!",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Set Initial Password",
      })
    );

    await waitFor(() => {
      expect(
        mockedSetInitialPassword
      ).toHaveBeenCalledWith(
        requester.id,
        "NewInitial1!"
      );
    });

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent(
      "New initial password set successfully."
    );
  });

  it("shows safe API error messages", async () => {
    mockedCreateUser.mockRejectedValue(
      new Error(
        "A user with this email address already exists."
      )
    );

    render(
      <UserManagement
        currentUserId={administrator.id}
      />
    );

    await screen.findByText(
      "Jennifer Anderson"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create User",
      })
    );

    fireEvent.change(
      screen.getByLabelText("Name"),
      {
        target: {
          value: "Duplicate User",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Email"),
      {
        target: {
          value: "admin@example.com",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        "Initial Password"
      ),
      {
        target: {
          value: "Initial1!",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create User",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "A user with this email address already exists."
    );
  });
});
