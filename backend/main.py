from fastapi import FastAPI, UploadFile, File, WebSocket
from backend.predict import predict_traffic, predict_batch, apply_risk_score
import pandas as pd
from pydantic import BaseModel, Field, create_model, ConfigDict
import joblib
import io
from collections import deque
from backend.risk_engine import calculate_frequency_score, calculate_persistence_score


app = FastAPI()

@app.get("/")
def home():
    return {
        "message": "NetShield AI Backend is running"
    }



# Load the 78 feature names
feature_columns = joblib.load(
    "models/feature_columns.pkl"
)

# Create Pydantic fields automatically
fields = {}

for i, column in enumerate(feature_columns):

    fields[f"feature_{i}"] = (
        float,
        Field(..., alias=column)
    )


TrafficData = create_model(
    "TrafficData",
    __base__=BaseModel,
    **fields
)

BatchTrafficData = create_model(
    "BatchTrafficData",
    records=(list[TrafficData], ...)
)

@app.post("/predict")
def predict(data: TrafficData):  # type: ignore[valid-type]

    data_dict = data.model_dump(by_alias=True)

    df = pd.DataFrame([data_dict])

    result = predict_traffic(df)

    return result



@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "NetShield AI",
        "models": "loaded"
    }
    
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
        "predictions": predictions
    }  
    
@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):

    contents = await file.read()

    df = pd.read_csv(io.BytesIO(contents))

    # Check required features
    missing_columns = [
        column for column in feature_columns
        if column not in df.columns
    ]

    if missing_columns:
        return {
            "error": "CSV is missing required features",
            "missing_columns": missing_columns
        }

    # Keep only the features required by the ML model
    X = df[feature_columns]

    # Predict all rows together
    predictions = predict_batch(X)

    # Count results
    benign_count = sum(
        1 for result in predictions
        if result["prediction"] == "BENIGN"
    )

    attack_count = sum(
        1 for result in predictions
        if result["prediction"] == "ATTACK"
    )

    attack_types = {}

    for result in predictions:
        attack_type = result["attack_type"]

        if attack_type is not None:
            attack_types[attack_type] = (
                attack_types.get(attack_type, 0) + 1
            )

    return {
    "filename": file.filename,
    "total_records": len(df),
    "benign_records": benign_count,
    "attack_records": attack_count,
    "attack_types": attack_types,
    "predictions": predictions
    }

# Live monitoring statistics
monitor_stats = {
    "total_traffic": 0,
    "benign_count": 0,
    "attack_count": 0,
    "critical_alerts": 0,
    "high_alerts": 0,
    "medium_alerts": 0,
    "low_alerts": 0,
    "attack_types": {}
}

    
@app.websocket("/ws/monitor")
async def websocket_monitor(websocket: WebSocket):

    await websocket.accept()
    
    recent_predictions = deque(maxlen=20) #It automatically keeps only the latest 20 predictions.

    await websocket.send_json({
        "status": "connected",
        "message": "NetShield AI real-time monitoring started"
    })

    while True:

        # -------------------------
        # Receive network traffic
        # -------------------------

        data = await websocket.receive_json()

        # Convert received traffic into DataFrame
        df = pd.DataFrame([data])

        # -------------------------
        # Step 1: ML prediction
        # -------------------------

        result = predict_traffic(df)

        # -------------------------
        # Step 2: Add current
        # prediction to history
        # -------------------------

        recent_predictions.append(
            result["prediction"]
        )

        # -------------------------
        # Step 3: Calculate
        # behavioral scores
        # -------------------------

        frequency_score = calculate_frequency_score(
            list(recent_predictions)
        )

        persistence_score = calculate_persistence_score(
            list(recent_predictions)
        )

        # -------------------------
        # Step 4: Calculate
        # final risk
        # -------------------------

        result = apply_risk_score(
            result,
            frequency_score,
            persistence_score
        )

        # -------------------------
        # Step 5: Update statistics
        # -------------------------

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
                        0
                    ) + 1
                )

        # -------------------------
        # Step 6: Count severity
        # -------------------------

        severity = result["severity"]

        if severity == "CRITICAL":

            monitor_stats["critical_alerts"] += 1

        elif severity == "HIGH":

            monitor_stats["high_alerts"] += 1

        elif severity == "MEDIUM":

            monitor_stats["medium_alerts"] += 1

        elif severity == "LOW":

            monitor_stats["low_alerts"] += 1

        # -------------------------
        # Step 7: Send result
        # -------------------------

        await websocket.send_json({

            "prediction": result,

            "behavior": {

                "traffic_window": len(
                    recent_predictions
                ),

                "frequency_score": frequency_score,

                "persistence_score": persistence_score
            },

            "statistics": monitor_stats
        })
        