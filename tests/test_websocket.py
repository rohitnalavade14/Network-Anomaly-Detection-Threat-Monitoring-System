import asyncio
import json
import pandas as pd
import websockets


async def test_websocket():

    # Load cleaned CICIDS2017 data
    df = pd.read_csv(
        "data/cleaned/Wednesday-workingHours.pcap_ISCX_cleaned.csv"
    )

    uri = "ws://127.0.0.1:8000/ws/monitor"

    async with websockets.connect(uri) as websocket:

        # Receive connection message
        response = await websocket.recv()
        print("Server:", response)
        
        
        # Select 10 random rows where the Label is BENIGN
        benign_rows = df[df["Label"] == "BENIGN"].sample(n=20)

        attack_rows = df[df["Label"] != "BENIGN"].sample(n=10)

        # used for .sample(frac= 1) for shuffling data
        test_df = pd.concat([benign_rows, attack_rows]).sample(frac=1).reset_index(drop=True)
        # Send 20 rows one by one
        for i in range(len(test_df)):
            row = test_df.iloc[i]

            # Remove Label because the ML model does not need it
            data = row.drop("Label").to_dict()

            # Send traffic to FastAPI
            await websocket.send(json.dumps(data))

            # Receive prediction
            response = await websocket.recv()

            print(f"\nTraffic {i + 1}:")
            print(response)

            # Wait 1 second before next traffic
            await asyncio.sleep(1)


asyncio.run(test_websocket())