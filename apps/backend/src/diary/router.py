"""
Diary router.
"""
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from src.database import get_session
from src.models import Diary
from src.diary.schemas import CreateDiaryRequest, UpdateDiaryRequest, DiaryResponse
from src.auth.dependencies import get_current_user_id
from src.common.errors import ERROR_DIARY_NOT_FOUND

router = APIRouter(prefix="/diary", tags=["diary"])


def get_diary_by_id_and_user(
    diary_id: UUID,
    user_id: UUID,
    session: Session,
) -> Diary:
    """
    Get a diary by ID and user ID, or raise 404 if not found.

    This helper function eliminates duplicate query logic across multiple endpoints.

    Args:
        diary_id: The ID of the diary
        user_id: The ID of the user (for authorization check)
        session: Database session

    Returns:
        Diary: The diary object

    Raises:
        HTTPException: If diary is not found or doesn't belong to user
    """
    statement = select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
    diary = session.exec(statement).first()

    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_DIARY_NOT_FOUND,
        )

    return diary


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
    diary = get_diary_by_id_and_user(diary_id, user_id, session)
    return diary


@router.put("/{diary_id}", response_model=DiaryResponse)
def update_diary(
    diary_id: UUID,
    diary_data: UpdateDiaryRequest,
    session: Session = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Update a diary entry.

    Args:
        diary_id: The ID of the diary to update
        diary_data: Updated diary data (partial update supported)
        session: Database session
        user_id: Authenticated user ID

    Returns:
        DiaryResponse: The updated diary data

    Raises:
        HTTPException: If diary is not found
    """
    diary = get_diary_by_id_and_user(diary_id, user_id, session)

    # Update only provided fields (partial update)
    if diary_data.title is not None:
        diary.title = diary_data.title
    if diary_data.content is not None:
        diary.content = diary_data.content
    if diary_data.images is not None:
        diary.images = diary_data.images
    if diary_data.location is not None:
        diary.location = diary_data.location

    session.add(diary)
    session.commit()
    session.refresh(diary)

    return diary


@router.delete("/{diary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diary(
    diary_id: UUID,
    session: Session = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Delete a diary entry.

    Args:
        diary_id: The ID of the diary to delete
        session: Database session
        user_id: Authenticated user ID

    Returns:
        None (204 No Content)

    Raises:
        HTTPException: If diary is not found
    """
    diary = get_diary_by_id_and_user(diary_id, user_id, session)

    # Delete the diary
    session.delete(diary)
    session.commit()

    return None
