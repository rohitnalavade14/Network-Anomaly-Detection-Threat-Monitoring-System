import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="dashboard">
      <div className="page-card not-found-card">
        <p className="eyebrow">NETSHIELD AI</p>

        <h1>404</h1>

        <p className="subtitle">
          The page you are looking for does not exist.
        </p>

        <Link
          to="/dashboard"
          className="primary-button link-button"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
