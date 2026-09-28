import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createUser,
  listUsers,
  setInitialPassword,
  updateUser,
  type CreateUserInput,
  type ManagedUser,
  type UpdateUserInput,
} from "./admin-api.js";

import type {
  AuthenticatedRole,
} from "./auth-api.js";

interface UserManagementProps {
  currentUserId: number;
}

const ROLE_OPTIONS: Array<{
  value: AuthenticatedRole;
  label: string;
}> = [
  {
    value: "REQUESTER",
    label: "Requester",
  },
  {
    value: "IT_STAFF",
    label: "IT Staff",
  },
  {
    value: "ADMINISTRATOR",
    label: "Administrator",
  },
];

const EMPTY_CREATE_FORM: CreateUserInput = {
  name: "",
  email: "",
  role: "REQUESTER",
  isActive: true,
  initialPassword: "",
};

function roleLabel(
  role: AuthenticatedRole
): string {
  return (
    ROLE_OPTIONS.find(
      (option) => option.value === role
    )?.label ?? role
  );
}

function errorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

export default function UserManagement({
  currentUserId,
}: UserManagementProps) {
  const [users, setUsers] =
    useState<ManagedUser[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [working, setWorking] =
    useState(false);
  const [error, setError] =
    useState("");
  const [notice, setNotice] =
    useState("");

  const [searchInput, setSearchInput] =
    useState("");
  const [roleInput, setRoleInput] =
    useState<AuthenticatedRole | "">("");
  const [search, setSearch] =
    useState("");
  const [role, setRole] =
    useState<AuthenticatedRole | "">("");

  const [showCreate, setShowCreate] =
    useState(false);
  const [createForm, setCreateForm] =
    useState<CreateUserInput>({
      ...EMPTY_CREATE_FORM,
    });

  const [editingUser, setEditingUser] =
    useState<ManagedUser | null>(null);
  const [editForm, setEditForm] =
    useState<UpdateUserInput>({});

  const [passwordUser, setPasswordUser] =
    useState<ManagedUser | null>(null);
  const [
    newInitialPassword,
    setNewInitialPassword,
  ] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setUsers(
        await listUsers({
          search,
          role,
        })
      );
    } catch (loadError) {
      setError(
        errorMessage(
          loadError,
          "Unable to load users."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [role, search]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function clearMessages() {
    setError("");
    setNotice("");
  }

  function closeForms() {
    setShowCreate(false);
    setEditingUser(null);
    setPasswordUser(null);
    setNewInitialPassword("");
  }

  function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    clearMessages();
    closeForms();
    setSearch(searchInput.trim());
    setRole(roleInput);
  }

  function clearFilters() {
    clearMessages();
    closeForms();
    setSearchInput("");
    setRoleInput("");
    setSearch("");
    setRole("");
  }

  async function handleCreate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    clearMessages();
    setWorking(true);

    try {
      const created =
        await createUser(createForm);

      setNotice(
        `User ${created.name} created successfully.`
      );
      setCreateForm({
        ...EMPTY_CREATE_FORM,
      });
      setShowCreate(false);
      await loadUsers();
    } catch (createError) {
      setError(
        errorMessage(
          createError,
          "Unable to create the user."
        )
      );
    } finally {
      setWorking(false);
    }
  }

  function beginEdit(user: ManagedUser) {
    clearMessages();
    setShowCreate(false);
    setPasswordUser(null);
    setNewInitialPassword("");
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    clearMessages();
    setWorking(true);

    try {
      const updated =
        await updateUser(
          editingUser.id,
          editForm
        );

      setNotice(
        `User ${updated.name} updated successfully.`
      );
      setEditingUser(null);
      await loadUsers();
    } catch (updateError) {
      setError(
        errorMessage(
          updateError,
          "Unable to update the user."
        )
      );
    } finally {
      setWorking(false);
    }
  }

  function beginPasswordReset(
    user: ManagedUser
  ) {
    clearMessages();
    setShowCreate(false);
    setEditingUser(null);
    setPasswordUser(user);
    setNewInitialPassword("");
  }

  async function handlePasswordReset(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!passwordUser) {
      return;
    }

    clearMessages();
    setWorking(true);

    try {
      const message =
        await setInitialPassword(
          passwordUser.id,
          newInitialPassword
        );

      setNotice(message);
      setPasswordUser(null);
      setNewInitialPassword("");
      await loadUsers();
    } catch (passwordError) {
      setError(
        errorMessage(
          passwordError,
          "Unable to set the initial password."
        )
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="tk-page">
      <div className="tk-page-header">
        <div>
          <h1 className="tk-page-title">
            Users
          </h1>

          <p className="tk-page-description">
            Create and manage TokTickIT user
            accounts.
          </p>
        </div>

        <button
          type="button"
          className="tk-button tk-button-primary"
          onClick={() => {
            clearMessages();
            setEditingUser(null);
            setPasswordUser(null);
            setShowCreate((value) => !value);
          }}
        >
          {showCreate
            ? "Cancel"
            : "Create User"}
        </button>
      </div>

      {error && (
        <div
          className="tk-alert tk-alert-error tk-admin-message"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="tk-alert tk-alert-success tk-admin-message"
          role="status"
        >
          {notice}
        </div>
      )}

      <section
        className="tk-card tk-admin-section"
        aria-label="User filters"
      >
        <div className="tk-card-body">
          <form
            className="tk-admin-filter-grid"
            onSubmit={handleSearch}
          >
            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="admin-user-search"
              >
                Search
              </label>

              <input
                id="admin-user-search"
                className="tk-input"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value
                  )
                }
                placeholder="Search by name or email"
              />
            </div>

            <div className="tk-form-group">
              <label
                className="tk-label"
                htmlFor="admin-role-filter"
              >
                Role
              </label>

              <select
                id="admin-role-filter"
                className="tk-select"
                value={roleInput}
                onChange={(event) =>
                  setRoleInput(
                    event.target.value as
                      | AuthenticatedRole
                      | ""
                  )
                }
              >
                <option value="">
                  All roles
                </option>

                {ROLE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="tk-admin-filter-actions">
              <button
                type="button"
                className="tk-button tk-button-secondary"
                onClick={clearFilters}
              >
                Clear
              </button>

              <button
                type="submit"
                className="tk-button tk-button-primary"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {showCreate && (
        <section className="tk-card tk-admin-section">
          <div className="tk-card-body">
            <h2 className="tk-card-title">
              Create User
            </h2>

            <form onSubmit={handleCreate}>
              <div className="tk-admin-form-grid">
                <div className="tk-form-group">
                  <label
                    className="tk-label"
                    htmlFor="create-user-name"
                  >
                    Name
                  </label>

                  <input
                    id="create-user-name"
                    className="tk-input"
                    required
                    maxLength={100}
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm({
                        ...createForm,
                        name:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="tk-form-group">
                  <label
                    className="tk-label"
                    htmlFor="create-user-email"
                  >
                    Email
                  </label>

                  <input
                    id="create-user-email"
                    className="tk-input"
                    type="email"
                    required
                    maxLength={254}
                    value={createForm.email}
                    onChange={(event) =>
                      setCreateForm({
                        ...createForm,
                        email:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="tk-form-group">
                  <label
                    className="tk-label"
                    htmlFor="create-user-role"
                  >
                    Role
                  </label>

                  <select
                    id="create-user-role"
                    className="tk-select"
                    value={createForm.role}
                    onChange={(event) =>
                      setCreateForm({
                        ...createForm,
                        role:
                          event.target
                            .value as AuthenticatedRole,
                      })
                    }
                  >
                    {ROLE_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="tk-form-group">
                  <label
                    className="tk-label"
                    htmlFor="create-user-password"
                  >
                    Initial Password
                  </label>

                  <input
                    id="create-user-password"
                    className="tk-input"
                    type="password"
                    required
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={
                      createForm.initialPassword
                    }
                    onChange={(event) =>
                      setCreateForm({
                        ...createForm,
                        initialPassword:
                          event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <label className="tk-admin-checkbox">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) =>
                    setCreateForm({
                      ...createForm,
                      isActive:
                        event.target.checked,
                    })
                  }
                />
                Active account
              </label>

              <div className="tk-button-row">
                <button
                  type="button"
                  className="tk-button tk-button-secondary"
                  onClick={() =>
                    setShowCreate(false)
                  }
                  disabled={working}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tk-button tk-button-primary"
                  disabled={working}
                >
                  {working
                    ? "Creating..."
                    : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {editingUser && (
        <section className="tk-card tk-admin-section">
          <div className="tk-card-body">
            <h2 className="tk-card-title">
              Edit User
            </h2>

            <p>
              Editing{" "}
              <strong>
                {editingUser.name}
              </strong>
            </p>

            <form onSubmit={handleUpdate}>
              <div className="tk-admin-form-grid">
                <div className="tk-form-group">
                  <label
                    className="tk-label"
                    htmlFor="edit-user-name"
                  >
                    Name
                  </label>

                  <input
                    id="edit-user-name"
                    className="tk-input"
                    required
                    maxLength={100}
                    value={editForm.name ?? ""}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        name:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="tk-form-group">
                  <label
                    className="tk-label"
                    htmlFor="edit-user-email"
                  >
                    Email
                  </label>

                  <input
                    id="edit-user-email"
                    className="tk-input"
                    type="email"
                    required
                    maxLength={254}
                    value={editForm.email ?? ""}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        email:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="tk-form-group">
                  <label
                    className="tk-label"
                    htmlFor="edit-user-role"
                  >
                    Role
                  </label>

                  <select
                    id="edit-user-role"
                    className="tk-select"
                    value={
                      editForm.role ??
                      "REQUESTER"
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        role:
                          event.target
                            .value as AuthenticatedRole,
                      })
                    }
                  >
                    {ROLE_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <label className="tk-admin-checkbox">
                <input
                  type="checkbox"
                  checked={
                    editForm.isActive ??
                    false
                  }
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      isActive:
                        event.target.checked,
                    })
                  }
                />
                Active account
              </label>

              {editingUser.id ===
                currentUserId &&
                editForm.isActive ===
                  false && (
                  <div className="tk-alert tk-alert-warning">
                    You cannot deactivate your
                    own account.
                  </div>
                )}

              <div className="tk-button-row">
                <button
                  type="button"
                  className="tk-button tk-button-secondary"
                  onClick={() =>
                    setEditingUser(null)
                  }
                  disabled={working}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tk-button tk-button-primary"
                  disabled={working}
                >
                  {working
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {passwordUser && (
        <section className="tk-card tk-admin-section">
          <div className="tk-card-body">
            <h2 className="tk-card-title">
              Set New Initial Password
            </h2>

            <p>
              Set a new initial password for{" "}
              <strong>
                {passwordUser.name}
              </strong>
              . They must change it after
              signing in.
            </p>

            <form
              onSubmit={handlePasswordReset}
            >
              <div className="tk-form-group">
                <label
                  className="tk-label"
                  htmlFor="new-initial-password"
                >
                  New Initial Password
                </label>

                <input
                  id="new-initial-password"
                  className="tk-input"
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  value={newInitialPassword}
                  onChange={(event) =>
                    setNewInitialPassword(
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="tk-button-row">
                <button
                  type="button"
                  className="tk-button tk-button-secondary"
                  onClick={() => {
                    setPasswordUser(null);
                    setNewInitialPassword("");
                  }}
                  disabled={working}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tk-button tk-button-primary"
                  disabled={working}
                >
                  {working
                    ? "Saving..."
                    : "Set Initial Password"}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      <section
        className="tk-card tk-admin-section"
        aria-label="Users"
      >
        <div className="tk-card-body">
          <h2 className="tk-card-title">
            User Accounts
          </h2>

          {loading ? (
            <div role="status">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="tk-admin-empty">
              No users found.
            </div>
          ) : (
            <div className="tk-admin-table-wrapper">
              <table className="tk-admin-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      Password
                    </th>
                    <th scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((managedUser) => (
                    <tr key={managedUser.id}>
                      <td>
                        <strong>
                          {managedUser.name}
                        </strong>

                        {managedUser.id ===
                          currentUserId && (
                          <span className="tk-admin-you">
                            {" "}
                            (You)
                          </span>
                        )}
                      </td>

                      <td>
                        {managedUser.email}
                      </td>

                      <td>
                        {roleLabel(
                          managedUser.role
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            managedUser.isActive
                              ? "tk-admin-status tk-admin-status-active"
                              : "tk-admin-status tk-admin-status-inactive"
                          }
                        >
                          {managedUser.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td>
                        {managedUser
                          .mustChangePassword
                          ? "Change required"
                          : "Current"}
                      </td>

                      <td>
                        <div className="tk-admin-actions">
                          <button
                            type="button"
                            className="tk-button tk-button-secondary tk-button-sm"
                            onClick={() =>
                              beginEdit(
                                managedUser
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="tk-button tk-button-secondary tk-button-sm"
                            onClick={() =>
                              beginPasswordReset(
                                managedUser
                              )
                            }
                          >
                            Set Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
