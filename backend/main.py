from fastapi import (
    FastAPI,
    UploadFile,
    File,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, create_model

from backend.predict import (
    predict_traffic,
    predict_batch,
    apply_risk_score,
)
from backend.risk_engine import (
    calculate_frequency_score,
    calculate_persistence_score,
)
from backend.database import SessionLocal
from backend.db_models import Alert

import joblib
import numpy as np
import pandas as pd

from collections import deque


# =========================================================
# FastAPI application
# =========================================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Basic routes
# =========================================================

@app.get("/")
def home():
    return {
        "message": "NetShield AI Backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "NetShield AI",
        "models": "loaded",
    }


# =========================================================
# Model feature columns
# =========================================================

feature_columns = joblib.load(
    "models/feature_columns.pkl"
)


# =========================================================
# Dynamic Pydantic models for the 78 features
# =========================================================

fields = {}

for i, column in enumerate(feature_columns):
    fields[f"feature_{i}"] = (
        float,
        Field(..., alias=column),
    )


TrafficData = create_model(
    "TrafficData",
    __base__=BaseModel,
    **fields,
)

BatchTrafficData = create_model(
    "BatchTrafficData",
    records=(list[TrafficData], ...),
)


# =========================================================
# Single prediction
# =========================================================

@app.post("/predict")
def predict(data: TrafficData):  # type: ignore[valid-type]
    data_dict = data.model_dump(by_alias=True)
    df = pd.DataFrame([data_dict])

    result = predict_traffic(df)

    return result


# =========================================================
# Batch prediction
# =========================================================

@app.post("/predict/batch")
def predict_batch_endpoint(data: BatchTrafficData):  # type: ignore[valid-type]
    records = data.records

    data_dict = [
        record.model_dump(by_alias=True)
        for record in records
    ]

    df = pd.DataFrame(data_dict)
    predictions = predict_batch(df)

    return {
        "total_records": len(predictions),
        "predictions": predictions,
    }


# =========================================================
# Live monitoring statistics
# =========================================================

monitor_stats = {
    "total_traffic": 0,
    "benign_count": 0,
    "attack_count": 0,
    "critical_alerts": 0,
    "high_alerts": 0,
    "medium_alerts": 0,
    "low_alerts": 0,
    "attack_types": {},
}


# =========================================================
# Alert creation for live/single records
# =========================================================

def create_alert(
    result,
    traffic_data=None,
    source="LIVE",
    source_file=None,
):
    if not result["alert"]["alert"]:
        return None

    db = SessionLocal()

    try:
        new_alert = Alert(
            attack_type=result["attack_type"],
            risk_score=result["risk_score"],
            severity=result["severity"],
            status="OPEN",
            binary_confidence=result["binary_confidence"],
            attack_confidence=result["attack_confidence"],
            traffic_intensity=result["traffic_intensity"],
            attack_frequency=result["attack_frequency"],
            persistence=result["persistence"],
            risk_factors=result.get("risk_factors", {}),
            traffic_data=traffic_data,
            source=source,
            source_file=source_file,
        )

        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)

        return {
            "alert_id": new_alert.id,
            "timestamp": new_alert.timestamp.isoformat(),
            "attack_type": new_alert.attack_type,
            "risk_score": new_alert.risk_score,
            "severity": new_alert.severity,
            "status": new_alert.status,
            "binary_confidence": new_alert.binary_confidence,
            "attack_confidence": new_alert.attack_confidence,
            "traffic_intensity": new_alert.traffic_intensity,
            "attack_frequency": new_alert.attack_frequency,
            "persistence": new_alert.persistence,
            "risk_factors": new_alert.risk_factors,
            "traffic_data": new_alert.traffic_data,
            "source": new_alert.source,
            "source_file": new_alert.source_file,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# =========================================================
# Batch alert creation for CSV uploads
# =========================================================
# IMPORTANT:
# CSV alerts are inserted once per CSV chunk instead of
# opening/committing a separate DB transaction for every row.
# =========================================================

def create_csv_alerts(
    attack_records,
    source_file,
):
    if not attack_records:
        return 0

    db = SessionLocal()

    try:
        alerts_to_insert = []

        for prediction, traffic_data in attack_records:
            new_alert = Alert(
                attack_type=prediction["attack_type"],
                risk_score=prediction["risk_score"],
                severity=prediction["severity"],
                status="OPEN",
                binary_confidence=prediction["binary_confidence"],
                attack_confidence=prediction["attack_confidence"],
                traffic_intensity=prediction["traffic_intensity"],
                attack_frequency=prediction["attack_frequency"],
                persistence=prediction["persistence"],
                risk_factors=prediction.get("risk_factors", {}),
                traffic_data=traffic_data,
                source="CSV",
                source_file=source_file,
            )

            alerts_to_insert.append(new_alert)

        db.add_all(alerts_to_insert)
        db.commit()

        return len(alerts_to_insert)

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# =========================================================
# CSV upload and prediction
# =========================================================

@app.post("/upload-csv")
def upload_csv(file: UploadFile = File(...)):
    filename = file.filename or "uploaded.csv"

    if not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed.",
        )

    CHUNK_SIZE = 5000

    total_records = 0
    benign_count = 0
    attack_count = 0

    attack_types = {}
    preview_predictions = []
    chunks_processed = 0

    try:
        reader = pd.read_csv(
            file.file,
            chunksize=CHUNK_SIZE,
        )

        first_chunk = next(reader, None)

        if first_chunk is None:
            raise HTTPException(
                status_code=400,
                detail="CSV file is empty.",
            )

        # Handles raw CICIDS files whose headers may contain spaces.
        first_chunk.columns = (
            first_chunk.columns.str.strip()
        )

        # -------------------------------------------------
        # Validate required model columns
        # -------------------------------------------------

        missing_columns = [
            column
            for column in feature_columns
            if column not in first_chunk.columns
        ]

        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Missing required columns",
                    "missing_columns": missing_columns,
                },
            )

        # -------------------------------------------------
        # Process one chunk
        # -------------------------------------------------

        def process_chunk(chunk):
            nonlocal total_records
            nonlocal benign_count
            nonlocal attack_count
            nonlocal chunks_processed

            # Clean raw CICIDS headers.
            chunk.columns = (
                chunk.columns.str.strip()
            )

            # Convert infinite values to missing values.
            # predict_batch() then applies the project's
            # stored preprocessing values.
            chunk = chunk.replace(
                [np.inf, -np.inf],
                np.nan,
            )

            X = chunk[feature_columns]

            # ---------------------------------------------
            # Predict the whole chunk at once
            # ---------------------------------------------

            predictions = predict_batch(X)

            # ---------------------------------------------
            # Count + collect attack alerts
            # ---------------------------------------------

            attack_records = []

            for i, prediction in enumerate(predictions):
                if prediction["prediction"] == "ATTACK":
                    attack_count += 1

                    attack_type = prediction["attack_type"]

                    if attack_type is not None:
                        attack_types[attack_type] = (
                            attack_types.get(
                                attack_type,
                                0,
                            ) + 1
                        )

                    traffic_data = (
                        X.iloc[i].to_dict()
                    )

                    attack_records.append(
                        (
                            prediction,
                            traffic_data,
                        )
                    )

                else:
                    benign_count += 1

                # Return only the first 100 predictions
                # to keep the HTTP response small.
                if len(preview_predictions) < 100:
                    preview_predictions.append(
                        prediction
                    )

            # ---------------------------------------------
            # ONE DB transaction for this chunk
            # ---------------------------------------------

            create_csv_alerts(
                attack_records,
                filename,
            )

            chunks_processed += 1
            total_records += len(predictions)

        # First chunk was already read for validation.
        process_chunk(first_chunk)

        # Remaining chunks.
        for chunk in reader:
            process_chunk(chunk)

        return {
            "filename": filename,
            "total_records": total_records,
            "benign_count": benign_count,
            "attack_count": attack_count,
            "attack_types": attack_types,
            "chunks_processed": chunks_processed,
            "predictions": preview_predictions,
            "prediction_preview_count": len(
                preview_predictions
            ),
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"CSV processing failed: {str(e)}",
        )


