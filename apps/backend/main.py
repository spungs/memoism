import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.router import router as auth_router
from diary.router import router as diary_router
from database import create_db_and_tables

# Load environment variables
load_dotenv()

app = FastAPI(title="Memoism API")

# CORS 설정 - 환경변수에서 가져오기
cors_origins = os.getenv("CORS_ORIGINS", "*")
origins_list = [origin.strip() for origin in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth_router)
app.include_router(diary_router)

@app.on_event("startup")
async def on_startup():
    create_db_and_tables()

@app.get("/")
async def root():
    return {"message": "Welcome to Memoism API"} 