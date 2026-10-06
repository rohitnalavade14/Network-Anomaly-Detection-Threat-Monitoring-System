import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  API_BASE_URL,
  authFetch,
} from "../utils/auth";


function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const loadAlerts = async (selectedFilter = filter) => {
    setLoading(true);
    setError("");

    try {
      const url =
        selectedFilter === "ALL"
          ? `${API_BASE_URL}/alerts`
          : `${API_BASE_URL}/alerts/status/${selectedFilter}`;

      const response = await authFetch(url);

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load alerts."
        );
      }

      setAlerts(data.alerts || []);
    } catch (error) {
      console.error(error);
      setError(
        error.message || "Unable to load alerts."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadAlerts("ALL");
  }, []);


  const changeFilter = (newFilter) => {
    setFilter(newFilter);
    loadAlerts(newFilter);
  };


  const updateStatus = async (alertId, status) => {
    try {
      const response = await authFetch(
        `${API_BASE_URL}/alerts/${alertId}?status=${status}`,
        {
          method: "PATCH",
        }
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to update alert status."
        );
      }

      await loadAlerts(filter);
    } catch (error) {
      console.error(error);
      setError(
        error.message || "Unable to update alert."
      );
    }
  };


  const filterOptions = [
    "ALL",
    "OPEN",
    "ACKNOWLEDGED",
    "RESOLVED",
  ];


  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <p className="eyebrow">INCIDENT MANAGEMENT</p>

          <h1>Alert Management</h1>

          <p className="subtitle">
            Review detected threats and manage the alert lifecycle.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        {filterOptions.map((option) => (
          <button
            key={option}
            className={
              filter === option
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() => changeFilter(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {error && (
        <div className="page-card error-card">
          <p>{error}</p>

          <button
            className="secondary-button"
            onClick={() => loadAlerts(filter)}
          >
            Retry
          </button>
        </div>
      )}

      <div className="alerts-container">
        <div className="section-heading">
          <div>
            <h2>
              {filter === "ALL"
                ? "All Alerts"
                : `${filter} Alerts`}
            </h2>

            <p className="muted">
              {alerts.length} alert
              {alerts.length === 1 ? "" : "s"} shown.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            No alerts found for this status.
          </div>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Time</th>
                <th>Attack Type</th>
                <th className="cell-num">Risk Score</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.alert_id}
                  className={`row-${String(alert.severity).toLowerCase()}`}
                >
                  <td>
                    <Link
                      to={`/alerts/${alert.alert_id}`}
                      className="table-link"
                    >
                      #{alert.alert_id}
                    </Link>
                  </td>

                  <td className="cell-time">
                    {new Date(
                      alert.timestamp
                    ).toLocaleString()}
                  </td>

                  <td>
                    <Link
                      to={`/alerts/${alert.alert_id}`}
                      className="table-link"
                    >
                      {alert.attack_type || "Unknown"}
                    </Link>
                  </td>

                  <td className="cell-num">{alert.risk_score}</td>

                  <td>
                    <span
                      className={`severity-badge ${String(
                        alert.severity
                      ).toLowerCase()}`}
                    >
                      {alert.severity}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`status-badge ${String(
                        alert.status
                      ).toLowerCase()}`}
                    >
                      {alert.status}
                    </span>
                  </td>

                  <td>
                    {alert.status === "OPEN" && (
                      <button
                        className="small-button"
                        onClick={() =>
                          updateStatus(
                            alert.alert_id,
                            "ACKNOWLEDGED"
                          )
                        }
                      >
                        Acknowledge
                      </button>
                    )}

                    {alert.status === "ACKNOWLEDGED" && (
                      <button
                        className="small-button"
                        onClick={() =>
                          updateStatus(
                            alert.alert_id,
                            "RESOLVED"
                          )
                        }
                      >
                        Resolve
                      </button>
                    )}

                    {alert.status === "RESOLVED" && (
                      <span className="resolved-label">
                        Resolved
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Alerts;
