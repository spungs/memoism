"""
Authentication router.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from src.database import get_session
from src.models import User
from src.auth.schemas import SignupRequest, UserResponse, LoginRequest, LoginResponse
from src.auth.utils import hash_password, verify_password, create_access_token
from src.common.errors import (
    ERROR_EMAIL_ALREADY_REGISTERED,
    ERROR_USERNAME_ALREADY_TAKEN,
    ERROR_INCORRECT_CREDENTIALS,
)

router = APIRouter(prefix="/auth", tags=["auth"])


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
            detail=ERROR_EMAIL_ALREADY_REGISTERED,
        )

    # Check if username already exists
    user_with_username = session.exec(
        select(User).where(User.username == signup_data.username)
    ).first()
    if user_with_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_USERNAME_ALREADY_TAKEN,
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
            detail=ERROR_INCORRECT_CREDENTIALS,
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return LoginResponse(access_token=access_token, token_type="bearer")
