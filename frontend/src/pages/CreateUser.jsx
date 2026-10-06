import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch, API_BASE_URL, getUser } from "../utils/auth";

function CreateUser() {
  const navigate = useNavigate();
  const currentUser = getUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="dashboard">
        <div className="page-card">
          <h1>Access Denied</h1>
          <p className="muted">
            Only an Admin can create Security Analyst accounts.
          </p>

          <button
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await authFetch(
        `${API_BASE_URL}/auth/create-analyst`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to create Security Analyst."
        );
      }

      setMessage(
        `Security Analyst ${data.email} created successfully.`
      );
      setEmail("");
      setPassword("");
    } catch (error) {
      setError(
        error.message || "Unable to create user."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Create User</h1>
          <p className="subtitle">
            Create a Security Analyst account for the NetShield platform.
          </p>
        </div>

        <span className="role-badge admin-badge">
          ADMIN
        </span>
      </div>

      <div className="form-card">
        <h2>Create Security Analyst</h2>

        <p className="muted form-description">
          New users created here receive the Security Analyst role.
        </p>

        <form onSubmit={handleCreateUser} className="user-form">
          <div className="form-group">
            <label htmlFor="analyst-email">
              Email
            </label>

            <input
              id="analyst-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="analyst@netshield.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="analyst-password">
              Temporary Password
            </label>

            <input
              id="analyst-password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter password"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          {message && (
            <div className="form-message success-message">
              {message}
            </div>
          )}

          {error && (
            <div className="form-message error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Security Analyst"}
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUser;
