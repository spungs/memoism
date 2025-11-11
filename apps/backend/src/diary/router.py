"""
Diary router.
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session
from src.database import get_session
from src.models import Diary
from src.diary.schemas import CreateDiaryRequest, DiaryResponse
from src.auth.utils import verify_token

router = APIRouter(prefix="/diary", tags=["diary"])


def get_current_user_id(authorization: str = Header()) -> UUID:
    """
    Extract and verify user ID from JWT token in Authorization header.

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        User ID from token

    Raises:
        HTTPException: If token is invalid or missing
    """
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
    )

    session.add(new_diary)
    session.commit()
    session.refresh(new_diary)

    return new_diary
