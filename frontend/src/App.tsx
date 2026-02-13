import { useEffect, useMemo, useState } from "react";
import { apiFetch, login } from "./api";
import { FormSchema, User } from "./types";
import Login from "./pages/Login";
import FormView from "./pages/FormView";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [user, setUser] = useState<User | null>(null);
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState<string | null>(null);

  const activeForm = useMemo(
    () => forms.find((form) => form.role === activeRole) || null,
    [forms, activeRole]
  );

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    apiFetch<User>("/auth/me", {}, token)
      .then(setUser)
      .catch(() => setUser(null));
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      setForms([]);
      return;
    }
    apiFetch<FormSchema[]>("/forms", {}, token)
      .then((data) => {
        setForms(data);
        if (!activeRole) {
          const nextRole = data[0]?.role || null;
          setActiveRole(nextRole);
        }
      })
      .catch(() => setForms([]));
  }, [token, user]);

  useEffect(() => {
    if (!token || !activeRole) {
      setValues({});
      return;
    }
    apiFetch<{ values: Record<string, string | null> }>(
      `/forms/${activeRole}/values`,
      {},
      token
    )
      .then((data) => setValues(data.values))
      .catch(() => setValues({}));
  }, [token, activeRole]);

  const handleLogin = async (username: string, password: string) => {
    const newToken = await login(username, password);
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setForms([]);
    setActiveRole(null);
  };

  const handleSubmit = async (payload: Record<string, string | null>) => {
    if (!token || !activeRole) return;
    setMessage(null);
    await apiFetch(
      `/forms/${activeRole}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ values: payload }),
      },
      token
    );
    setMessage("Saved");
    const data = await apiFetch<{ values: Record<string, string | null> }>(
      `/forms/${activeRole}/values`,
      {},
      token
    );
    setValues(data.values);
  };

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  const availableRoles = forms.map((form) => form.role);
  const showRoleSwitch = availableRoles.length > 1 && !user.is_admin;
  const adminFormSelector = user.is_admin ? (
    <div className="field">
      <label>Browse Forms</label>
      <select
        value={activeRole || ""}
        onChange={(event) => setActiveRole(event.target.value)}
      >
        <option value="">Select form</option>
        {forms.map((form) => (
          <option key={form.role} value={form.role}>
            {form.form_name}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{ alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <h2>{user.is_admin ? "SCR Forms - Admin Dashboard" : "SCR Forms"}</h2>
            {!user.is_admin && <p>Signed in as {user.username}</p>}
          </div>
          <div>
            <button className="secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
        {showRoleSwitch && (
          <div className="field">
            <label>Choose Role</label>
            <select
              value={activeRole || ""}
              onChange={(event) => setActiveRole(event.target.value)}
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {user.is_admin && (
        <AdminDashboard token={token} />
      )}

      <FormView
        schema={activeForm}
        values={values}
        onSubmit={handleSubmit}
        headerContent={adminFormSelector}
      />
      {message && <p>{message}</p>}
    </div>
  );
}
