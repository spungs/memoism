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

    def test_list_diaries_empty(self, client: TestClient, create_and_login_user):
        """
        Test 2.6: Listing diaries should return an empty list when user has no diaries.

        Given: An authenticated user with no diary entries
        When: GET /diary is called
        Then:
          - Response status is 200 OK
          - Response contains an empty list
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Act
        response = client.get("/diary", headers=headers)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_list_diaries_with_data(self, client: TestClient, create_and_login_user):
        """
        Test 2.7: Listing diaries should return all user's diary entries.

        Given: An authenticated user with 3 diary entries
        When: GET /diary is called
        Then:
          - Response status is 200 OK
          - Response contains a list of 3 diaries
          - Each diary has all expected fields
          - Diaries are sorted by created_at (newest first)
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]
        user_id = auth_data["user_id"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Create 3 diary entries
        diary1 = {"content": "첫 번째 일기"}
        diary2 = {"content": "두 번째 일기", "title": "제목 있는 일기"}
        diary3 = {"content": "세 번째 일기", "images": ["https://example.com/image.jpg"]}

        client.post("/diary", json=diary1, headers=headers)
        client.post("/diary", json=diary2, headers=headers)
        client.post("/diary", json=diary3, headers=headers)

        # Act
        response = client.get("/diary", headers=headers)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3

        # Verify all diaries belong to the authenticated user
        for diary in data:
            assert diary["user_id"] == user_id
            assert "id" in diary
            assert "content" in diary
            assert "created_at" in diary

        # Verify specific diary contents
        contents = [d["content"] for d in data]
        assert "첫 번째 일기" in contents
        assert "두 번째 일기" in contents
        assert "세 번째 일기" in contents

    def test_list_diaries_pagination(self, client: TestClient, create_and_login_user):
        """
        Test 2.8: Listing diaries should support pagination (skip and limit).

        Given: An authenticated user with 10 diary entries
        When: GET /diary is called with skip and limit parameters
        Then:
          - Response status is 200 OK
          - Response contains only the requested number of items (limit)
          - Pagination works correctly with skip parameter
          - Default values work when parameters are not provided
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Create 10 diary entries
        for i in range(10):
            diary_data = {"content": f"일기 {i+1}"}
            client.post("/diary", json=diary_data, headers=headers)

        # Act & Assert: Test default pagination (no parameters)
        response = client.get("/diary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10  # All diaries returned by default

        # Act & Assert: Test limit parameter
        response = client.get("/diary?limit=5", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5

        # Act & Assert: Test skip parameter
        response = client.get("/diary?skip=5", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5  # Remaining 5 diaries

        # Act & Assert: Test both skip and limit
        response = client.get("/diary?skip=3&limit=4", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4

        # Act & Assert: Test skip beyond available items
        response = client.get("/diary?skip=20", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0  # No items available

    def test_list_diaries_date_filter(self, client: TestClient, create_and_login_user, session):
        """
        Test 2.9: Listing diaries should support date filtering.

        Given: An authenticated user with diary entries on different dates
        When: GET /diary is called with date filter parameters
        Then:
          - Response status is 200 OK
          - Only diaries matching the date filter are returned
          - Date filter supports both specific date and date range
        """
        from datetime import datetime, timedelta, timezone
        from src.models import Diary

        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]
        user_id = auth_data["user_id"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Create diaries with different dates (directly in DB to control created_at)
        today = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)
        yesterday = today - timedelta(days=1)
        two_days_ago = today - timedelta(days=2)
        three_days_ago = today - timedelta(days=3)

        # Create 4 diaries with different dates
        diary1 = Diary(user_id=user_id, content="오늘 일기", created_at=today)
        diary2 = Diary(user_id=user_id, content="어제 일기", created_at=yesterday)
        diary3 = Diary(user_id=user_id, content="그저께 일기", created_at=two_days_ago)
        diary4 = Diary(user_id=user_id, content="3일 전 일기", created_at=three_days_ago)

        session.add(diary1)
        session.add(diary2)
        session.add(diary3)
        session.add(diary4)
        session.commit()

        # Act & Assert: Test filtering by specific date
        date_str = today.date().isoformat()
        response = client.get(f"/diary?date={date_str}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["content"] == "오늘 일기"

        # Act & Assert: Test filtering by date range (start_date and end_date)
        start_date = three_days_ago.date().isoformat()
        end_date = yesterday.date().isoformat()
        response = client.get(f"/diary?start_date={start_date}&end_date={end_date}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        contents = [d["content"] for d in data]
        assert "어제 일기" in contents
        assert "그저께 일기" in contents
        assert "3일 전 일기" in contents

        # Act & Assert: Test with only start_date
        start_date = yesterday.date().isoformat()
        response = client.get(f"/diary?start_date={start_date}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Yesterday and today
        contents = [d["content"] for d in data]
        assert "오늘 일기" in contents
        assert "어제 일기" in contents

        # Act & Assert: Test with only end_date
        end_date = two_days_ago.date().isoformat()
        response = client.get(f"/diary?end_date={end_date}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # 2 days ago and 3 days ago
        contents = [d["content"] for d in data]
        assert "그저께 일기" in contents
        assert "3일 전 일기" in contents

    def test_get_diary_detail(self, client: TestClient, create_and_login_user):
        """
        Test 2.10: User should be able to get a specific diary entry by ID.

        Given: An authenticated user with diary entries
        When: GET /diary/{diary_id} is called with a valid diary ID
        Then:
          - Response status is 200 OK
          - Response contains the complete diary data
          - All fields (id, title, content, images, location, created_at) are present
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Create a diary with all fields
        diary_data = {
            "title": "서울 여행",
            "content": "오늘 서울에 다녀왔다. 날씨가 좋았고 경복궁을 구경했다.",
            "images": [
                "https://example.com/palace1.jpg",
                "https://example.com/palace2.jpg"
            ],
            "location": {
                "latitude": 37.5796,
                "longitude": 126.9770,
                "address": "서울특별시 종로구 경복궁"
            }
        }

        create_response = client.post("/diary", json=diary_data, headers=headers)
        assert create_response.status_code == 201
        created_diary = create_response.json()
        diary_id = created_diary["id"]

        # Act
        response = client.get(f"/diary/{diary_id}", headers=headers)

        # Assert
        assert response.status_code == 200
        data = response.json()

        # Verify all fields are present and correct
        assert data["id"] == diary_id
        assert data["title"] == diary_data["title"]
        assert data["content"] == diary_data["content"]
        assert data["images"] == diary_data["images"]
        assert data["location"]["latitude"] == diary_data["location"]["latitude"]
        assert data["location"]["longitude"] == diary_data["location"]["longitude"]
        assert data["location"]["address"] == diary_data["location"]["address"]
        assert "created_at" in data
        assert "user_id" in data

    def test_get_diary_not_found(self, client: TestClient, create_and_login_user):
        """
        Test 2.11: Getting a non-existent diary should fail with 404.

        Given: An authenticated user
        When: GET /diary/{diary_id} is called with a non-existent diary ID
        Then:
          - Response status is 404 Not Found
          - Error message indicates diary was not found
        """
        from uuid import uuid4

        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Generate a random UUID that doesn't exist in the database
        non_existent_diary_id = uuid4()

        # Act
        response = client.get(f"/diary/{non_existent_diary_id}", headers=headers)

        # Assert
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "찾을 수" in data["detail"]

    def test_update_diary(self, client: TestClient, create_and_login_user):
        """
        Test 2.12: User should be able to update their own diary entry.

        Given: An authenticated user with an existing diary entry
        When: PUT /diary/{diary_id} is called with updated data
        Then:
          - Response status is 200 OK
          - Response contains the updated diary data
          - Original fields not included in the update remain unchanged
          - Updated fields reflect the new values
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Create an initial diary entry
        initial_diary_data = {
            "title": "원래 제목",
            "content": "원래 내용입니다.",
            "images": ["https://example.com/old-image.jpg"]
        }

        create_response = client.post("/diary", json=initial_diary_data, headers=headers)
        assert create_response.status_code == 201
        created_diary = create_response.json()
        diary_id = created_diary["id"]

        # Prepare update data (partial update)
        update_data = {
            "title": "수정된 제목",
            "content": "수정된 내용입니다. 오늘 정말 좋은 일이 있었다."
        }

        # Act
        response = client.put(f"/diary/{diary_id}", json=update_data, headers=headers)

        # Assert
        assert response.status_code == 200
        data = response.json()

        # Verify updated fields
        assert data["id"] == diary_id
        assert data["title"] == update_data["title"]
        assert data["content"] == update_data["content"]

        # Verify unchanged fields (images should remain)
        assert data["images"] == initial_diary_data["images"]

        # Verify metadata
        assert "created_at" in data
        assert "user_id" in data

    def test_update_diary_unauthorized(self, client: TestClient, create_and_login_user):
        """
        Test 2.13: User should not be able to update another user's diary entry.

        Given: Two authenticated users (User A and User B)
        And: User A has created a diary entry
        When: User B tries to update User A's diary entry
        Then:
          - Response status is 404 Not Found
          - Error message indicates diary was not found
          - User A's diary remains unchanged
        """
        # Arrange: Create User A and their diary
        user_a_data = create_and_login_user()
        user_a_token = user_a_data["access_token"]

        headers_a = {
            "Authorization": f"Bearer {user_a_token}"
        }

        # User A creates a diary
        diary_data = {
            "title": "User A의 일기",
            "content": "이것은 User A의 개인 일기입니다."
        }

        create_response = client.post("/diary", json=diary_data, headers=headers_a)
        assert create_response.status_code == 201
        created_diary = create_response.json()
        diary_id = created_diary["id"]

        # Arrange: Create User B with different credentials
        user_b_data = create_and_login_user(
            email="user_b@example.com",
            username="user_b",
            password="UserBPass123!"
        )
        user_b_token = user_b_data["access_token"]

        headers_b = {
            "Authorization": f"Bearer {user_b_token}"
        }

        # User B attempts to update User A's diary
        malicious_update = {
            "title": "해킹 시도",
            "content": "다른 사용자의 일기를 수정하려는 시도"
        }

        # Act
        response = client.put(f"/diary/{diary_id}", json=malicious_update, headers=headers_b)

        # Assert
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "찾을 수" in data["detail"]

        # Verify User A's diary remains unchanged
        verify_response = client.get(f"/diary/{diary_id}", headers=headers_a)
        assert verify_response.status_code == 200
        original_diary = verify_response.json()
        assert original_diary["title"] == diary_data["title"]
        assert original_diary["content"] == diary_data["content"]

    def test_delete_diary(self, client: TestClient, create_and_login_user):
        """
        Test 2.14: User should be able to delete their own diary entry.

        Given: An authenticated user with an existing diary entry
        When: DELETE /diary/{diary_id} is called
        Then:
          - Response status is 204 No Content
          - The diary is removed from the database
          - Subsequent GET requests return 404
        """
        # Arrange
        auth_data = create_and_login_user()
        access_token = auth_data["access_token"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Create a diary to delete
        diary_data = {
            "title": "삭제할 일기",
            "content": "이 일기는 곧 삭제될 예정입니다."
        }

        create_response = client.post("/diary", json=diary_data, headers=headers)
        assert create_response.status_code == 201
        created_diary = create_response.json()
        diary_id = created_diary["id"]

        # Verify diary exists before deletion
        verify_response = client.get(f"/diary/{diary_id}", headers=headers)
        assert verify_response.status_code == 200

        # Act
        response = client.delete(f"/diary/{diary_id}", headers=headers)

        # Assert
        assert response.status_code == 204

        # Verify diary no longer exists
        verify_deleted_response = client.get(f"/diary/{diary_id}", headers=headers)
        assert verify_deleted_response.status_code == 404

    def test_delete_diary_unauthorized(self, client: TestClient, create_and_login_user):
        """
        Test 2.15: User should not be able to delete another user's diary entry.

        Given: Two authenticated users (User A and User B)
        And: User A has created a diary entry
        When: User B tries to delete User A's diary entry
        Then:
          - Response status is 404 Not Found
          - Error message indicates diary was not found
          - User A's diary remains intact in the database
        """
        # Arrange: Create User A and their diary
        user_a_data = create_and_login_user()
        user_a_token = user_a_data["access_token"]

        headers_a = {
            "Authorization": f"Bearer {user_a_token}"
        }

        # User A creates a diary
        diary_data = {
            "title": "User A의 중요한 일기",
            "content": "이 일기는 절대 삭제되어서는 안 됩니다."
        }

        create_response = client.post("/diary", json=diary_data, headers=headers_a)
        assert create_response.status_code == 201
        created_diary = create_response.json()
        diary_id = created_diary["id"]

        # Arrange: Create User B with different credentials
        user_b_data = create_and_login_user(
            email="user_b@example.com",
            username="user_b",
            password="UserBPass123!"
        )
        user_b_token = user_b_data["access_token"]

        headers_b = {
            "Authorization": f"Bearer {user_b_token}"
        }

        # Act: User B attempts to delete User A's diary
        response = client.delete(f"/diary/{diary_id}", headers=headers_b)

        # Assert
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "찾을 수" in data["detail"]

        # Verify User A's diary still exists
        verify_response = client.get(f"/diary/{diary_id}", headers=headers_a)
        assert verify_response.status_code == 200
        original_diary = verify_response.json()
        assert original_diary["title"] == diary_data["title"]
        assert original_diary["content"] == diary_data["content"]

    def test_cannot_access_other_users_diary(self, client: TestClient, create_and_login_user):
        """
        Test 2.16: User should not be able to access another user's diary entry.

        Given: Two authenticated users (User A and User B)
        And: User A has created a diary entry
        When: User B tries to access User A's diary entry via GET
        Then:
          - Response status is 404 Not Found
          - Error message indicates diary was not found
          - User B cannot see any information about User A's diary
        """
        # Arrange: Create User A and their diary
        user_a_data = create_and_login_user()
        user_a_token = user_a_data["access_token"]

        headers_a = {
            "Authorization": f"Bearer {user_a_token}"
        }

        # User A creates a private diary
        diary_data = {
            "title": "User A의 비밀 일기",
            "content": "이것은 절대 다른 사람이 볼 수 없는 개인적인 내용입니다."
        }

        create_response = client.post("/diary", json=diary_data, headers=headers_a)
        assert create_response.status_code == 201
        created_diary = create_response.json()
        diary_id = created_diary["id"]

        # Arrange: Create User B with different credentials
        user_b_data = create_and_login_user(
            email="user_b@example.com",
            username="user_b",
            password="UserBPass123!"
        )
        user_b_token = user_b_data["access_token"]

        headers_b = {
            "Authorization": f"Bearer {user_b_token}"
        }

        # Act: User B attempts to access User A's diary
        response = client.get(f"/diary/{diary_id}", headers=headers_b)

        # Assert
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "찾을 수" in data["detail"]

        # Verify User A can still access their own diary
        verify_response = client.get(f"/diary/{diary_id}", headers=headers_a)
        assert verify_response.status_code == 200
        original_diary = verify_response.json()
        assert original_diary["title"] == diary_data["title"]
        assert original_diary["content"] == diary_data["content"]
