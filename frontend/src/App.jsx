import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import CSVUpload from "./pages/CSVUpload";
import LiveMonitoring from "./pages/LiveMonitoring";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AlertDetails from "./pages/AlertDetails";
import CreateUser from "./pages/CreateUser";

import {
  getToken,
  getUser,
  logout,
} from "./utils/auth";

import "./App.css";


function Icon({ name }) {
  const common = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "shield":
      return (
        <svg {...common} strokeWidth="1.6">
          <path d="M8 1.5 2.5 3.5v4.2c0 3.1 2.3 5.6 5.5 6.8 3.2-1.2 5.5-3.7 5.5-6.8V3.5L8 1.5Z" />
          <path d="m5.6 8 1.7 1.7L10.6 6.4" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="3.5" rx="1" />
          <rect x="9" y="7.5" width="5" height="6.5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
        </svg>
      );
    case "alerts":
      return (
        <svg {...common}>
          <path d="M8 2 1.8 13h12.4L8 2Z" />
          <path d="M8 6.5v3" />
          <path d="M8 11.4v.1" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M8 10.5V2.5" />
          <path d="m5 5.2 3-2.7 3 2.7" />
          <path d="M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...common}>
          <path d="M1.5 8h3l1.8-4.5L9.7 12.5 11.5 8h3" />
        </svg>
      );
    case "user-plus":
      return (
        <svg {...common}>
          <circle cx="6.5" cy="5.5" r="2.5" />
          <path d="M1.8 13.5c.4-2.4 2.3-3.8 4.7-3.8s4.3 1.4 4.7 3.8" />
          <path d="M12.5 4.5v4M10.5 6.5h4" />
        </svg>
      );
    default:
      return null;
  }
}


function ProtectedRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


function AdminRoute({ children }) {
  const user = getUser();

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}


function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const token = getToken();
  const user = getUser();

  const isLoginPage = location.pathname === "/login";

  if (!token || isLoginPage) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar">
      <Link
        to="/dashboard"
        className="navbar-brand"
      >
        <span className="brand-mark">
          <Icon name="shield" />
        </span>

        <span>
          <strong>NetShield AI</strong>
          <small>Threat Monitoring Platform</small>
        </span>
      </Link>

      <div className="nav-links">
        <span className="nav-section">Operations</span>

        <Link
          to="/dashboard"
          className={
            location.pathname === "/" ||
            location.pathname === "/dashboard"
              ? "active"
              : ""
          }
        >
          <Icon name="dashboard" />
          Dashboard
        </Link>

        <Link
          to="/alerts"
          className={
            location.pathname.startsWith("/alerts")
              ? "active"
              : ""
          }
        >
          <Icon name="alerts" />
          Alerts
        </Link>

        <Link
          to="/csv-upload"
          className={
            location.pathname === "/csv-upload"
              ? "active"
              : ""
          }
        >
          <Icon name="upload" />
          CSV Upload
        </Link>

        <Link
          to="/monitoring"
          className={
            location.pathname === "/monitoring"
              ? "active"
              : ""
          }
        >
          <Icon name="monitor" />
          Live Monitoring
        </Link>

        {user?.role === "admin" && (
          <>
          <span className="nav-section">Administration</span>

          <Link
            to="/create-user"
            className={
              location.pathname === "/create-user"
                ? "active admin-link"
                : "admin-link"
            }
          >
            <Icon name="user-plus" />
            Create User
          </Link>
          </>
        )}

        <div className="nav-user">
          <span className="user-email">
            {user?.email || "User"}
          </span>

          <span className="role-badge">
            {user?.role === "admin"
              ? "ADMIN"
              : "SECURITY ANALYST"}
          </span>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}


function AppRoutes() {
  return (
    <>
      <NavigationBar />

      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <Alerts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alerts/:alertId"
          element={
            <ProtectedRoute>
              <AlertDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/csv-upload"
          element={
            <ProtectedRoute>
              <CSVUpload />
            </ProtectedRoute>
          }
        />

        <Route
          path="/monitoring"
          element={
            <ProtectedRoute>
              <LiveMonitoring />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-user"
          element={
            <AdminRoute>
              <CreateUser />
            </AdminRoute>
          }
        />

        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>
    </>
  );
}


function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
