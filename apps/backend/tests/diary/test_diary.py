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

    def test_create_diary_with_title(self, client: TestClient, create_and_login_user):
        """
        Test 2.2: User should be able to create a diary entry with a title.

        Given: An authenticated user
        When: POST /diary is called with title and content
        Then:
          - Response status is 201 Created
          - Response contains diary with title and content
          - Title is optional, but when provided, it's stored correctly
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]
        user_id = auth_data["user_id"]

        diary_data = {
            "title": "공원에서의 하루",
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
        assert data["title"] == diary_data["title"]
        assert data["content"] == diary_data["content"]
        assert data["user_id"] == user_id
        assert "created_at" in data

    def test_create_diary_with_images(self, client: TestClient, create_and_login_user):
        """
        Test 2.3: User should be able to create a diary entry with image URLs.

        Given: An authenticated user
        When: POST /diary is called with content and image URLs
        Then:
          - Response status is 201 Created
          - Response contains diary with images array
          - Images are stored as a list of URL strings
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]
        user_id = auth_data["user_id"]

        diary_data = {
            "content": "오늘 공원에서 찍은 사진들",
            "images": [
                "https://example.com/images/photo1.jpg",
                "https://example.com/images/photo2.jpg",
                "https://example.com/images/photo3.jpg"
            ]
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
        assert "images" in data
        assert data["images"] == diary_data["images"]
        assert len(data["images"]) == 3
        assert "created_at" in data

    def test_create_diary_with_location(self, client: TestClient, create_and_login_user):
        """
        Test 2.4: User should be able to create a diary entry with location data.

        Given: An authenticated user
        When: POST /diary is called with content and location (JSONB)
        Then:
          - Response status is 201 Created
          - Response contains diary with location object
          - Location contains latitude, longitude, and address
          - Location is stored as JSONB format
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]
        user_id = auth_data["user_id"]

        diary_data = {
            "content": "서울 남산에서 바라본 야경이 아름다웠다.",
            "location": {
                "latitude": 37.5512,
                "longitude": 126.9882,
                "address": "서울특별시 중구 남산공원길 105"
            }
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
        assert "location" in data
        assert data["location"]["latitude"] == diary_data["location"]["latitude"]
        assert data["location"]["longitude"] == diary_data["location"]["longitude"]
        assert data["location"]["address"] == diary_data["location"]["address"]
        assert "created_at" in data

    def test_create_diary_unauthorized(self, client: TestClient):
        """
        Test 2.5: Creating a diary without authentication should fail.

        Given: No authentication token
        When: POST /diary is called without Authorization header
        Then:
          - Response status is 401 Unauthorized
          - Error message indicates authentication is required
        """
        # Arrange
        diary_data = {
            "content": "인증 없이 작성한 일기"
        }

        # Act
        response = client.post("/diary", json=diary_data)

        # Assert
        assert response.status_code == 401
        assert "detail" in response.json()
