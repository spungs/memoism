"""
Authentication tests following TDD principles.

Test naming convention: test_<feature>_<scenario>
"""
import pytest
from fastapi.testclient import TestClient


class TestAuthentication:
    """Authentication test suite."""

    def test_signup_success(self, client: TestClient):
        """
        Test 1.1: User signup should succeed with valid credentials.

        Given: Valid email, username, and password
        When: POST /auth/signup is called
        Then:
          - Response status is 201 Created
          - Response contains user id, email, username
          - Password is not returned in response
        """
        # Arrange
        signup_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "SecurePass123!"
        }

        # Act
        response = client.post("/auth/signup", json=signup_data)

        # Assert
        assert response.status_code == 201

        data = response.json()
        assert "id" in data
        assert data["email"] == signup_data["email"]
        assert data["username"] == signup_data["username"]
        assert "password" not in data  # Password should never be returned

    def test_signup_duplicate_email(self, client: TestClient):
        """
        Test 1.2: User signup should fail with duplicate email.

        Given: An existing user with email "duplicate@example.com"
        When: Another signup attempt with the same email
        Then:
          - Response status is 400 Bad Request
          - Error message indicates email is already registered
        """
        # Arrange
        first_user = {
            "email": "duplicate@example.com",
            "username": "firstuser",
            "password": "Password123!"
        }
        second_user = {
            "email": "duplicate@example.com",  # Same email
            "username": "seconduser",  # Different username
            "password": "DifferentPass456!"
        }

        # Act
        # First signup should succeed
        first_response = client.post("/auth/signup", json=first_user)
        assert first_response.status_code == 201

        # Second signup with same email should fail
        second_response = client.post("/auth/signup", json=second_user)

        # Assert
        assert second_response.status_code == 400

        error_data = second_response.json()
        assert "detail" in error_data
        assert "email" in error_data["detail"].lower()
        assert "already" in error_data["detail"].lower()

    def test_signup_invalid_email(self, client: TestClient):
        """
        Test 1.3: User signup should fail with invalid email format.

        Given: Invalid email formats (missing @, missing domain, etc.)
        When: POST /auth/signup is called
        Then:
          - Response status is 422 Unprocessable Entity
          - Error message indicates email validation failure
        """
        # Arrange: Various invalid email formats
        invalid_emails = [
            "notanemail",           # Missing @ and domain
            "missing@domain",       # Missing TLD
            "@nodomain.com",        # Missing local part
            "spaces in@email.com",  # Spaces in email
            "double@@example.com",  # Double @
        ]

        for invalid_email in invalid_emails:
            # Act
            signup_data = {
                "email": invalid_email,
                "username": "testuser",
                "password": "SecurePass123!"
            }
            response = client.post("/auth/signup", json=signup_data)

            # Assert
            assert response.status_code == 422, \
                f"Expected 422 for invalid email '{invalid_email}', got {response.status_code}"

            error_data = response.json()
            assert "detail" in error_data
            # Pydantic validation errors have a specific structure
            assert isinstance(error_data["detail"], list)
            assert any("email" in str(err).lower() for err in error_data["detail"]), \
                f"Expected email validation error for '{invalid_email}', got {error_data}"

    def test_password_hashing(self, client: TestClient, session):
        """
        Test 1.4: Passwords should be hashed using bcrypt before storage.

        Given: A user signs up with a plain text password
        When: The user is created in the database
        Then:
          - The stored password is different from the plain text password
          - The stored password is a valid bcrypt hash (starts with $2b$)
          - The stored password can be verified using bcrypt.checkpw
        """
        import bcrypt
        from sqlmodel import select
        from src.models import User

        # Arrange
        plain_password = "MySecurePassword123!"
        signup_data = {
            "email": "hashtest@example.com",
            "username": "hashuser",
            "password": plain_password
        }

        # Act
        response = client.post("/auth/signup", json=signup_data)
        assert response.status_code == 201

        # Query the database directly to get the hashed password
        user = session.exec(
            select(User).where(User.email == signup_data["email"])
        ).first()

        # Assert
        assert user is not None, "User should exist in database"

        # Password should be hashed, not stored as plain text
        assert user.hashed_password != plain_password, \
            "Password should be hashed, not stored as plain text"

        # Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
        assert user.hashed_password.startswith("$2b$"), \
            f"Password should be a valid bcrypt hash, got: {user.hashed_password[:10]}"

        # Verify the hashed password can be validated against the original
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = user.hashed_password.encode('utf-8')
        assert bcrypt.checkpw(password_bytes, hashed_bytes), \
            "Hashed password should be verifiable with bcrypt.checkpw"

    def test_password_hashing_roundtrip(self):
        """
        Test 1.5: Password hashing and verification should work end-to-end.

        Given: A plain text password
        When: The password is hashed and then verified
        Then:
          - Correct password verification should return True
          - Incorrect password verification should return False
          - Multiple hashes of the same password should be different (due to salt)
        """
        import bcrypt
        from src.auth.router import hash_password

        # Arrange
        plain_password = "TestPassword123!"
        wrong_password = "WrongPassword456!"

        # Act
        hashed_password = hash_password(plain_password)

        # Assert - Correct password should verify successfully
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        assert bcrypt.checkpw(password_bytes, hashed_bytes), \
            "Correct password should verify against its hash"

        # Assert - Incorrect password should fail verification
        wrong_bytes = wrong_password.encode('utf-8')
        assert not bcrypt.checkpw(wrong_bytes, hashed_bytes), \
            "Incorrect password should not verify against the hash"

        # Assert - Multiple hashes should be different (bcrypt generates unique salt)
        second_hash = hash_password(plain_password)
        assert hashed_password != second_hash, \
            "Multiple hashes of the same password should be different due to unique salts"

        # Assert - But both hashes should verify the same password
        second_hash_bytes = second_hash.encode('utf-8')
        assert bcrypt.checkpw(password_bytes, second_hash_bytes), \
            "Second hash should also verify the original password"
