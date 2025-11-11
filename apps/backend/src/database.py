"""
Database configuration and session management.
"""
import os
from sqlmodel import Session, create_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/memoism")

engine = create_engine(DATABASE_URL, echo=True)


def get_session():
    """Get database session."""
    with Session(engine) as session:
        yield session
