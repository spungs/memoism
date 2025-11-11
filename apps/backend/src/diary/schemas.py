"""
Diary request/response schemas.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class CreateDiaryRequest(BaseModel):
    """Request schema for creating a diary entry."""

    title: Optional[str] = None
    content: str
    images: Optional[List[str]] = None
    location: Optional[dict] = None


class DiaryResponse(BaseModel):
    """Response schema for diary operations."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: Optional[str]
    content: str
    images: Optional[List[str]]
    location: Optional[dict]
    created_at: datetime
