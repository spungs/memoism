"""
Integration tests for full user journey flows.

These tests verify that the entire system works together correctly
from end to end.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from sqlmodel import Session


class TestUserJourney:
    """Integration tests for complete user workflows."""

    def test_full_user_journey(self, client: TestClient):
        """
        Test 5.1: Complete user journey from signup to logout.

        Given: A new user wants to use the application
        When: User goes through the complete flow
        Then:
          - User can sign up successfully
          - User can log in and receive a token
          - User can create a diary entry
          - User can retrieve their diary entries
          - User can update a diary entry
          - User can delete a diary entry
          - All operations work seamlessly together
        """
        # Step 1: Signup
        signup_data = {
            "email": "journey@example.com",
            "username": "journeyuser",
            "password": "SecureJourney123!",
        }

        signup_response = client.post("/auth/signup", json=signup_data)
        assert signup_response.status_code == 201
        user_data = signup_response.json()
        assert user_data["email"] == signup_data["email"]
        user_id = user_data["id"]

        # Step 2: Login
        login_data = {
            "email": signup_data["email"],
            "password": signup_data["password"],
        }

        login_response = client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        token_data = login_response.json()
        assert "access_token" in token_data
        token = token_data["access_token"]

        # Step 3: Create diary entry
        diary_data = {
            "content": "오늘은 통합 테스트를 작성했다. TDD는 정말 재미있다!",
            "title": "통합 테스트 작성",
            "images": ["https://example.com/test-image.jpg"],
            "location": {
                "latitude": 37.5665,
                "longitude": 126.9780,
                "address": "서울특별시 중구",
            },
        }

        create_response = client.post(
            "/diary",
            json=diary_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        created_diary = create_response.json()
        assert created_diary["content"] == diary_data["content"]
        assert created_diary["title"] == diary_data["title"]
        assert created_diary["user_id"] == user_id
        diary_id = created_diary["id"]

        # Step 4: Retrieve diary entries (list)
        list_response = client.get(
            "/diary", headers={"Authorization": f"Bearer {token}"}
        )
        assert list_response.status_code == 200
        diaries = list_response.json()
        assert len(diaries) >= 1
        assert any(d["id"] == diary_id for d in diaries)

        # Step 5: Retrieve specific diary entry (detail)
        detail_response = client.get(
            f"/diary/{diary_id}", headers={"Authorization": f"Bearer {token}"}
        )
        assert detail_response.status_code == 200
        diary_detail = detail_response.json()
        assert diary_detail["id"] == diary_id
        assert diary_detail["content"] == diary_data["content"]

        # Step 6: Update diary entry
        update_data = {
            "content": "통합 테스트를 수정했다. 모든 테스트가 통과한다!",
            "title": "통합 테스트 수정",
        }

        update_response = client.put(
            f"/diary/{diary_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert update_response.status_code == 200
        updated_diary = update_response.json()
        assert updated_diary["content"] == update_data["content"]
        assert updated_diary["title"] == update_data["title"]

        # Step 7: Delete diary entry
        delete_response = client.delete(
            f"/diary/{diary_id}", headers={"Authorization": f"Bearer {token}"}
        )
        assert delete_response.status_code == 204

        # Verify deletion - diary should not be found
        verify_response = client.get(
            f"/diary/{diary_id}", headers={"Authorization": f"Bearer {token}"}
        )
        assert verify_response.status_code == 404

        # Step 8: Verify list is now empty (or at least doesn't contain deleted diary)
        final_list_response = client.get(
            "/diary", headers={"Authorization": f"Bearer {token}"}
        )
        assert final_list_response.status_code == 200
        final_diaries = final_list_response.json()
        assert not any(d["id"] == diary_id for d in final_diaries)

    def test_network_failure_handling(self, client: TestClient, session: Session):
        """
        Test 5.2: API should handle database failures gracefully.

        Given: A logged-in user wants to create a diary entry
        When: A database error occurs during the operation
        Then:
          - Response status is 500 Internal Server Error
          - Error response is properly formatted
          - The system does not crash
          - Other requests can still be processed after the error
        """
        from src.main import app
        from src.database import get_session

        # Setup: Create and login a user first
        signup_data = {
            "email": "dbfailure@example.com",
            "username": "dbfailureuser",
            "password": "SecurePassword123!",
        }

        signup_response = client.post("/auth/signup", json=signup_data)
        assert signup_response.status_code == 201

        login_data = {
            "email": signup_data["email"],
            "password": signup_data["password"],
        }

        login_response = client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Save the original session override
        original_override = app.dependency_overrides.get(get_session)

        # Create a mock session that will fail on commit
        def get_failing_session():
            mock_session = MagicMock(spec=Session)
            # Make the mock session behave like a real session for most operations
            # but fail on commit
            mock_session.commit.side_effect = Exception("Database connection lost")

            # Allow the mock to be used in context manager
            mock_session.__enter__ = MagicMock(return_value=mock_session)
            mock_session.__exit__ = MagicMock(return_value=False)

            return mock_session

        # Override the get_session dependency to return our failing session
        app.dependency_overrides[get_session] = get_failing_session

        try:
            diary_data = {
                "content": "This should fail due to database error",
                "title": "Test Database Failure",
            }

            # Attempt to create diary - should fail with 500
            create_response = client.post(
                "/diary",
                json=diary_data,
                headers={"Authorization": f"Bearer {token}"},
            )

            # Verify error response
            assert create_response.status_code == 500
            error_data = create_response.json()
            assert "detail" in error_data

        finally:
            # Restore the original session override (test session)
            if original_override:
                app.dependency_overrides[get_session] = original_override

        # Verify system is still functional after the error
        # This should succeed with the restored test session
        recovery_data = {
            "content": "System recovered from database error",
            "title": "Recovery Test",
        }

        recovery_response = client.post(
            "/diary",
            json=recovery_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert recovery_response.status_code == 201
        assert recovery_response.json()["content"] == recovery_data["content"]
