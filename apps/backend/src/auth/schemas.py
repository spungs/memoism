"""
Authentication schemas for request/response.
"""
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SignupRequest(BaseModel):
    """Request schema for user signup."""

    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)


class UserResponse(BaseModel):
    """Response schema for user data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    username: str


class LoginRequest(BaseModel):
    """Request schema for user login."""

    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Response schema for login with JWT token."""

    access_token: str
    token_type: str
