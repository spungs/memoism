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
