"""
Chat API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session, select, desc
from uuid import UUID

from src.database import get_session
from src.auth.dependencies import get_current_user_id
from src.models import ChatMessage
from src.chat.schemas import SendMessageRequest, ChatMessageResponse


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    message_data: SendMessageRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """
    Send a chat message from the user.

    Args:
        message_data: The message content
        current_user_id: The authenticated user's ID
        session: Database session

    Returns:
        The created chat message
    """
    # Create user message
    chat_message = ChatMessage(
        user_id=current_user_id,
        role="user",
        content=message_data.content,
    )

    session.add(chat_message)
    session.commit()
    session.refresh(chat_message)

    return chat_message


@router.get("", response_model=List[ChatMessageResponse])
def get_chat_history(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    current_user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """
    Get chat message history for the authenticated user.

    Messages are returned in reverse chronological order (newest first).

    Args:
        skip: Number of messages to skip (for pagination)
        limit: Maximum number of messages to return
        current_user_id: The authenticated user's ID
        session: Database session

    Returns:
        List of chat messages
    """
    # Query messages for this user, ordered by created_at descending (newest first)
    statement = (
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user_id)
        .order_by(desc(ChatMessage.created_at))
        .offset(skip)
        .limit(limit)
    )

    messages = session.exec(statement).all()
    return messages
