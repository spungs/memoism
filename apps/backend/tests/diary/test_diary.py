"""
Diary CRUD tests following TDD principles.

Test naming convention: test_<feature>_<scenario>
"""
import pytest
from fastapi.testclient import TestClient


class TestDiary:
    """Diary CRUD test suite."""

    def test_create_diary_basic(self, client: TestClient, create_and_login_user):
        """
        Test 2.1: User should be able to create a basic diary entry.

        Given: An authenticated user
        When: POST /diary is called with basic content
        Then:
          - Response status is 201 Created
          - Response contains diary id, content, user_id, created_at
          - The diary belongs to the authenticated user
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]
        user_id = auth_data["user_id"]

        diary_data = {
            "content": "오늘은 날씨가 참 좋았다. 공원을 산책하며 많은 생각을 했다."
        }

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Act
        response = client.post("/diary", json=diary_data, headers=headers)

        # Assert
        assert response.status_code == 201

        data = response.json()
        assert "id" in data
        assert data["content"] == diary_data["content"]
        assert data["user_id"] == user_id
        assert "created_at" in data
