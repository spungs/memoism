"""
Authentication schemas for request/response.
"""
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr


class SignupRequest(BaseModel):
    """Request schema for user signup."""

    email: EmailStr
    username: str
    password: str


class UserResponse(BaseModel):
    """Response schema for user data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    username: str
