from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4
import json

from sqlmodel import Field, SQLModel

class Profile(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    character_age: int = Field(default=1)
    coins: int = Field(default=0)
    subscription_end_date: Optional[datetime] = None

class Diary(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="profile.id")
    content: str
    images: Optional[str] = None  # JSON string storing array of image URLs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = Field(default=False)

class DiaryComment(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    diary_id: UUID = Field(foreign_key="diary.id")
    user_id: UUID = Field(foreign_key="profile.id")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DiaryReaction(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    diary_id: UUID = Field(foreign_key="diary.id")
    user_id: UUID = Field(foreign_key="profile.id")
    reaction_type: str = Field(...)  # '❤️', '👍', '😢'
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StoreItem(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    description: Optional[str] = None
    price_coins: int
    item_type: str = Field(...)  # 'outfit', 'age_revert'
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserItem(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="profile.id")
    item_id: UUID = Field(foreign_key="storeitem.id")
    purchased_at: datetime = Field(default_factory=datetime.utcnow)
    is_equipped: bool = Field(default=False)

class Follow(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    follower_id: UUID = Field(foreign_key="profile.id")  # 팔로우하는 사람
    following_id: UUID = Field(foreign_key="profile.id")  # 팔로우 받는 사람
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Notification(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="profile.id")  # 알림을 받을 사용자
    type: str  # "follow", "diary_shared", "comment", "reaction"
    title: str
    message: str
    data: Optional[str] = None  # JSON 형태의 추가 데이터
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow) 