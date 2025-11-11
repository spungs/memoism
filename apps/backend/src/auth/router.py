"""
Authentication router.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from src.database import get_session
from src.models import User
from src.auth.schemas import SignupRequest, UserResponse
import bcrypt

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(
    signup_data: SignupRequest,
    session: Session = Depends(get_session),
):
    """
    Register a new user.

    Args:
        signup_data: User registration data
        session: Database session

    Returns:
        UserResponse: Created user data

    Raises:
        HTTPException: If email or username already exists
    """
    # Check if email already exists
    existing_user = session.exec(
        select(User).where(User.email == signup_data.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if username already exists
    existing_username = session.exec(
        select(User).where(User.username == signup_data.username)
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # Create new user
    new_user = User(
        email=signup_data.email,
        username=signup_data.username,
        hashed_password=hash_password(signup_data.password),
    )

    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return new_user
