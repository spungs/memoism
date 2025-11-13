"""
Chat API endpoints.
"""
from fastapi import APIRouter, Depends, status
from sqlmodel import Session
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
