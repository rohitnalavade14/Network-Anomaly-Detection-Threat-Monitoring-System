from backend.risk_engine import calculate_frequency_score


test_cases = [
    ["BENIGN"] * 20,

    ["ATTACK"] * 20,

    ["ATTACK"] * 5 + ["BENIGN"] * 15,

    ["ATTACK"] * 10 + ["BENIGN"] * 10
]


for i, predictions in enumerate(test_cases, start=1):

    score = calculate_frequency_score(predictions)

    print(
        f"Test {i}: "
        f"Frequency Score = {score}"
    )