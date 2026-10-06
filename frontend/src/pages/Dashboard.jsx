import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";

import { API_BASE_URL, authFetch } from "../utils/auth";


function Dashboard() {
  const [traffic, setTraffic] = useState({
    total_traffic: 0,
    benign_traffic: 0,
    attack_traffic: 0,
    benign_percentage: 0,
    attack_percentage: 0,
  });

  const [summary, setSummary] = useState({
    total_alerts: 0,
    severity: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    },
    status: {
      OPEN: 0,
      ACKNOWLEDGED: 0,
      RESOLVED: 0,
    },
    attack_types: {},
  });

  const [attackTrend, setAttackTrend] = useState([]);
  const [attackTypes, setAttackTypes] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [liveStatus, setLiveStatus] = useState("Disconnected");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const loadDashboardData = async () => {
    setError("");

    try {
      const responses = await Promise.all([
        authFetch(`${API_BASE_URL}/analytics/traffic`),
        authFetch(`${API_BASE_URL}/analytics/summary`),
        authFetch(`${API_BASE_URL}/analytics/attack-trend`),
        authFetch(`${API_BASE_URL}/analytics/attack-types`),
        authFetch(`${API_BASE_URL}/alerts`),
      ]);

      if (responses.some((response) => response === null)) {
        return;
      }

      const [
        trafficResponse,
        summaryResponse,
        trendResponse,
        typesResponse,
        alertsResponse,
      ] = responses;

      if (
        !trafficResponse.ok ||
        !summaryResponse.ok ||
        !trendResponse.ok ||
        !typesResponse.ok ||
        !alertsResponse.ok
      ) {
        throw new Error("Unable to load dashboard data.");
      }

      const [
        trafficData,
        summaryData,
        trendData,
        typesData,
        alertsData,
      ] = await Promise.all(
        responses.map((response) => response.json())
      );

      setTraffic({
        total_traffic: trafficData.total_traffic ?? 0,
        benign_traffic: trafficData.benign_traffic ?? 0,
        attack_traffic: trafficData.attack_traffic ?? 0,
        benign_percentage: trafficData.benign_percentage ?? 0,
        attack_percentage: trafficData.attack_percentage ?? 0,
      });

      setSummary({
        total_alerts: summaryData.total_alerts ?? 0,
        severity: {
          CRITICAL: summaryData.severity?.CRITICAL ?? 0,
          HIGH: summaryData.severity?.HIGH ?? 0,
          MEDIUM: summaryData.severity?.MEDIUM ?? 0,
          LOW: summaryData.severity?.LOW ?? 0,
        },
        status: {
          OPEN: summaryData.status?.OPEN ?? 0,
          ACKNOWLEDGED: summaryData.status?.ACKNOWLEDGED ?? 0,
          RESOLVED: summaryData.status?.RESOLVED ?? 0,
        },
        attack_types: summaryData.attack_types || {},
      });

      setAttackTrend(trendData.trend || []);
      setAttackTypes(typesData.attack_types || []);
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error(error);
      setError(
        error.message || "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadDashboardData();
  }, []);


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
          const statistics = data.statistics;

          setTraffic((previousTraffic) => ({
            ...previousTraffic,
            total_traffic:
              statistics.total_traffic ??
              previousTraffic.total_traffic,
            benign_traffic:
              statistics.benign_count ??
              previousTraffic.benign_traffic,
            attack_traffic:
              statistics.attack_count ??
              previousTraffic.attack_traffic,
          }));
        }

        if (data.alert) {
          const newAlert = data.alert;

          setAlerts((previousAlerts) => [
            newAlert,
            ...previousAlerts,
          ]);

          setSummary((previousSummary) => ({
            ...previousSummary,
            total_alerts:
              previousSummary.total_alerts + 1,
            status: {
              ...previousSummary.status,
              OPEN:
                previousSummary.status.OPEN + 1,
            },
            severity: {
              ...previousSummary.severity,
              [newAlert.severity]:
                (previousSummary.severity[
                  newAlert.severity
                ] || 0) + 1,
            },
          }));
        }
      } catch (error) {
        console.error(
          "Invalid dashboard WebSocket message:",
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
          <p className="eyebrow">SECURITY OPERATIONS OVERVIEW</p>

          <h1>NetShield AI</h1>

          <p className="subtitle">
            Network anomaly detection, intrusion prediction and threat monitoring.
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
          Live monitoring: {liveStatus}
        </div>
      </div>

      {loading && (
        <div className="page-card">
          <p>Loading security analytics...</p>
        </div>
      )}

      {error && !loading && (
        <div className="page-card error-card">
          <strong>Dashboard error</strong>
          <p>{error}</p>

          <button
            className="secondary-button"
            onClick={loadDashboardData}
          >
            Retry
          </button>
        </div>
      )}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Traffic Overview</h2>
            <p className="muted">
              Current traffic statistics from the monitoring service.
            </p>
          </div>
        </div>

        <div className="cards">
          <div className="card metric-card">
            <span className="metric-label">Total Traffic</span>
            <strong>{traffic.total_traffic.toLocaleString()}</strong>
          </div>

          <div className="card metric-card">
            <span className="metric-label">Benign Traffic</span>
            <strong>{traffic.benign_traffic.toLocaleString()}</strong>
            <small>{traffic.benign_percentage}% of traffic</small>
          </div>

          <div className="card metric-card danger-metric">
            <span className="metric-label">Attacks Detected</span>
            <strong>{traffic.attack_traffic.toLocaleString()}</strong>
            <small>{traffic.attack_percentage}% of traffic</small>
          </div>

          <div className="card metric-card">
            <span className="metric-label">Total Alerts</span>
            <strong>{summary.total_alerts.toLocaleString()}</strong>
            <small>Stored in PostgreSQL</small>
          </div>
        </div>

        <div
          className="ratio-bar"
          role="img"
          aria-label="Benign versus attack traffic ratio"
        >
          <div className="ratio-track">
            <span
              className="ratio-seg benign"
              style={{
                flexGrow: traffic.benign_traffic || 0,
              }}
            />
            <span
              className="ratio-seg attack"
              style={{
                flexGrow: traffic.attack_traffic || 0,
              }}
            />
          </div>

          <div className="ratio-legend">
            <span><i className="benign" />Benign</span>
            <span><i className="attack" />Attack</span>
          </div>
        </div>
      </section>


      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Alert Status</h2>
            <p className="muted">
              Incident lifecycle across all stored alerts.
            </p>
          </div>
        </div>

        <div className="cards">
          <div className="card status-card open-card">
            <span className="metric-label">Open</span>
            <strong>{summary.status.OPEN}</strong>
            <small>Requires attention</small>
          </div>

          <div className="card status-card acknowledged-card">
            <span className="metric-label">Acknowledged</span>
            <strong>{summary.status.ACKNOWLEDGED}</strong>
            <small>Under investigation</small>
          </div>

          <div className="card status-card resolved-card">
            <span className="metric-label">Resolved</span>
            <strong>{summary.status.RESOLVED}</strong>
            <small>Closed incidents</small>
          </div>

          <div className="card status-card">
            <span className="metric-label">Open Rate</span>
            <strong>
              {summary.total_alerts
                ? (
                    (summary.status.OPEN /
                      summary.total_alerts) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </strong>
            <small>Of all alerts</small>
          </div>
        </div>
      </section>


      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Severity Distribution</h2>
            <p className="muted">
              Risk severity currently stored in the alert database.
            </p>
          </div>
        </div>

        <div className="cards">
          <div className="card severity-card critical">
            <span className="metric-label">Critical</span>
            <strong>{summary.severity.CRITICAL}</strong>
          </div>

          <div className="card severity-card high">
            <span className="metric-label">High</span>
            <strong>{summary.severity.HIGH}</strong>
          </div>

          <div className="card severity-card medium">
            <span className="metric-label">Medium</span>
            <strong>{summary.severity.MEDIUM}</strong>
          </div>

          <div className="card severity-card low">
            <span className="metric-label">Low</span>
            <strong>{summary.severity.LOW}</strong>
          </div>
        </div>

        <div
          className="ratio-bar"
          role="img"
          aria-label="Severity distribution"
        >
          <div className="ratio-track">
            <span className="ratio-seg critical" style={{ flexGrow: summary.severity.CRITICAL }} />
            <span className="ratio-seg high" style={{ flexGrow: summary.severity.HIGH }} />
            <span className="ratio-seg medium" style={{ flexGrow: summary.severity.MEDIUM }} />
            <span className="ratio-seg low" style={{ flexGrow: summary.severity.LOW }} />
          </div>

          <div className="ratio-legend">
            <span><i className="critical" />Critical</span>
            <span><i className="high" />High</span>
            <span><i className="medium" />Medium</span>
            <span><i className="low" />Low</span>
          </div>
        </div>
      </section>


      <section className="charts-row">
        <div className="chart-container attack-trend-chart">
  <div className="chart-header">
    <div>
      <div className="chart-title-row">
        <span className="chart-status-dot"></span>
        <h2>Attack Trend</h2>
      </div>

      <p className="muted">
        Daily attack alerts stored in PostgreSQL.
      </p>
    </div>

    <div className="chart-metric">
      <span className="chart-metric-label">Activity</span>
      <span className="chart-metric-value">LIVE</span>
    </div>
  </div>

  {attackTrend.length > 0 ? (
    <div className="attack-trend-wrapper">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={attackTrend}
          margin={{ top: 15, right: 8, left: -12, bottom: 5 }}
        >
          <defs>
            <linearGradient
              id="trendFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#4f8dff"
                stopOpacity={0.38}
              />
              <stop
                offset="55%"
                stopColor="#4f8dff"
                stopOpacity={0.12}
              />
              <stop
                offset="100%"
                stopColor="#4f8dff"
                stopOpacity={0}
              />
            </linearGradient>

            <linearGradient
              id="trendStroke"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#6ea1ff" />
              <stop offset="50%" stopColor="#4f8dff" />
              <stop offset="100%" stopColor="#8ab4ff" />
            </linearGradient>

            <filter
              id="trendGlow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="#252a33"
            strokeDasharray="3 5"
            strokeOpacity={0.65}
          />

          <XAxis
            dataKey="date"
            tick={{
              fill: "#777e8c",
              fontSize: 11,
              fontWeight: 500,
            }}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />

          <YAxis
            allowDecimals={false}
            tick={{
              fill: "#777e8c",
              fontSize: 11,
              fontWeight: 500,
            }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickMargin={8}
          />

          <Tooltip
            cursor={{
              stroke: "#4f8dff",
              strokeOpacity: 0.35,
              strokeDasharray: "4 4",
            }}
            contentStyle={{
              background: "rgba(18, 21, 27, 0.96)",
              border: "1px solid #303744",
              borderRadius: 10,
              padding: "10px 13px",
              boxShadow: "0 12px 35px rgba(0, 0, 0, 0.35)",
              backdropFilter: "blur(10px)",
            }}
            labelStyle={{
              color: "#9ba3b2",
              fontSize: 11,
              fontWeight: 500,
              marginBottom: 5,
            }}
            itemStyle={{
              color: "#8ab4ff",
              fontSize: 13,
              fontWeight: 700,
            }}
            formatter={(value) => [value, "Attack Alerts"]}
          />

          <Area
            type="monotone"
            dataKey="attack_count"
            stroke="url(#trendStroke)"
            strokeWidth={2.5}
            fill="url(#trendFill)"
            filter="url(#trendGlow)"
            dot={{
              r: 3,
              fill: "#4f8dff",
              stroke: "#11151c",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: "#6ea1ff",
              stroke: "#10141b",
              strokeWidth: 3,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <div className="empty-state">
      No attack trend data available yet.
    </div>
  )}
</div>


        <div className="chart-container">
          <div className="chart-header">
            <div>
              <h2>Attack Type Distribution</h2>
              <p className="muted">
                Detected attack categories.
              </p>
            </div>
          </div>

          {attackTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={attackTypes}
                  dataKey="count"
                  nameKey="attack_type"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="#141518"
                  label={{ fill: "#a4a8b0", fontSize: 11 }}
                >
                  {attackTypes.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        [
                          "#3b7cf0",
                          "#f0555a",
                          "#e5b93c",
                          "#3fb67a",
                          "#8e6bd9",
                          "#2bb5ad",
                          "#d6409f",
                          "#70757f",
                          "#012977",
                        ][index % 8]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    background: "#191b1f",
                    border: "1px solid #34373e",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#e8e9eb",
                  }}
                  itemStyle={{ color: "#e8e9eb" }}
                />

                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: 12,
                    color: "#a4a8b0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              No attack type data available yet.
            </div>
          )}
        </div>
      </section>


      <section className="alerts-container">
        <div className="section-heading">
          <div>
            <h2>Recent Alerts</h2>
            <p className="muted">
              Latest detected threats from the alert database.
            </p>
          </div>

          <Link
            to="/alerts"
            className="text-link"
          >
            View all alerts →
          </Link>
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state">
            No alerts have been generated yet.
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
              </tr>
            </thead>

            <tbody>
              {alerts
                .slice(0, 10)
                .map((alert) => (
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
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