# =========================================================
# Dashboard WebSocket clients
# =========================================================

dashboard_clients = set()


async def broadcast_to_dashboards(data):
    disconnected_clients = []

    for client in dashboard_clients:
        try:
            await client.send_json(data)
        except Exception:
            disconnected_clients.append(client)

    for client in disconnected_clients:
        dashboard_clients.discard(client)


# =========================================================
# WebSocket: traffic / monitoring input
# =========================================================

@app.websocket("/ws/monitor")
async def websocket_monitor(websocket: WebSocket):
    await websocket.accept()

    recent_predictions = deque(maxlen=20)

    await websocket.send_json({
        "status": "connected",
        "message": "NetShield AI real-time monitoring started",
    })

    try:
        while True:
            # ---------------------------------------------
            # Receive network traffic
            # ---------------------------------------------

            data = await websocket.receive_json()
            df = pd.DataFrame([data])

            # ---------------------------------------------
            # Step 1: ML prediction
            # ---------------------------------------------

            result = predict_traffic(df)

            # ---------------------------------------------
            # Step 2: Add prediction to history
            # ---------------------------------------------

            recent_predictions.append(
                result["prediction"]
            )

            # ---------------------------------------------
            # Step 3: Behavioral scores
            # ---------------------------------------------

            frequency_score = calculate_frequency_score(
                list(recent_predictions)
            )

            persistence_score = calculate_persistence_score(
                list(recent_predictions)
            )

            # ---------------------------------------------
            # Step 4: Final risk
            # ---------------------------------------------

            result = apply_risk_score(
                result,
                frequency_score,
                persistence_score,
            )

            # Live alerts are saved individually because
            # traffic arrives one record at a time.
            alert = create_alert(
                result,
                traffic_data=data,
                source="LIVE",
            )

            # ---------------------------------------------
            # Step 5: Update live statistics
            # ---------------------------------------------

            monitor_stats["total_traffic"] += 1

            if result["prediction"] == "BENIGN":
                monitor_stats["benign_count"] += 1

            else:
                monitor_stats["attack_count"] += 1

                attack_type = result["attack_type"]

                if attack_type is not None:
                    monitor_stats["attack_types"][
                        attack_type
                    ] = (
                        monitor_stats["attack_types"].get(
                            attack_type,
                            0,
                        ) + 1
                    )

            # ---------------------------------------------
            # Step 6: Count severity
            # ---------------------------------------------

            severity = result["severity"]

            if severity == "CRITICAL":
                monitor_stats["critical_alerts"] += 1

            elif severity == "HIGH":
                monitor_stats["high_alerts"] += 1

            elif severity == "MEDIUM":
                monitor_stats["medium_alerts"] += 1

            elif severity == "LOW":
                monitor_stats["low_alerts"] += 1

            # ---------------------------------------------
            # Step 7: Prepare response
            # ---------------------------------------------

            message = {
                "prediction": result,
                "alert": alert,
                "behavior": {
                    "traffic_window": len(
                        recent_predictions
                    ),
                    "frequency_score": frequency_score,
                    "persistence_score": persistence_score,
                },
                "statistics": monitor_stats,
            }

            await websocket.send_json(message)

            # Send the same event to the React dashboard.
            await broadcast_to_dashboards(message)

    except WebSocketDisconnect:
        print("Monitoring client disconnected")


