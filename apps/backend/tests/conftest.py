"""
Pytest configuration and fixtures for Backend tests.
"""
import os
import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from fastapi.testclient import TestClient

# Test database configuration
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(name="engine")
def engine_fixture():
    """Create a test database engine with in-memory SQLite."""
    # Import models to register them with SQLModel.metadata
    from src.models import User, Diary, ChatMessage  # noqa: F401

    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine):
    """Create a test database session."""
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Create a test client with dependency overrides."""
    from src.main import app
    from src.database import get_session

    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override

    client = TestClient(app, raise_server_exceptions=False)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="jwt_settings")
def jwt_settings_fixture():
    """Provide JWT settings for tests."""
    return {
        "secret": os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production"),
        "algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
    }


@pytest.fixture(name="create_user")
def create_user_fixture(client: TestClient):
    """Helper fixture to create a user via signup endpoint."""
    def _create_user(email: str = "test@example.com",
                     username: str = "testuser",
                     password: str = "TestPass123!"):
        """Create a user and return the signup response."""
        signup_data = {
            "email": email,
            "username": username,
            "password": password
        }
        response = client.post("/auth/signup", json=signup_data)
        return response, signup_data

    return _create_user


@pytest.fixture(name="create_and_login_user")
def create_and_login_user_fixture(client: TestClient):
    """Helper fixture to create a user and login, returning token."""
    def _create_and_login(email: str = "test@example.com",
                          username: str = "testuser",
                          password: str = "TestPass123!"):
        """Create a user, login, and return access token and user data."""
        # Signup
        signup_data = {
            "email": email,
            "username": username,
            "password": password
        }
        signup_response = client.post("/auth/signup", json=signup_data)
        assert signup_response.status_code == 201, \
            f"Signup failed: {signup_response.json()}"

        # Login
        login_data = {
            "email": email,
            "password": password
        }
        login_response = client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200, \
            f"Login failed: {login_response.json()}"

        return {
            "access_token": login_response.json()["access_token"],
            "user_id": signup_response.json()["id"],
            "email": email,
            "username": username,
            "password": password
        }

    return _create_and_login
