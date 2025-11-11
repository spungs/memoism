"""
Authentication router.
"""
from datetime import datetime, timedelta
from typing import Optional
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from jose import jwt
from src.database import get_session
from src.models import User
from src.auth.schemas import SignupRequest, UserResponse, LoginRequest, LoginResponse
import bcrypt

router = APIRouter(prefix="/auth", tags=["auth"])

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "30"))


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using bcrypt."""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    token_payload = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)

    token_payload.update({"exp": expire})
    access_token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return access_token


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
    user_with_email = session.exec(
        select(User).where(User.email == signup_data.email)
    ).first()
    if user_with_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if username already exists
    user_with_username = session.exec(
        select(User).where(User.username == signup_data.username)
    ).first()
    if user_with_username:
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


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login(
    login_data: LoginRequest,
    session: Session = Depends(get_session),
):
    """
    Authenticate a user and return JWT token.

    Args:
        login_data: User login credentials
        session: Database session

    Returns:
        LoginResponse: JWT access token

    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    user = session.exec(
        select(User).where(User.email == login_data.email)
    ).first()

    # Check if user exists and password is correct
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return LoginResponse(access_token=access_token, token_type="bearer")
