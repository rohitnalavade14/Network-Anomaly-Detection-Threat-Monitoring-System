import pandas as pd

df = pd.read_csv(
    "data/cleaned/Wednesday-workingHours.pcap_ISCX_cleaned.csv"
)

benign_rows = df[df["Label"] == "BENIGN"].iloc[:5]

attack_rows = df[df["Label"] != "BENIGN"].iloc[:5]

test_df = pd.concat([benign_rows, attack_rows])

test_df.to_csv(
    "data/test_mixed.csv",
    index=False
)

print("Mixed test CSV created successfully!")