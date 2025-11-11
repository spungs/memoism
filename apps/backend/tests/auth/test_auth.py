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
