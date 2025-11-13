"""
Pydantic schemas for Chat API requests and responses.
"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class SendMessageRequest(BaseModel):
    """Request schema for sending a chat message."""

    content: str


class ChatMessageResponse(BaseModel):
    """Response schema for a chat message."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    content: str
    created_at: datetime
