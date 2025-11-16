"""
Common error messages for consistent error responses across the application.

This module centralizes all error messages to ensure consistency and
make it easier to maintain error messages in one place.
"""

# Authentication errors
ERROR_EMAIL_ALREADY_REGISTERED = "이미 등록된 이메일입니다"
ERROR_USERNAME_ALREADY_TAKEN = "이미 사용 중인 사용자명입니다"
ERROR_INCORRECT_CREDENTIALS = "이메일 또는 비밀번호가 올바르지 않습니다"
ERROR_MISSING_AUTH_HEADER = "인증 헤더가 누락되었습니다"
ERROR_INVALID_AUTH_HEADER_FORMAT = "인증 헤더 형식이 올바르지 않습니다"
ERROR_INVALID_OR_EXPIRED_TOKEN = "유효하지 않거나 만료된 토큰입니다"

# Diary errors
ERROR_DIARY_NOT_FOUND = "일기를 찾을 수 없습니다"
