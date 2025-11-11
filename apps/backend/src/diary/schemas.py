"""
Diary request/response schemas.
"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class CreateDiaryRequest(BaseModel):
    """Request schema for creating a diary entry."""

    content: str


class DiaryResponse(BaseModel):
    """Response schema for diary operations."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    content: str
    created_at: datetime
