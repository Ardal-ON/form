import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { apiFetch } from "../api";
import { AuditLog, LdxFileInfo, User } from "../types";

type Props = {
  token: string;
};

type NewUserState = {
  username: string;
  password: string;
  roles: string[];
  is_admin: boolean;
};

export default function AdminDashboard({ token }: Props) {
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [watchDir, setWatchDir] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [ldxFiles, setLdxFiles] = useState<LdxFileInfo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState<NewUserState>({
    username: "",
    password: "",
    roles: [],
    is_admin: false,
  });
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [passwordEdits, setPasswordEdits] = useState<Record<number, string>>({});

  useEffect(() => {
    apiFetch<{ path: string | null }>("/admin/watch-directory", {}, token)
      .then((data) => setWatchDir(data.path || ""))
      .catch(() => setWatchDir(""));
  }, [token]);

  useEffect(() => {
    apiFetch<AuditLog[]>("/admin/audit?limit=100", {}, token)
      .then(setAudit)
      .catch(() => setAudit([]));
  }, [token]);

  useEffect(() => {
    apiFetch<string[]>("/roles", {}, token)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [token]);

  const loadLdxFiles = useCallback(async () => {
    try {
      const data = await apiFetch<LdxFileInfo[]>("/admin/ldx-files", {}, token);
      setLdxFiles(data);
    } catch {
      setLdxFiles([]);
    }
  }, [token]);

  useEffect(() => {
    loadLdxFiles();
  }, [loadLdxFiles]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiFetch<User[]>("/admin/users", {}, token);
      setUsers(data);
    } catch {
      setUsers([]);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSaveDir = async () => {
    setStatus(null);
    try {
      await apiFetch("/admin/watch-directory", {
        method: "PUT",
        body: JSON.stringify({ path: watchDir }),
      }, token);
      setStatus("Directory saved.");
      await loadLdxFiles();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const handleRoleToggle = (role: string) => {
    if (role === "admin") {
      setUserError(null);
      setNewUser((prev) => ({
        ...prev,
        is_admin: !prev.is_admin,
        roles: !prev.is_admin ? [] : prev.roles,
      }));
      return;
    }
    setNewUser((prev) => {
      const nextRoles = prev.roles.includes(role)
        ? prev.roles.filter((item) => item !== role)
        : [...prev.roles, role];
      if (nextRoles.length > 2) {
        setUserError("Select one or two roles.");
        return prev;
      }
      setUserError(null);
      return {
        ...prev,
        is_admin: false,
        roles: nextRoles,
      };
    });
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserStatus(null);
    setUserError(null);
    if (!newUser.username || !newUser.password) {
      setUserError("Username and password are required.");
      return;
    }
    if (!newUser.is_admin) {
      if (newUser.roles.length < 1 || newUser.roles.length > 2) {
        setUserError("Select one or two roles.");
        return;
      }
    }
    try {
      await apiFetch(
        "/admin/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: newUser.username,
            password: newUser.password,
            roles: newUser.roles,
            is_admin: newUser.is_admin,
          }),
        },
        token
      );
      setUserStatus("User created.");
      setNewUser({ username: "", password: "", roles: [], is_admin: false });
      await loadUsers();
    } catch (err) {
      setUserError((err as Error).message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setUserStatus(null);
    setUserError(null);
    try {
      await apiFetch(`/admin/users/${userId}`, { method: "DELETE" }, token);
      setUserStatus("User removed.");
      await loadUsers();
    } catch (err) {
      setUserError((err as Error).message);
    }
  };

  const handlePasswordUpdate = async (userId: number) => {
    const password = passwordEdits[userId];
    setUserStatus(null);
    setUserError(null);
    if (!password) {
      setUserError("Enter a password first.");
      return;
    }
    try {
      await apiFetch(
        `/admin/users/${userId}/password`,
        { method: "PUT", body: JSON.stringify({ password }) },
        token
      );
      setUserStatus("Password updated.");
      setPasswordEdits((prev) => ({ ...prev, [userId]: "" }));
    } catch (err) {
      setUserError((err as Error).message);
    }
  };

  const formatSize = (size: number) => `${size.toLocaleString()} bytes`;
  const formatLocalTime = (value: string) => {
    const hasZone = /Z|[+-]\d{2}:\d{2}$/.test(value);
    const parsed = new Date(hasZone ? value : `${value}Z`);
    return parsed.toLocaleString();
  };

  return (
    <div>
      <div className="card">
        <h4>Recent Changes</h4>
        <table className="table">
          <thead>
            <tr>
              <th>Form</th>
              <th>Field</th>
              <th>Old</th>
              <th>New</th>
              <th>When</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((log) => (
              <tr key={log.id}>
                <td>{log.form_name}</td>
                <td>{log.field_name}</td>
                <td>{log.old_value}</td>
                <td>{log.new_value}</td>
                <td>{formatLocalTime(log.changed_at)}</td>
                <td>{log.changed_by_name || log.changed_by || "N/A"}</td>
              </tr>
            ))}
            {audit.length === 0 && (
              <tr>
                <td colSpan={6}>No changes recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h4>LDX Files</h4>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {ldxFiles.map((file) => (
              <tr key={file.name}>
                <td>{file.name}</td>
                <td>{formatSize(file.size)}</td>
                <td>{formatLocalTime(file.modified_at)}</td>
              </tr>
            ))}
            {ldxFiles.length === 0 && (
              <tr>
                <td colSpan={3}>No LDX files found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="field">
          <h4>LDX Watch Directory</h4>
          <input
            value={watchDir}
            onChange={(event) => setWatchDir(event.target.value)}
          />
          <button type="button" onClick={handleSaveDir}>
            Save Directory
          </button>
          {status && <p>{status}</p>}
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <h4>Database Management</h4>
          <button
            type="button"
            onClick={() => window.open("http://localhost:8081", "_blank")}
            style={{ marginTop: 8 }}
          >
            Open SQLite Viewer
          </button>
          <p style={{ fontSize: "0.9em", color: "#666", marginTop: 8 }}>
            View and manage database records (e.g., delete LDX file records to reprocess them)
          </p>
        </div>
      </div>

      <div className="card">
        <h4>User Management</h4>
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Roles</th>
              <th>New Password</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.is_admin ? "Admin" : user.roles.join(", ")}</td>
                <td>
                  <input
                    type="password"
                    value={passwordEdits[user.id] || ""}
                    onChange={(event) =>
                      setPasswordEdits((prev) => ({
                        ...prev,
                        [user.id]: event.target.value,
                      }))
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => handlePasswordUpdate(user.id)}
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: 16 }} />
        <h5>Create User</h5>
        <form onSubmit={handleCreateUser}>
          <div className="field">
            <input
              placeholder="Username"
              value={newUser.username}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  username: event.target.value,
                }))
              }
            />
          </div>
          <div className="field">
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
            />
          </div>
          <div className="field">
            <p>Roles (choose 1-2) or Admin</p>
            <div className="role-grid">
              {[
                { value: "admin", label: "Admin" },
                ...roles.map((role) => ({
                  value: role,
                  label: role
                    .split(" ")
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(" "),
                })),
              ].map((role) => {
                const isAdmin = role.value === "admin";
                const selected = isAdmin
                  ? newUser.is_admin
                  : newUser.roles.includes(role.value);
                const disabled =
                  !selected && !isAdmin && newUser.roles.length >= 2;
                return (
                  <label
                    key={role.value}
                    className={`role-pill${selected ? " selected" : ""}${
                      disabled ? " disabled" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => handleRoleToggle(role.value)}
                    />
                    {role.label}
                  </label>
                );
              })}
            </div>
          </div>
          <button type="submit">Create User</button>
          {userStatus && <p>{userStatus}</p>}
          {userError && <p>{userError}</p>}
        </form>
      </div>
    </div>
  );
}
