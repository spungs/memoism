from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel

class DiaryBase(BaseModel):
    content: str
    images: Optional[List[str]] = None  # List of image URLs, max 10
    is_public: bool = False

class DiaryCreate(DiaryBase):
    pass

class DiaryUpdate(DiaryBase):
    content: Optional[str] = None
    is_public: Optional[bool] = None
    images: Optional[List[str]] = None

class UserInfo(BaseModel):
    id: str
    username: str

class DiaryResponse(BaseModel):
    id: UUID
    user_id: UUID
    content: str
    images: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime
    is_public: bool = False
    user: Optional[UserInfo] = None

    class Config:
        from_attributes = True
