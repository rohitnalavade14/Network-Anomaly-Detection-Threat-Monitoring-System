from backend.risk_engine import calculate_persistence_score


test_cases = [
    ["BENIGN", "BENIGN", "BENIGN"],

    ["BENIGN", "ATTACK"],

    ["BENIGN", "ATTACK", "ATTACK"],

    ["BENIGN", "ATTACK", "ATTACK", "ATTACK"],

    ["ATTACK", "ATTACK", "ATTACK", "ATTACK", "ATTACK"],

    ["ATTACK", "ATTACK", "BENIGN", "ATTACK"]
]


for i, predictions in enumerate(test_cases, start=1):

    score = calculate_persistence_score(predictions)

    print(
        f"Test {i}: "
        f"Persistence Score = {score}"
    )