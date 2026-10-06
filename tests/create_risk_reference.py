import pandas as pd
import joblib
from pathlib import Path


# Folder containing all cleaned CICIDS2017 files
cleaned_folder = Path("data/cleaned")


# Load all cleaned CSV files
csv_files = list(cleaned_folder.glob("*.csv"))

print(f"Found {len(csv_files)} cleaned CSV files")


# Features used for traffic intensity
risk_features = [
    "Flow Packets/s",
    "Flow Bytes/s",
    "Total Fwd Packets",
    "Total Backward Packets"
]


# Store values from all 8 files
all_values = {
    feature: []
    for feature in risk_features
}


# Process every cleaned CSV
for file in csv_files:

    print(f"Reading: {file.name}")

    df = pd.read_csv(file)

    for feature in risk_features:

        # Keep only valid non-negative values
        valid_values = df.loc[
            df[feature] >= 0,
            feature
        ]

        all_values[feature].append(valid_values)


# Calculate percentile reference
risk_reference = {}

for feature in risk_features:

    combined_values = pd.concat(
        all_values[feature],
        ignore_index=True
    )

    risk_reference[feature] = {
        "p50": combined_values.quantile(0.50),
        "p75": combined_values.quantile(0.75),
        "p90": combined_values.quantile(0.90),
        "p95": combined_values.quantile(0.95),
        "p99": combined_values.quantile(0.99)
    }


# Save reference values
joblib.dump(
    risk_reference,
    "models/risk_reference.pkl"
)


print("\nRisk reference created successfully!")

print("\nReference values from ALL cleaned CICIDS2017 files:\n")

for feature, values in risk_reference.items():

    print(f"\n{feature}")

    for percentile, value in values.items():

        print(
            f"{percentile}: {value}"
        )