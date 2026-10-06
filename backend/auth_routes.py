from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.auth_dependencies import get_current_user, require_admin

try:
    from backend.database import SessionLocal
    from backend.db_models import User
    from backend.auth import hash_password, verify_password, create_access_token
except ModuleNotFoundError:
    from database import SessionLocal
    from db_models import User
    from auth import hash_password, verify_password, create_access_token


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# =========================================================
# Request models
# =========================================================

class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# =========================================================
# Database dependency
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register(
    user_data: RegisterRequest,
    db: Session = Depends(get_db)
):

    email = user_data.email.strip().lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered."
        )

    new_user = User(
        email=email,
        password_hash=hash_password(
            user_data.password
        ),
        role="security_analyst"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully.",
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role
    }


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    user_data: LoginRequest,
    db: Session = Depends(get_db)
):

    email = user_data.email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    password_valid = verify_password(
        user_data.password,
        user.password_hash
    )

    if not password_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    access_token = create_access_token(
        user_id=user.id,
        role=user.role
    )

    return {
        "message": "Login successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role
        }
    }
    
# =========================================================
# ADMIN: Create Security Analyst
# =========================================================

class CreateAnalystRequest(BaseModel):
    email: str
    password: str


@router.post("/create-analyst")
def create_analyst(
    user_data: CreateAnalystRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):

    email = user_data.email.strip().lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered."
        )

    new_user = User(
        email=email,
        password_hash=hash_password(
            user_data.password
        ),
        role="security_analyst"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Security Analyst created successfully.",
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role
    }    