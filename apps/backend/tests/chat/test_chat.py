"""
Tests for AI Character Chat feature.
"""
from datetime import datetime, timezone
from uuid import uuid4
import pytest
from sqlmodel import Session, select
from src.models import User, ChatMessage


class TestChatMessage:
    """Test ChatMessage model and basic chat functionality."""

    def test_chat_message_model(self, session: Session):
        """
        Test 7.1: ChatMessage model should store user and AI messages.

        Given: A registered user
        When: ChatMessage is created with user_id, role, and content
        Then:
          - ChatMessage is saved to database
          - All fields are correctly stored (id, user_id, role, content, created_at)
          - Role can be either "user" or "assistant"
          - created_at is automatically set
        """
        # Arrange: Create a test user
        user = User(
            email="chatuser@example.com",
            username="chatuser",
            hashed_password="hashed_password_here",
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Act: Create a user message
        user_message = ChatMessage(
            user_id=user.id,
            role="user",
            content="안녕? 오늘 기분이 어때?",
        )
        session.add(user_message)
        session.commit()
        session.refresh(user_message)

        # Assert: Verify user message is saved
        assert user_message.id is not None
        assert user_message.user_id == user.id
        assert user_message.role == "user"
        assert user_message.content == "안녕? 오늘 기분이 어때?"
        assert user_message.created_at is not None
        assert isinstance(user_message.created_at, datetime)

        # Act: Create an AI assistant message
        assistant_message = ChatMessage(
            user_id=user.id,
            role="assistant",
            content="안녕! 나는 잘 지내고 있어. 너는 어떤 하루를 보냈어?",
        )
        session.add(assistant_message)
        session.commit()
        session.refresh(assistant_message)

        # Assert: Verify assistant message is saved
        assert assistant_message.id is not None
        assert assistant_message.user_id == user.id
        assert assistant_message.role == "assistant"
        assert assistant_message.content == "안녕! 나는 잘 지내고 있어. 너는 어떤 하루를 보냈어?"
        assert assistant_message.created_at is not None

        # Assert: Verify we can query all messages for this user
        statement = select(ChatMessage).where(ChatMessage.user_id == user.id)
        messages = session.exec(statement).all()
        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[1].role == "assistant"
