# file will handle 
#1. Password → secure hash
#2. User identity → JWT token

from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

# =========================================================
# Password hashing
# =========================================================

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """
    Convert a plain password into a secure password hash.
    """
    return password_hasher.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """
    Check whether a plain password matches the stored hash.
    """
    return password_hasher.verify(
        plain_password,
        hashed_password
    )


# =========================================================
# JWT configuration
# =========================================================

SECRET_KEY = "netshield-dev-secret-change-this-later"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30


# =========================================================
# Create JWT token
# =========================================================

def create_access_token(
    user_id: int,
    role: str
) -> str:

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


# =========================================================
# Decode JWT token
# =========================================================

def decode_access_token(token: str) -> dict:

    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )

    return payload


if __name__ == "__main__":

    password = "hello123"

    hashed = hash_password(password)

    print("Original password:")
    print(password)

    print("\nHashed password:")
    print(hashed)

    print("\nCorrect password:")
    print(verify_password("hello123", hashed))

    print("\nWrong password:")
    print(verify_password("wrong123", hashed))

    token = create_access_token(
        user_id=1,
        role="admin"
    )

    print("\nJWT:")
    print(token)

    print("\nDecoded JWT:")
    print(decode_access_token(token))