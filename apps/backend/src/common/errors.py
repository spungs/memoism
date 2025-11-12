"""
Common error messages for consistent error responses across the application.

This module centralizes all error messages to ensure consistency and
make it easier to maintain error messages in one place.
"""

# Authentication errors
ERROR_EMAIL_ALREADY_REGISTERED = "Email already registered"
ERROR_USERNAME_ALREADY_TAKEN = "Username already taken"
ERROR_INCORRECT_CREDENTIALS = "Incorrect email or password"
ERROR_MISSING_AUTH_HEADER = "Missing authorization header"
ERROR_INVALID_AUTH_HEADER_FORMAT = "Invalid authorization header format"
ERROR_INVALID_OR_EXPIRED_TOKEN = "Invalid or expired token"

# Diary errors
ERROR_DIARY_NOT_FOUND = "Diary not found"
