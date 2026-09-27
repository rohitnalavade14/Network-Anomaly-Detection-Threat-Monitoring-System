from pathlib import Path
import joblib
import pandas as pd
from backend.risk_engine import calculate_risk_score, calculate_traffic_intensity

#Instead of relying on ../, use a path based on the location of predict.py.
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

#loading trained models
binary_model = joblib.load(MODEL_DIR / "model_random_forest.pkl")

attack_model = joblib.load(MODEL_DIR / "model_attack_classifier.pkl")

preprocessing_medians = joblib.load(
    MODEL_DIR / "binary_preprocessing_medians.pkl"
)

feature_columns = joblib.load(
    MODEL_DIR / "feature_columns.pkl"
)

def preprocess_data(X):

    X = X.copy()

    # Keep exactly the same 78 features
    # and in the same order used during training
    X = X[feature_columns]

    # Handle negative values
    # using medians learned from training data
    for col, median_value in preprocessing_medians.items():

        X.loc[X[col] < 0, col] = None

        X[col] = X[col].fillna(median_value)

    return X


def generate_alert(prediction, attack_type, risk_score, severity):

    # No alert for normal traffic
    if prediction == "BENIGN":
        return {
            "alert": False,
            "message": "Normal network traffic"
        }

    # Alert for attack traffic
    return {
        "alert": True,
        "message": f"{severity} {attack_type} attack detected",
        "attack_type": attack_type,
        "risk_score": risk_score,
        "severity": severity
    }

def predict_traffic(X):

    X = preprocess_data(X)

    # -------------------------
    # Binary prediction
    # -------------------------

    binary_prediction = binary_model.predict(X)[0]

    binary_probabilities = binary_model.predict_proba(X)

    # Probability of ATTACK
    binary_confidence = binary_probabilities[0][1]

    # -------------------------
    # Traffic intensity
    # -------------------------

    traffic_intensity = calculate_traffic_intensity(
        X.iloc[0]
    )

    # -------------------------
    # BENIGN traffic
    # -------------------------

    if binary_prediction == 0:

        return {
            "prediction": "BENIGN",

            "attack_type": None,

            "binary_confidence": round(
                float(binary_confidence),
                4
            ),

            "attack_confidence": None,

            "traffic_intensity": traffic_intensity
        }

    # -------------------------
    # Attack classification
    # -------------------------

    attack_prediction = attack_model.predict(X)[0]

    attack_probabilities = attack_model.predict_proba(X)

    # Find index of predicted attack class
    attack_class_index = list(
        attack_model.classes_
    ).index(attack_prediction)

    # Probability of predicted attack type
    attack_confidence = attack_probabilities[
        0
    ][
        attack_class_index
    ]

    # -------------------------
    # Return ML result
    # -------------------------

    return {

        "prediction": "ATTACK",

        "attack_type": attack_prediction,

        "binary_confidence": round(
            float(binary_confidence),
            4
        ),

        "attack_confidence": round(
            float(attack_confidence),
            4
        ),

        "traffic_intensity": traffic_intensity
    }

    
def apply_risk_score(
    result,
    frequency_score,
    persistence_score
):

    # -------------------------
    # BENIGN traffic
    # -------------------------

    if result["prediction"] == "BENIGN":

        result["risk_score"] = 0
        result["severity"] = "LOW"

        result["attack_frequency"] = frequency_score
        result["persistence"] = persistence_score

        result["alert"] = generate_alert(
            "BENIGN",
            None,
            0,
            "LOW"
        )

        return result

    # -------------------------
    # ATTACK traffic
    # -------------------------

    risk = calculate_risk_score(

        attack_type=result["attack_type"],

        binary_confidence=result[
            "binary_confidence"
        ],

        attack_confidence=result[
            "attack_confidence"
        ],

        traffic_intensity=result[
            "traffic_intensity"
        ],

        frequency_score=frequency_score,

        persistence_score=persistence_score
    )

    # -------------------------
    # Add final risk information
    # -------------------------

    result["attack_frequency"] = frequency_score

    result["persistence"] = persistence_score

    result["risk_score"] = risk[
        "risk_score"
    ]

    result["severity"] = risk[
        "severity"
    ]

    result["alert"] = generate_alert(

        "ATTACK",

        result["attack_type"],

        risk["risk_score"],

        risk["severity"]
    )

    return result    

def predict_batch(X):

    # -------------------------
    # Preprocess data
    # -------------------------

    X = preprocess_data(X)

    # -------------------------
    # Binary prediction
    # -------------------------

    binary_predictions = binary_model.predict(X)

    binary_probabilities = binary_model.predict_proba(X)

    results = []

    # -------------------------
    # Find attack records
    # -------------------------

    attack_indices = [
        i
        for i, prediction in enumerate(binary_predictions)
        if prediction == 1
    ]

    attack_predictions = {}
    attack_confidences = {}

    # -------------------------
    # Attack classification
    # -------------------------

    if attack_indices:

        attack_data = X.iloc[attack_indices]

        predicted_attack_types = (
            attack_model.predict(attack_data)
        )

        attack_probabilities = (
            attack_model.predict_proba(attack_data)
        )

        for position, index in enumerate(attack_indices):

            attack_type = predicted_attack_types[position]

            attack_class_index = list(
                attack_model.classes_
            ).index(attack_type)

            attack_confidence = (
                attack_probabilities[position][
                    attack_class_index
                ]
            )

            attack_predictions[index] = (
                attack_type
            )

            attack_confidences[index] = (
                attack_confidence
            )

    # -------------------------
    # Process every record
    # -------------------------

    for i, prediction in enumerate(
        binary_predictions
    ):

        # -------------------------
        # Binary confidence
        # -------------------------

        binary_confidence = (
            binary_probabilities[i][1]
        )

        # -------------------------
        # Traffic intensity
        # -------------------------

        traffic_intensity = (
            calculate_traffic_intensity(
                X.iloc[i]
            )
        )

        # -------------------------
        # BENIGN
        # -------------------------

        if prediction == 0:

            result = {

                "prediction": "BENIGN",

                "attack_type": None,

                "binary_confidence": round(
                    float(binary_confidence),
                    4
                ),

                "attack_confidence": None,

                "traffic_intensity":
                    traffic_intensity
            }

        # -------------------------
        # ATTACK
        # -------------------------

        else:

            result = {

                "prediction": "ATTACK",

                "attack_type":
                    attack_predictions[i],

                "binary_confidence": round(
                    float(binary_confidence),
                    4
                ),

                "attack_confidence": round(
                    float(
                        attack_confidences[i]
                    ),
                    4
                ),

                "traffic_intensity":
                    traffic_intensity
            }

        # -------------------------
        # Apply risk
        # -------------------------

        result = apply_risk_score(
            result,
            frequency_score=0,
            persistence_score=0
        )

        results.append(result)

    return results    

# Test with one real row
# df = pd.read_csv(
#     "../data/cleaned/Wednesday-workingHours.pcap_ISCX_cleaned.csv"
# )

# sample = df.drop(columns=["Label"]).iloc[[78883]]

# print("Sample shape:", sample.shape)


# # Make prediction
# result = predict_traffic(sample)

# print("Predicted:", result)


# # Compare with actual label
# actual_label = df.iloc[78883]["Label"]

# print("Actual:", actual_label)