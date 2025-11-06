import os
from dotenv import load_dotenv
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy import event

# Load environment variables from .env file
load_dotenv()

# Get DATABASE_URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/memoism")

engine = create_engine(DATABASE_URL, echo=True)

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session 