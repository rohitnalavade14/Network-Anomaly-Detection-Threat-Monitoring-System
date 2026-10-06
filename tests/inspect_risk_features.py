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

print("\nRisk-related feature statistics:\n")

print(df[columns].describe())