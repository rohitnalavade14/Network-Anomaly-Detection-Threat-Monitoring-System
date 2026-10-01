import joblib
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

RISK_REFERENCE = joblib.load(
    BASE_DIR / "models" / "risk_reference.pkl"
)

def calculate_feature_intensity(value, reference):
    
    if value is None or value < 0:
        return 0

    p50 = reference["p50"]
    p75 = reference["p75"]
    p90 = reference["p90"]
    p95 = reference["p95"]
    p99 = reference["p99"]

    if value <= p50:
        return 20

    elif value <= p75:
        score = 20 + (
            (value - p50) /
            (p75 - p50)
        ) * 20
        return score

    elif value <= p90:
        score = 40 + (
            (value - p75) /
            (p90 - p75)
        ) * 20
        return score

    elif value <= p95:
        score = 60 + (
            (value - p90) /
            (p95 - p90)
        ) * 20
        return score

    elif value <= p99:
        score = 80 + (
            (value - p95) /
            (p99 - p95)
        ) * 20
        return score

    else:
        return 100

def calculate_traffic_intensity(row):

    packet_score = calculate_feature_intensity(
        row["Flow Packets/s"],
        RISK_REFERENCE["Flow Packets/s"]
    )

    byte_score = calculate_feature_intensity(
        row["Flow Bytes/s"],
        RISK_REFERENCE["Flow Bytes/s"]
    )

    forward_score = calculate_feature_intensity(
        row["Total Fwd Packets"],
        RISK_REFERENCE["Total Fwd Packets"]
    )

    backward_score = calculate_feature_intensity(
        row["Total Backward Packets"],
        RISK_REFERENCE["Total Backward Packets"]
    )

    intensity_score = (
        0.35 * packet_score +
        0.35 * byte_score +
        0.15 * forward_score +
        0.15 * backward_score
    )

    return round(
        min(100, max(0, intensity_score)),
        2
    )

#attack frequency    
def calculate_frequency_score(recent_predictions):
    """
    Calculate attack frequency from recent traffic records.

    recent_predictions:
        List containing "ATTACK" or "BENIGN"
    """

    if not recent_predictions:
        return 0

    attack_count = recent_predictions.count("ATTACK")
    total_count = len(recent_predictions)

    attack_frequency = attack_count / total_count

    frequency_score = attack_frequency * 100

    return round(frequency_score, 2)    

#attack persistance
def calculate_persistence_score(recent_predictions):
    """
    Calculate persistence based on the current consecutive
    attack streak.
    """

    if not recent_predictions:
        return 0

    current_streak = 0

    for prediction in reversed(recent_predictions):

        if prediction == "ATTACK":
            current_streak += 1
        else:
            break

    persistence_score = min(
        current_streak * 20,
        100
    )

    return persistence_score

#stage 1 
ATTACK_SEVERITY = {
    "DDoS": 90,
    "DoS Hulk": 85,
    "Bot": 85,
    "DoS GoldenEye": 80,
    "DoS slowloris": 75,
    "DoS Slowhttptest": 75,
    "FTP-Patator": 70,
    "SSH-Patator": 70,
    "Web Attack – XSS": 70,
    "Web Attack – Brute Force": 65,
    "PortScan": 60,
    "Other": 50
}


def calculate_risk_score(
    attack_type,
    binary_confidence,
    attack_confidence,
    traffic_intensity,
    frequency_score,
    persistence_score
):

    base_score = ATTACK_SEVERITY.get(
        attack_type,
        50
    )

    binary_confidence_score = binary_confidence * 100
    attack_confidence_score = attack_confidence * 100

    ml_evidence = (
        0.40 * base_score +
        0.30 * binary_confidence_score +
        0.30 * attack_confidence_score
    )

    attack_severity_component = 0.60 * 0.40 * base_score
    binary_confidence_component = (
        0.60 * 0.30 * binary_confidence_score
    )
    attack_confidence_component = (
        0.60 * 0.30 * attack_confidence_score
    )
    traffic_component = 0.15 * traffic_intensity
    frequency_component = 0.10 * frequency_score
    persistence_component = 0.15 * persistence_score

    risk_score = (
        attack_severity_component +
        binary_confidence_component +
        attack_confidence_component +
        traffic_component +
        frequency_component +
        persistence_component
    )

    risk_score = round(
        max(0, min(100, risk_score)),
        2
    )

    if risk_score >= 80:
        severity = "CRITICAL"

    elif risk_score >= 60:
        severity = "HIGH"

    elif risk_score >= 40:
        severity = "MEDIUM"

    else:
        severity = "LOW"

    risk_factors = {

        "attack_severity": {
            "base_score": base_score
        },

        "binary_ml": {
            "confidence": round(
                float(binary_confidence),
                4
            ),
            "score": round(
                float(binary_confidence_score),
                2
            )
        },

        "attack_classification": {
            "confidence": round(
                float(attack_confidence),
                4
            ),
            "score": round(
                float(attack_confidence_score),
                2
            )
        },

        "traffic_intensity": round(
            float(traffic_intensity),
            2
        ),

        "attack_frequency": round(
            float(frequency_score),
            2
        ),

        "persistence": round(
            float(persistence_score),
            2
        ),

        "ml_evidence": round(
            float(ml_evidence),
            2
        ),

        "risk_contribution": {
            "attack_severity": round(
                float(attack_severity_component),
                2
            ),
            "binary_confidence": round(
                float(binary_confidence_component),
                2
            ),
            "attack_confidence": round(
                float(attack_confidence_component),
                2
            ),
            "traffic_intensity": round(
                float(traffic_component),
                2
            ),
            "attack_frequency": round(
                float(frequency_component),
                2
            ),
            "persistence": round(
                float(persistence_component),
                2
            )
        }
    }

    return {
        "risk_score": risk_score,
        "severity": severity,
        "risk_factors": risk_factors
    }