# =========================================================
# WebSocket: React dashboard listener
# =========================================================

@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await websocket.accept()

    dashboard_clients.add(websocket)

    await websocket.send_json({
        "status": "connected",
        "message": "Dashboard live monitoring connected",
    })

    try:
        while True:
            await websocket.receive_text()

    except Exception:
        dashboard_clients.discard(websocket)


# =========================================================
# Alerts: list
# =========================================================
# IMPORTANT:
# The list endpoint intentionally returns only summary fields.
# Full risk_factors + traffic_data are returned by
# GET /alerts/{alert_id}. This prevents huge responses when
# a large CSV produces many alerts.
# =========================================================

@app.get("/alerts")
def get_alerts():
    db = SessionLocal()

    try:
        alert_records = (
            db.query(Alert)
            .order_by(Alert.timestamp.desc())
            .all()
        )

        alerts_data = []

        for alert in alert_records:
            alerts_data.append({
                "alert_id": alert.id,
                "timestamp": alert.timestamp.isoformat(),
                "attack_type": alert.attack_type,
                "risk_score": alert.risk_score,
                "severity": alert.severity,
                "status": alert.status,
                "source": alert.source,
                "source_file": alert.source_file,
            })

        return {
            "total_alerts": len(alerts_data),
            "alerts": alerts_data,
        }

    finally:
        db.close()


# =========================================================
# Alert status update
# =========================================================

