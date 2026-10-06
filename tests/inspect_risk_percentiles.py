import pandas as pd

df = pd.read_csv(
    "data/cleaned/Wednesday-workingHours.pcap_ISCX_cleaned.csv"
)

columns = [
    "Flow Packets/s",
    "Flow Bytes/s",
    "Total Fwd Packets",
    "Total Backward Packets"
]

print("\nRisk Feature Percentiles:\n")

for column in columns:

    print(f"\n--- {column} ---")

    print(
        df[column].quantile(
            [0.50, 0.75, 0.90, 0.95, 0.99, 0.995, 0.999]
        )
    )