import pandas as pd

from backend.risk_engine import calculate_traffic_intensity


# Load one cleaned CICIDS2017 file
df = pd.read_csv(
    "data/cleaned/Wednesday-workingHours.pcap_ISCX_cleaned.csv"
)


# Test first 10 traffic records
for i in range(10):

    row = df.iloc[i]

    intensity = calculate_traffic_intensity(row)

    print(
        f"Traffic {i + 1}: "
        f"Intensity Score = {intensity}"
    )