import { useState } from "react";

import {
  API_BASE_URL,
  authFetch,
} from "../utils/auth";


function CSVUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");


  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    setFile(selectedFile || null);
    setResult(null);
    setError("");
    setProgress(0);
    setStage("");
  };


  const uploadFile = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    setProgress(0);
    setStage("Uploading document...");

    const stages = [
      {
        progress: 10,
        stage: "Reading CSV...",
        delay: 800,
      },
      {
        progress: 15,
        stage: "Validating columns...",
        delay: 1000,
      },
      {
        progress: 25,
        stage: "Reading network values...",
        delay: 1200,
      },
      {
        progress: 40,
        stage: "Running AI prediction...",
        delay: 1800,
      },
      {
        progress: 65,
        stage: "Classifying attack types...",
        delay: 2200,
      },
      {
        progress: 85,
        stage: "Updating analysis...",
        delay: 1800,
      },
      {
        progress: 95,
        stage: "Finalizing results...",
        delay: 1800,
      },
    ];

    const timers = [];
    let totalDelay = 0;

    stages.forEach((item) => {
      totalDelay += item.delay;

      const timer = setTimeout(() => {
        setProgress(item.progress);
        setStage(item.stage);
      }, totalDelay);

      timers.push(timer);
    });


    const formData = new FormData();
    formData.append("file", file);


    try {
      const response = await authFetch(
        `${API_BASE_URL}/upload-csv`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response) {
        timers.forEach(clearTimeout);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "CSV upload failed."
        );
      }

      timers.forEach(clearTimeout);

      setProgress(100);
      setStage("Analysis complete");

      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 500);
    } catch (error) {
      timers.forEach(clearTimeout);

      setError(
        error.message || "CSV upload failed."
      );

      setLoading(false);
      setProgress(0);
      setStage("");
    }
  };


  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <p className="eyebrow">AI TRAFFIC ANALYSIS</p>

          <h1>CSV Upload</h1>

          <p className="subtitle">
            Upload network traffic data for AI-based analysis.
          </p>
        </div>
      </div>


      <div className="detail-card">
        <h2>Upload Network Traffic CSV</h2>

        <p className="muted form-description">
          The backend processes large CSV files in chunks and stores detected attack alerts in PostgreSQL.
        </p>

        <input
          className="file-input"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
        />

        {file && (
          <div className="selected-file">
            <strong>Selected file</strong>
            <span>{file.name}</span>
          </div>
        )}

        <button
          className="primary-button"
          onClick={uploadFile}
          disabled={loading}
        >
          {loading
            ? "Analyzing..."
            : "Upload & Analyze"}
        </button>

        {error && (
          <div className="form-message error-message">
            {error}
          </div>
        )}
      </div>


      {loading && (
        <div className="detail-card">
          <div className="progress-header">
            <span>{stage}</span>
            <strong>{progress}%</strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-bar"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}


      {result && (
        <>
          <div className="detail-card">
            <h2>Analysis Summary</h2>

            <div className="detail-grid">
              <div>
                <strong>Total Records</strong>
                <p>
                  {result.total_records?.toLocaleString()}
                </p>
              </div>

              <div>
                <strong>Benign Records</strong>
                <p>
                  {result.benign_count?.toLocaleString()}
                </p>
              </div>

              <div>
                <strong>Attack Records</strong>
                <p>
                  {result.attack_count?.toLocaleString()}
                </p>
              </div>

              <div>
                <strong>Chunks Processed</strong>
                <p>
                  {result.chunks_processed ?? "N/A"}
                </p>
              </div>
            </div>
          </div>


          {result.attack_types && (
            <div className="detail-card">
              <h2>Attack Types</h2>

              <div className="attack-type-list">
                {Object.entries(
                  result.attack_types
                ).map(([attackType, count]) => (
                  <div
                    className="attack-type-row"
                    key={attackType}
                  >
                    <strong>{attackType}</strong>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}


          {result.predictions && (
            <div className="alerts-container">
              <div className="section-heading">
                <div>
                  <h2>Prediction Results</h2>
                  <p className="muted">
                    Showing the first 100 predictions returned by the backend preview.
                  </p>
                </div>
              </div>

              <table className="alerts-table">
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Prediction</th>
                    <th>Attack Type</th>
                    <th className="cell-num">Risk Score</th>
                    <th>Severity</th>
                  </tr>
                </thead>

                <tbody>
                  {result.predictions
                    .slice(0, 100)
                    .map((prediction, index) => (
                      <tr
                        key={index}
                        className={`row-${String(prediction.severity).toLowerCase()}`}
                      >
                        <td>{index + 1}</td>
                        <td>
                          <span
                            className={
                              prediction.prediction === "ATTACK"
                                ? "danger-text"
                                : "success-text"
                            }
                          >
                            {prediction.prediction}
                          </span>
                        </td>
                        <td>
                          {prediction.attack_type || "—"}
                        </td>
                        <td className="cell-num">
                          {prediction.risk_score}
                        </td>
                        <td>
                          <span
                            className={`severity-badge ${String(
                              prediction.severity
                            ).toLowerCase()}`}
                          >
                            {prediction.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {result.predictions.length > 100 && (
                <p className="table-note">
                  Showing first 100 records out of{" "}
                  {result.predictions.length} returned preview records.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CSVUpload;
