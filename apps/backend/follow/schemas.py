from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class FollowResponse(BaseModel):
    id: UUID
    follower_id: UUID
    following_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    id: UUID
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    title: str
    message: str
    data: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True 