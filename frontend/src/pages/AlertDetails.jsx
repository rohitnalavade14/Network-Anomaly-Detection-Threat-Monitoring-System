import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  API_BASE_URL,
  authFetch,
} from "../utils/auth";


function AlertDetails() {
  const { alertId } = useParams();

  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const loadAlert = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch(
        `${API_BASE_URL}/alerts/${alertId}`
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(
          data.detail ||
          data.error ||
          "Unable to load alert."
        );
      }

      setAlert(data);
    } catch (error) {
      console.error(error);
      setError(
        error.message || "Unable to load alert."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadAlert();
  }, [alertId]);


  const updateStatus = async (status) => {
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
          data.detail ||
          data.error ||
          "Unable to update alert."
        );
      }

      await loadAlert();
    } catch (error) {
      console.error(error);

      setError(
        error.message || "Unable to update alert."
      );
    }
  };


  if (loading) {
    return (
      <div className="dashboard">
        <div className="page-card">
          <h2>Loading alert...</h2>
        </div>
      </div>
    );
  }


  if (error || !alert) {
    return (
      <div className="dashboard">
        <div className="page-card error-card">
          <h2>Unable to load alert</h2>

          <p>
            {error || "Alert not found."}
          </p>

          <Link
            to="/alerts"
            className="secondary-button link-button"
          >
            ← Back to Alerts
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="dashboard">
      <div className="back-link">
        <Link to="/alerts">
          ← Back to Alerts
        </Link>
      </div>

      <div className="page-header">
        <div>
          <p className="eyebrow">ALERT INVESTIGATION</p>

          <h1>Alert #{alert.alert_id}</h1>

          <p className="subtitle">
            Detailed network security alert investigation.
          </p>
        </div>

        <div className="detail-header-badges">
          <span
            className={`severity-badge ${String(
              alert.severity
            ).toLowerCase()}`}
          >
            {alert.severity}
          </span>

          <span
            className={`status-badge ${String(
              alert.status
            ).toLowerCase()}`}
          >
            {alert.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="page-card error-card">
          {error}
        </div>
      )}


      <div className="detail-card">
        <h2>Alert Overview</h2>

        <div className="detail-grid">
          <div>
            <strong>Attack Type</strong>
            <p>{alert.attack_type || "Unknown"}</p>
          </div>

          <div>
            <strong>Detection Time</strong>
            <p>
              {new Date(
                alert.timestamp
              ).toLocaleString()}
            </p>
          </div>

          <div>
            <strong>Risk Score</strong>
            <p>{alert.risk_score}</p>
          </div>

          <div>
            <strong>Severity</strong>
            <p>{alert.severity}</p>
          </div>

          <div>
            <strong>Status</strong>
            <p>{alert.status}</p>
          </div>

          <div>
            <strong>Source</strong>
            <p>{alert.source || "—"}</p>
          </div>

          <div>
            <strong>Source File</strong>
            <p>{alert.source_file || "—"}</p>
          </div>
        </div>
      </div>


      <div className="detail-card">
        <h2>Risk Factors</h2>

        <div className="detail-grid">
          <div>
            <strong>Binary ML Confidence</strong>
            <p>{alert.binary_confidence ?? "N/A"}</p>
          </div>

          <div>
            <strong>Attack Classification Confidence</strong>
            <p>{alert.attack_confidence ?? "N/A"}</p>
          </div>

          <div>
            <strong>Traffic Intensity</strong>
            <p>{alert.traffic_intensity ?? "N/A"}</p>
          </div>

          <div>
            <strong>Attack Frequency</strong>
            <p>{alert.attack_frequency ?? "N/A"}</p>
          </div>

          <div>
            <strong>Persistence</strong>
            <p>{alert.persistence ?? "N/A"}</p>
          </div>

          <div>
            <strong>ML Evidence</strong>
            <p>
              {alert.risk_factors?.ml_evidence ??
                "N/A"}
            </p>
          </div>
        </div>
      </div>


      <div className="detail-card">
        <h2>Risk Contribution</h2>

        {alert.risk_factors?.risk_contribution ? (
          <div className="detail-grid">
            {Object.entries(
              alert.risk_factors.risk_contribution
            ).map(([factor, value]) => (
              <div key={factor}>
                <strong>
                  {factor.replaceAll("_", " ")}
                </strong>

                <p>+{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            Risk contribution details are not available.
          </p>
        )}
      </div>


      <div className="detail-card">
        <h2>Network Traffic Details</h2>

        <p className="detail-description">
          Original network-flow values received when
          this alert was detected.
        </p>

        {alert.traffic_data ? (
          <div className="traffic-details">
            {Object.entries(
              alert.traffic_data
            ).map(([feature, value]) => (
              <div
                className="traffic-item"
                key={feature}
              >
                <strong>{feature}</strong>

                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            Network traffic details are not available.
          </p>
        )}
      </div>


      <div className="card action-card">
        <h2>Alert Actions</h2>

        <div className="action-buttons">
          {alert.status === "OPEN" && (
            <button
              className="primary-button"
              onClick={() =>
                updateStatus("ACKNOWLEDGED")
              }
            >
              Acknowledge
            </button>
          )}

          {alert.status === "ACKNOWLEDGED" && (
            <p className="action-message">
              This alert has been acknowledged.
            </p>
          )}

          {(alert.status === "OPEN" ||
            alert.status === "ACKNOWLEDGED") && (
            <button
              className="secondary-button"
              onClick={() =>
                updateStatus("RESOLVED")
              }
            >
              Resolve
            </button>
          )}

          {alert.status === "RESOLVED" && (
            <p className="action-message success-text">
              This alert has been resolved.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertDetails;