@app.patch("/alerts/{alert_id}")
def update_alert_status(
    alert_id: int,
    status: str,
):
    valid_statuses = [
        "OPEN",
        "ACKNOWLEDGED",
        "RESOLVED",
    ]

    status = status.upper()

    if status not in valid_statuses:
        return {
            "error": "Invalid status",
            "valid_statuses": valid_statuses,
        }

    db = SessionLocal()

    try:
        alert = (
            db.query(Alert)
            .filter(Alert.id == alert_id)
            .first()
        )

        if alert is None:
            return {
                "error": "Alert not found"
            }

        alert.status = status

        db.commit()
        db.refresh(alert)

        return {
            "message": "Alert status updated",
            "alert": {
                "alert_id": alert.id,
                "timestamp": alert.timestamp.isoformat(),
                "attack_type": alert.attack_type,
                "risk_score": alert.risk_score,
                "severity": alert.severity,
                "status": alert.status,
                "source": alert.source,
                "source_file": alert.source_file,
            },
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# =========================================================
# Alerts: filter by status
# =========================================================

@app.get("/alerts/status/{status}")
def get_alerts_by_status(status: str):
    status = status.upper()

    db = SessionLocal()

    try:
        alert_records = (
            db.query(Alert)
            .filter(Alert.status == status)
            .order_by(Alert.timestamp.desc())
            .all()
        )

        alerts_data = []

        for alert in alert_records:
            alerts_data.append({
                "alert_id": alert.id,
                "timestamp": alert.timestamp.isoformat(),
                "attack_type": alert.attack_type,
                "risk_score": alert.risk_score,
                "severity": alert.severity,
                "status": alert.status,
                "source": alert.source,
                "source_file": alert.source_file,
            })

        return {
            "status": status,
            "total_alerts": len(alerts_data),
            "alerts": alerts_data,
        }

    finally:
        db.close()


# =========================================================
# Alerts: full details for one alert
# =========================================================

@app.get("/alerts/{alert_id}")
def get_alert(alert_id: int):
    db = SessionLocal()

    try:
        alert = (
            db.query(Alert)
            .filter(Alert.id == alert_id)
            .first()
        )

        if alert is None:
            return {
                "error": "Alert not found"
            }

        return {
            "alert_id": alert.id,
            "timestamp": alert.timestamp.isoformat(),
            "attack_type": alert.attack_type,
            "risk_score": alert.risk_score,
            "severity": alert.severity,
            "status": alert.status,
            "binary_confidence": alert.binary_confidence,
            "attack_confidence": alert.attack_confidence,
            "traffic_intensity": alert.traffic_intensity,
            "attack_frequency": alert.attack_frequency,
            "persistence": alert.persistence,
            "risk_factors": alert.risk_factors,
            "traffic_data": alert.traffic_data,
            "source": alert.source,
            "source_file": alert.source_file,
        }

    finally:
        db.close()


# =========================================================
# Analytics: summary
# =========================================================

@app.get("/analytics/summary")
def analytics_summary():
    db = SessionLocal()

    try:
        all_alerts = db.query(Alert).all()

        total_alerts = len(all_alerts)

        severity_counts = {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0,
        }

        status_counts = {
            "OPEN": 0,
            "ACKNOWLEDGED": 0,
            "RESOLVED": 0,
        }

        attack_type_counts = {}

        for alert in all_alerts:
            if alert.severity in severity_counts:
                severity_counts[alert.severity] += 1

            if alert.status in status_counts:
                status_counts[alert.status] += 1

            if alert.attack_type:
                attack_type_counts[alert.attack_type] = (
                    attack_type_counts.get(
                        alert.attack_type,
                        0,
                    ) + 1
                )

        return {
            "total_alerts": total_alerts,
            "severity": severity_counts,
            "status": status_counts,
            "attack_types": attack_type_counts,
        }

    finally:
        db.close()


# =========================================================
# Analytics: live traffic
# =========================================================

@app.get("/analytics/traffic")
def analytics_traffic():
    total_traffic = monitor_stats["total_traffic"]
    benign_count = monitor_stats["benign_count"]
    attack_count = monitor_stats["attack_count"]

    attack_percentage = 0

    if total_traffic > 0:
        attack_percentage = (
            attack_count / total_traffic
        ) * 100

    benign_percentage = 0

    if total_traffic > 0:
        benign_percentage = (
            benign_count / total_traffic
        ) * 100

    return {
        "total_traffic": total_traffic,
        "benign_traffic": benign_count,
        "attack_traffic": attack_count,
        "benign_percentage": round(
            benign_percentage,
            2,
        ),
        "attack_percentage": round(
            attack_percentage,
            2,
        ),
    }


# =========================================================
# Analytics: attack trend
# =========================================================

@app.get("/analytics/attack-trend")
def attack_trend():
    db = SessionLocal()

    try:
        alert_records = (
            db.query(Alert)
            .order_by(Alert.timestamp.asc())
            .all()
        )

        daily_attacks = {}

        for alert in alert_records:
            date = alert.timestamp.date().isoformat()

            if date not in daily_attacks:
                daily_attacks[date] = 0

            daily_attacks[date] += 1

        trend = []

        for date, count in daily_attacks.items():
            trend.append({
                "date": date,
                "attack_count": count,
            })

        return {
            "trend": trend
        }

    finally:
        db.close()


# =========================================================
# Analytics: attack type distribution
# =========================================================

@app.get("/analytics/attack-types")
def attack_type_distribution():
    db = SessionLocal()

    try:
        alert_records = (
            db.query(Alert)
            .filter(Alert.attack_type.isnot(None))
            .all()
        )

        attack_types = {}

        for alert in alert_records:
            attack_type = alert.attack_type

            if attack_type not in attack_types:
                attack_types[attack_type] = 0

            attack_types[attack_type] += 1

        distribution = []

        for attack_type, count in attack_types.items():
            distribution.append({
                "attack_type": attack_type,
                "count": count,
            })

        return {
            "attack_types": distribution
        }

    finally:
        db.close()
