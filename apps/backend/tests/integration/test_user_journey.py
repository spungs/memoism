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

    def test_token_expiration_flow(self, client: TestClient):
        """
        Test 5.3: Complete token expiration and renewal flow.

        Given: A user has logged in and received a valid token
        When: The token expires and user tries to use it
        Then:
          - API returns 401 Unauthorized for expired token
          - User can log in again to get a new token
          - New token works for authenticated requests
          - Full flow: login → use token → expire → fail → re-login → succeed
        """
        from datetime import timedelta
        from src.auth.utils import create_access_token

        # Step 1: Create user and login
        signup_data = {
            "email": "tokenexp@example.com",
            "username": "tokenexpuser",
            "password": "TokenExp123!",
        }

        signup_response = client.post("/auth/signup", json=signup_data)
        assert signup_response.status_code == 201
        user_id = signup_response.json()["id"]

        login_data = {
            "email": signup_data["email"],
            "password": signup_data["password"],
        }

        login_response = client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        valid_token = login_response.json()["access_token"]

        # Step 2: Use valid token to create a diary entry (should succeed)
        diary_data = {
            "content": "Test with valid token",
            "title": "Valid Token Test",
        }

        create_response = client.post(
            "/diary",
            json=diary_data,
            headers={"Authorization": f"Bearer {valid_token}"},
        )
        assert create_response.status_code == 201

        # Step 3: Create an expired token (negative expiration time)
        expired_token = create_access_token(
            data={"sub": str(user_id)},
            expires_delta=timedelta(seconds=-1)  # Already expired
        )

        # Step 4: Try to use expired token (should fail with 401)
        expired_diary_data = {
            "content": "This should fail with expired token",
            "title": "Expired Token Test",
        }

        expired_response = client.post(
            "/diary",
            json=expired_diary_data,
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert expired_response.status_code == 401
        error_data = expired_response.json()
        assert "detail" in error_data

        # Step 5: Verify that existing diary is still accessible with valid token
        list_response = client.get(
            "/diary",
            headers={"Authorization": f"Bearer {valid_token}"},
        )
        assert list_response.status_code == 200
        diaries = list_response.json()
        assert len(diaries) >= 1

        # Step 6: Re-login to get a new token (token renewal flow)
        relogin_response = client.post("/auth/login", json=login_data)
        assert relogin_response.status_code == 200
        new_token = relogin_response.json()["access_token"]
        # Note: Tokens might be identical if created in the same second (JWT exp is in seconds)
        # What matters is that we can get a new valid token after re-login

        # Step 7: Use new token successfully
        new_diary_data = {
            "content": "Created with renewed token after expiration",
            "title": "Renewed Token Test",
        }

        new_diary_response = client.post(
            "/diary",
            json=new_diary_data,
            headers={"Authorization": f"Bearer {new_token}"},
        )
        assert new_diary_response.status_code == 201
        assert new_diary_response.json()["content"] == new_diary_data["content"]

    def test_invalid_input_handling(self, client: TestClient, create_and_login_user):
        """
        Test 5.4: API should reject invalid inputs with appropriate error messages.

        Given: A user attempts to use the API with invalid inputs
        When: Various types of invalid data are submitted
        Then:
          - API returns 4xx error codes (400, 422)
          - Error messages are clear and informative
          - System remains stable after invalid inputs
          - Valid requests still work after invalid ones
        """
        # Get authenticated user
        auth_data = create_and_login_user(
            email="invalidtest@example.com",
            username="invalidtestuser",
            password="ValidPass123!"
        )
        token = auth_data["access_token"]

        # Test 1: Empty content in diary creation (should fail)
        empty_content_data = {
            "content": "",  # Empty content
            "title": "Empty Content Test",
        }

        empty_response = client.post(
            "/diary",
            json=empty_content_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert empty_response.status_code in [400, 422]  # Validation error
        error_data = empty_response.json()
        assert "detail" in error_data

        # Test 2: Missing required field (content)
        missing_field_data = {
            "title": "Missing Content Test",
            # content is missing
        }

        missing_response = client.post(
            "/diary",
            json=missing_field_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert missing_response.status_code == 422  # Pydantic validation error
        error_data = missing_response.json()
        assert "detail" in error_data

        # Test 3: Extremely long content (stress test)
        very_long_content = "A" * 100000  # 100k characters
        long_content_data = {
            "content": very_long_content,
            "title": "Long Content Test",
        }

        long_response = client.post(
            "/diary",
            json=long_content_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        # This might succeed or fail depending on DB constraints
        # Just verify we get a response
        assert long_response.status_code in [201, 400, 422, 413, 500]

        # Test 4: Invalid pagination parameters (negative values)
        invalid_pagination_response = client.get(
            "/diary?skip=-1&limit=-10",
            headers={"Authorization": f"Bearer {token}"},
        )
        # Should either reject or normalize negative values
        assert invalid_pagination_response.status_code in [200, 400, 422]

        # Test 5: Excessively large pagination limit
        large_limit_response = client.get(
            "/diary?limit=999999",
            headers={"Authorization": f"Bearer {token}"},
        )
        # Should work but might be capped
        assert large_limit_response.status_code == 200

        # Test 6: Invalid data types (string where number expected)
        invalid_type_response = client.get(
            "/diary?skip=abc&limit=xyz",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert invalid_type_response.status_code == 422  # Type validation error

        # Test 7: Verify system is still functional after all invalid inputs
        # Create a valid diary entry
        valid_data = {
            "content": "System is still working after invalid inputs",
            "title": "Recovery Test",
        }

        recovery_response = client.post(
            "/diary",
            json=valid_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert recovery_response.status_code == 201
        assert recovery_response.json()["content"] == valid_data["content"]

        # Test 8: Login with empty credentials (should fail gracefully)
        empty_login = client.post("/auth/login", json={"email": "", "password": ""})
        assert empty_login.status_code in [400, 422]

        # Test 9: Signup with invalid email format (already tested in Phase 1.3, verify integration)
        invalid_email_signup = client.post(
            "/auth/signup",
            json={
                "email": "not-an-email",
                "username": "testuser",
                "password": "ValidPass123!",
            },
        )
        assert invalid_email_signup.status_code in [400, 422]
        error_data = invalid_email_signup.json()
        assert "detail" in error_data

    def test_sql_injection_prevention(self, client: TestClient, create_and_login_user):
        """
        Test 5.5: API should prevent SQL injection attacks.

        Given: An attacker tries to exploit SQL injection vulnerabilities
        When: Various SQL injection payloads are submitted through API endpoints
        Then:
          - All malicious inputs are safely handled
          - No SQL injection can occur due to parameterized queries
          - System remains stable and secure
          - No data is exposed or manipulated
          - Error responses do not leak database information
        """
        # Setup: Create test user and diary entries
        auth_data = create_and_login_user(
            email="sqlinjection@example.com",
            username="sqlinjectionuser",
            password="SqlTest123!"
        )
        token = auth_data["access_token"]

        # Create a legitimate diary entry for comparison
        legitimate_diary = {
            "content": "This is a normal diary entry",
            "title": "Normal Diary",
        }
        create_response = client.post(
            "/diary",
            json=legitimate_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        legitimate_diary_id = create_response.json()["id"]

        # Test 1: SQL injection in email field during login
        # Attempt: ' OR '1'='1' -- (classic SQL injection)
        sql_injection_login = {
            "email": "' OR '1'='1' --",
            "password": "anything",
        }
        login_response = client.post("/auth/login", json=sql_injection_login)
        # Should fail authentication (not bypass it)
        # Can be 401 (invalid credentials) or 422 (validation error for invalid email format)
        assert login_response.status_code in [401, 422]
        error_data = login_response.json()
        # Verify error message doesn't leak database info
        assert "detail" in error_data
        error_detail = str(error_data.get("detail", ""))
        assert "SQL" not in error_detail.upper()
        assert "DATABASE" not in error_detail.upper()

        # Test 2: SQL injection in signup username
        # Attempt: admin'; DROP TABLE users; --
        sql_injection_signup = {
            "email": "hacker@example.com",
            "username": "admin'; DROP TABLE users; --",
            "password": "HackerPass123!",
        }
        signup_response = client.post("/auth/signup", json=sql_injection_signup)
        # Should either succeed (storing the malicious string as-is) or fail validation
        # But NEVER execute the SQL command
        assert signup_response.status_code in [201, 400, 422]

        # Verify users table still exists by making a valid request
        verify_login = client.post(
            "/auth/login",
            json={
                "email": "sqlinjection@example.com",
                "password": "SqlTest123!",
            },
        )
        assert verify_login.status_code == 200  # Should still work

        # Test 3: SQL injection in diary content
        # Attempt: '; DELETE FROM diaries WHERE '1'='1
        sql_injection_diary = {
            "content": "'; DELETE FROM diaries WHERE '1'='1",
            "title": "SQL Injection Test",
        }
        diary_response = client.post(
            "/diary",
            json=sql_injection_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        # Should store the content as plain text, not execute it
        assert diary_response.status_code == 201

        # Verify legitimate diary still exists (wasn't deleted by injection)
        verify_diary = client.get(
            f"/diary/{legitimate_diary_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert verify_diary.status_code == 200
        assert verify_diary.json()["content"] == legitimate_diary["content"]

        # Test 4: SQL injection in diary title
        # Attempt: ' UNION SELECT * FROM users --
        union_injection_diary = {
            "content": "Testing UNION injection",
            "title": "' UNION SELECT * FROM users --",
        }
        union_response = client.post(
            "/diary",
            json=union_injection_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert union_response.status_code == 201
        # Verify the malicious title is stored as plain text
        created_diary = union_response.json()
        assert created_diary["title"] == union_injection_diary["title"]

        # Test 5: SQL injection through URL parameters
        # Attempt to inject through diary_id in GET request
        malicious_id = "1' OR '1'='1"
        malicious_get = client.get(
            f"/diary/{malicious_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        # Should return 422 (validation error) or 404 (not found), not 200
        assert malicious_get.status_code in [404, 422]

        # Test 6: Boolean-based blind SQL injection
        # Attempt: 1' AND '1'='1
        blind_injection = {
            "email": "test@example.com' AND '1'='1 --",
            "password": "password",
        }
        blind_response = client.post("/auth/login", json=blind_injection)
        # Should fail with 401 or 422, not succeed
        assert blind_response.status_code in [401, 422]

        # Test 7: Time-based SQL injection
        # Attempt: '; WAITFOR DELAY '00:00:05'--
        time_injection_diary = {
            "content": "'; WAITFOR DELAY '00:00:05'--",
            "title": "Time Injection Test",
        }
        # This should complete quickly (not wait 5 seconds)
        import time
        start_time = time.time()
        time_response = client.post(
            "/diary",
            json=time_injection_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        elapsed_time = time.time() - start_time

        assert time_response.status_code == 201
        # Request should complete in under 2 seconds (not execute WAITFOR)
        assert elapsed_time < 2.0

        # Test 8: Verify all legitimate data is still intact
        final_list = client.get(
            "/diary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert final_list.status_code == 200
        diaries = final_list.json()
        # Should have at least the legitimate diary we created
        assert len(diaries) >= 1
        # Verify legitimate diary content is unchanged
        legitimate_exists = any(
            d["id"] == legitimate_diary_id and d["content"] == legitimate_diary["content"]
            for d in diaries
        )
        assert legitimate_exists
