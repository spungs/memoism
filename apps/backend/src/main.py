"""
FastAPI application entry point.
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

load_dotenv()

from src.auth.router import router as auth_router
from src.diary.router import router as diary_router
from src.chat.router import router as chat_router

app = FastAPI(
    title="Memoism API",
    description="Memoism Backend API - TDD Implementation",
    version="0.1.0",
)


# Global exception handler for database and general errors
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle all unhandled exceptions and return a proper 500 error response.

    This ensures that the API never crashes and always returns a proper
    error response, even when unexpected errors occur.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error occurred. Please try again later."
        },
    )

# CORS configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:8081").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(diary_router)
app.include_router(chat_router)


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "Memoism API - TDD Implementation"}
