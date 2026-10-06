import { useEffect, useState } from "react";
import { Link } from "react-router-dom";


function LiveMonitoring() {
  const [liveStatus, setLiveStatus] = useState("Disconnected");

  const [statistics, setStatistics] = useState({
    total_traffic: 0,
    benign_count: 0,
    attack_count: 0,
    critical_alerts: 0,
    high_alerts: 0,
    medium_alerts: 0,
    low_alerts: 0,
  });

  const [events, setEvents] = useState([]);


  useEffect(() => {
    const socket = new WebSocket(
      "ws://127.0.0.1:8000/ws/dashboard"
    );

    socket.onopen = () => {
      setLiveStatus("Connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.status === "connected") {
          return;
        }

        if (data.statistics) {
          setStatistics(data.statistics);
        }

        if (data.prediction) {
          const newEvent = {
            id: Date.now() + Math.random(),
            prediction: data.prediction.prediction,
            attack_type: data.prediction.attack_type,
            risk_score: data.prediction.risk_score,
            severity: data.prediction.severity,
            alert: data.alert,
          };

          setEvents((previousEvents) => [
            newEvent,
            ...previousEvents.slice(0, 99),
          ]);
        }
      } catch (error) {
        console.error(
          "Invalid monitoring WebSocket message:",
          error
        );
      }
    };

    socket.onclose = () => {
      setLiveStatus("Disconnected");
    };

    socket.onerror = () => {
      setLiveStatus("Error");
    };

    return () => {
      socket.close();
    };
  }, []);


  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <p className="eyebrow">REAL-TIME MONITORING</p>

          <h1>Live Monitoring</h1>

          <p className="subtitle">
            Real-time network traffic and threat monitoring.
          </p>
        </div>

        <div className="live-indicator">
          <span
            className={
              liveStatus === "Connected"
                ? "live-dot connected"
                : "live-dot"
            }
          />

          Live Monitoring: {liveStatus}
        </div>
      </div>


      <div className="cards">
        <div className="card metric-card">
          <span className="metric-label">
            Total Traffic
          </span>
          <strong>
            {statistics.total_traffic}
          </strong>
        </div>

        <div className="card metric-card">
          <span className="metric-label">
            Benign Traffic
          </span>
          <strong>
            {statistics.benign_count}
          </strong>
        </div>

        <div className="card metric-card danger-metric">
          <span className="metric-label">
            Attacks Detected
          </span>
          <strong>
            {statistics.attack_count}
          </strong>
        </div>

        <div className="card severity-card critical">
          <span className="metric-label">
            Critical Alerts
          </span>
          <strong>
            {statistics.critical_alerts}
          </strong>
        </div>

        <div className="card severity-card high">
          <span className="metric-label">
            High Alerts
          </span>
          <strong>
            {statistics.high_alerts}
          </strong>
        </div>

        <div className="card severity-card medium">
          <span className="metric-label">
            Medium Alerts
          </span>
          <strong>
            {statistics.medium_alerts}
          </strong>
        </div>

        <div className="card severity-card low">
          <span className="metric-label">
            Low Alerts
          </span>
          <strong>
            {statistics.low_alerts}
          </strong>
        </div>

        <div className="card metric-card">
          <span className="metric-label">
            Events Shown
          </span>
          <strong>
            {events.length}
          </strong>
          <small>Latest events in this session</small>
        </div>
      </div>


      <div className="alerts-container">
        <div className="section-heading">
          <div>
            <h2>Live Detection Stream</h2>
            <p className="muted">
              Incoming predictions broadcast by the monitoring WebSocket.
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            Waiting for network traffic events...
          </div>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Attack</th>
                <th className="cell-num">Risk</th>
                <th>Severity</th>
                <th>Alert</th>
              </tr>
            </thead>

            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className={`row-${String(event.severity).toLowerCase()}`}
                >
                  <td>
                    <span
                      className={
                        event.prediction === "ATTACK"
                          ? "danger-text"
                          : "success-text"
                      }
                    >
                      {event.prediction}
                    </span>
                  </td>

                  <td>
                    {event.alert?.alert_id ? (
                      <Link
                        to={`/alerts/${event.alert.alert_id}`}
                        className="table-link"
                      >
                        {event.attack_type || "Unknown"}
                      </Link>
                    ) : (
                      event.attack_type ||
                      "Normal traffic"
                    )}
                  </td>

                  <td className="cell-num">{event.risk_score}</td>

                  <td>
                    <span
                      className={`severity-badge ${String(
                        event.severity
                      ).toLowerCase()}`}
                    >
                      {event.severity}
                    </span>
                  </td>

                  <td>
                    {event.alert?.alert_id ? (
                      <Link
                        to={`/alerts/${event.alert.alert_id}`}
                        className="table-link"
                      >
                        View Alert
                      </Link>
                    ) : (
                      "—"
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

export default LiveMonitoring;
