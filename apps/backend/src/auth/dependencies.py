"""
Authentication dependencies for FastAPI.
"""
from typing import Optional
from uuid import UUID
from fastapi import Header, HTTPException, status
from src.auth.utils import verify_token
from src.common.errors import (
    ERROR_MISSING_AUTH_HEADER,
    ERROR_INVALID_AUTH_HEADER_FORMAT,
    ERROR_INVALID_OR_EXPIRED_TOKEN,
)


def get_current_user_id(authorization: Optional[str] = Header(default=None)) -> UUID:
    """
    Extract and verify user ID from JWT token in Authorization header.

    This dependency can be used in any FastAPI route that requires authentication.

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        User ID from token

    Raises:
        HTTPException: If token is invalid or missing
    """
    # Check if authorization header is present
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MISSING_AUTH_HEADER,
        )

    # Extract token from "Bearer <token>"
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_INVALID_AUTH_HEADER_FORMAT,
        )

    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_INVALID_OR_EXPIRED_TOKEN,
        )

    return UUID(payload["sub"])
