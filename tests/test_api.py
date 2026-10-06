import pandas as pd
import requests

file = "data/cleaned/Wednesday-workingHours.pcap_ISCX_cleaned.csv"

df = pd.read_csv(file)

sample = df.iloc[78883].drop("Label").to_dict()

response = requests.post(
    "http://127.0.0.1:8000/predict",
    json=sample
)

print("Status Code:", response.status_code)
print("Response:")
print(response.json())