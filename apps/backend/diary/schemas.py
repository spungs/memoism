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

class CommentInfo(BaseModel):
    id: str
    content: str
    user: UserInfo
    created_at: datetime

class DiaryResponse(BaseModel):
    id: UUID
    user_id: UUID
    content: str
    images: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime
    is_public: bool
    user: Optional[UserInfo] = None
    comment_count: int = 0
    like_count: int = 0
    is_liked: bool = False
    comments: List[CommentInfo] = []

    class Config:
        from_attributes = True

class DiaryCommentBase(BaseModel):
    content: str

class DiaryCommentCreate(DiaryCommentBase):
    pass

class DiaryCommentResponse(DiaryCommentBase):
    id: UUID
    diary_id: UUID
    user_id: UUID
    content: str
    created_at: datetime
    user: Optional[UserInfo] = None

    class Config:
        from_attributes = True

class DiaryReactionBase(BaseModel):
    reaction_type: str

class DiaryReactionCreate(DiaryReactionBase):
    pass

class DiaryReactionResponse(DiaryReactionBase):
    id: UUID
    diary_id: UUID
    user_id: UUID
    reaction_type: str
    created_at: datetime

    class Config:
        from_attributes = True 