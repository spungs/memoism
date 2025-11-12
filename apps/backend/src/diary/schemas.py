"""
Diary request/response schemas.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator
from urllib.parse import urlparse


class CreateDiaryRequest(BaseModel):
    """Request schema for creating a diary entry."""

    title: Optional[str] = Field(None, max_length=200)
    content: str = Field(min_length=1, max_length=10000)
    images: Optional[List[str]] = None
    location: Optional[dict] = None

    @field_validator("images")
    @classmethod
    def validate_image_urls(cls, v):
        """Validate that all image strings are valid URLs."""
        if v is not None:
            for url in v:
                try:
                    result = urlparse(url)
                    if not all([result.scheme, result.netloc]):
                        raise ValueError(f"Invalid URL format: {url}")
                except Exception as e:
                    raise ValueError(f"Invalid URL: {url} - {e}")
        return v

    @field_validator("location")
    @classmethod
    def validate_location(cls, v):
        """Validate location contains required fields."""
        if v is not None:
            if "latitude" not in v or "longitude" not in v:
                raise ValueError("Location must contain 'latitude' and 'longitude' fields")
            try:
                lat = float(v["latitude"])
                lng = float(v["longitude"])
                if not (-90 <= lat <= 90):
                    raise ValueError("Latitude must be between -90 and 90")
                if not (-180 <= lng <= 180):
                    raise ValueError("Longitude must be between -180 and 180")
            except (TypeError, ValueError) as e:
                raise ValueError(f"Invalid latitude or longitude: {e}")
        return v


class UpdateDiaryRequest(BaseModel):
    """Request schema for updating a diary entry (partial update)."""

    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = Field(None, min_length=1, max_length=10000)
    images: Optional[List[str]] = None
    location: Optional[dict] = None

    @field_validator("images")
    @classmethod
    def validate_image_urls(cls, v):
        """Validate that all image strings are valid URLs."""
        if v is not None:
            for url in v:
                try:
                    result = urlparse(url)
                    if not all([result.scheme, result.netloc]):
                        raise ValueError(f"Invalid URL format: {url}")
                except Exception as e:
                    raise ValueError(f"Invalid URL: {url} - {e}")
        return v

    @field_validator("location")
    @classmethod
    def validate_location(cls, v):
        """Validate location contains required fields."""
        if v is not None:
            if "latitude" not in v or "longitude" not in v:
                raise ValueError("Location must contain 'latitude' and 'longitude' fields")
            try:
                lat = float(v["latitude"])
                lng = float(v["longitude"])
                if not (-90 <= lat <= 90):
                    raise ValueError("Latitude must be between -90 and 90")
                if not (-180 <= lng <= 180):
                    raise ValueError("Longitude must be between -180 and 180")
            except (TypeError, ValueError) as e:
                raise ValueError(f"Invalid latitude or longitude: {e}")
        return v


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
