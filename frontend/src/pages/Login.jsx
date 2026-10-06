import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../utils/auth";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Login failed. Please check your credentials."
        );
      }

      localStorage.setItem(
        "access_token",
        data.access_token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(
        error.message || "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-aside">
        <div className="login-aside-brand">
          <span className="brand-mark">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 1.5 2.5 3.5v4.2c0 3.1 2.3 5.6 5.5 6.8 3.2-1.2 5.5-3.7 5.5-6.8V3.5L8 1.5Z" />
              <path d="m5.6 8 1.7 1.7L10.6 6.4" />
            </svg>
          </span>
          NetShield AI
        </div>

        <div className="login-aside-body">
          <h2>Network intrusion detection, built for analysts.</h2>
          <p>
            Detect anomalies, classify attacks and triage alerts from a single workspace.
          </p>

          <ul className="login-features">
            <li><span>01</span>ML-based anomaly detection and attack classification</li>
            <li><span>02</span>Live traffic monitoring over a streaming connection</li>
            <li><span>03</span>Alert lifecycle from open to resolved</li>
          </ul>
        </div>

        <div className="login-aside-foot">Threat Monitoring Platform</div>
      </aside>

      <div className="login-main">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 1.5 2.5 3.5v4.2c0 3.1 2.3 5.6 5.5 6.8 3.2-1.2 5.5-3.7 5.5-6.8V3.5L8 1.5Z" />
              <path d="m5.6 8 1.7 1.7L10.6 6.4" />
            </svg>
          </span>
          NetShield AI
        </div>

        <div className="login-header">
          <p className="eyebrow">NETSHIELD AI</p>

          <h1>Secure Login</h1>

          <p className="login-subtitle">
            Sign in to access network threat monitoring and security analytics.
          </p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="login-email">
              Email
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="form-message error-message">
              {error}
            </div>
          )}

          <button
            className="primary-button login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="login-note">
          <strong>Access</strong>
          <span>
            Admin and Security Analyst accounts are created and managed by the backend.
          </span>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Login;
