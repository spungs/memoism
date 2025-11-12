"""
Diary router.
"""
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session, select
from src.database import get_session
from src.models import Diary
from src.diary.schemas import CreateDiaryRequest, DiaryResponse
from src.auth.utils import verify_token

router = APIRouter(prefix="/diary", tags=["diary"])


def get_current_user_id(authorization: Optional[str] = Header(default=None)) -> UUID:
    """
    Extract and verify user ID from JWT token in Authorization header.

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        User ID from token

    Raises:
        HTTPException: If token is invalid or missing
    """
    # Check if authorization header is present
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    # Extract token from "Bearer <token>"
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return UUID(payload["sub"])


@router.post("", response_model=DiaryResponse, status_code=status.HTTP_201_CREATED)
def create_diary(
    diary_data: CreateDiaryRequest,
    session: Session = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Create a new diary entry.

    Args:
        diary_data: Diary content
        session: Database session
        user_id: Authenticated user ID

    Returns:
        DiaryResponse: Created diary data
    """
    # Create new diary
    new_diary = Diary(
        user_id=user_id,
        title=diary_data.title,
        content=diary_data.content,
        images=diary_data.images,
        location=diary_data.location,
    )

    session.add(new_diary)
    session.commit()
    session.refresh(new_diary)

    return new_diary


@router.get("", response_model=List[DiaryResponse])
def list_diaries(
    skip: int = 0,
    limit: int = 100,
    date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    List diary entries for the authenticated user with pagination and date filtering.

    Args:
        skip: Number of entries to skip (default: 0)
        limit: Maximum number of entries to return (default: 100)
        date: Filter by specific date (YYYY-MM-DD)
        start_date: Filter diaries created on or after this date (YYYY-MM-DD)
        end_date: Filter diaries created on or before this date (YYYY-MM-DD)
        session: Database session
        user_id: Authenticated user ID

    Returns:
        List[DiaryResponse]: List of diary entries
    """
    # Start with base query for the authenticated user
    statement = select(Diary).where(Diary.user_id == user_id)

    # Apply date filters
    if date:
        # Filter by specific date (start of day to end of day)
        start_datetime = datetime.combine(date, datetime.min.time())
        end_datetime = datetime.combine(date, datetime.max.time())
        statement = statement.where(
            Diary.created_at >= start_datetime,
            Diary.created_at <= end_datetime
        )
    else:
        # Apply start_date and end_date filters
        if start_date:
            start_datetime = datetime.combine(start_date, datetime.min.time())
            statement = statement.where(Diary.created_at >= start_datetime)

        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time())
            statement = statement.where(Diary.created_at <= end_datetime)

    # Apply pagination
    statement = statement.offset(skip).limit(limit)

    diaries = session.exec(statement).all()

    return diaries


@router.get("/{diary_id}", response_model=DiaryResponse)
def get_diary_detail(
    diary_id: UUID,
    session: Session = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Get a specific diary entry by ID.

    Args:
        diary_id: The ID of the diary to retrieve
        session: Database session
        user_id: Authenticated user ID

    Returns:
        DiaryResponse: The diary data

    Raises:
        HTTPException: If diary is not found
    """
    # Query the diary by ID and user_id
    statement = select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
    diary = session.exec(statement).first()

    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found",
        )

    return diary
